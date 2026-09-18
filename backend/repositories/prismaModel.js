const { Prisma } = require('@prisma/client');

const { getPrismaClient } = require('./prismaContext');
const metadata = require('../prisma/model-metadata.json');
const {
  applyMongoUpdate,
  cloneValue,
  compareDocuments,
  getPath,
  matchesMongo,
  runAggregation,
  setPath,
  valuesEqual,
} = require('./mongoCompatibility');
const {
  afterLoad,
  attachDocumentMethods,
  attachStatics,
  beforeSave,
} = require('./modelHooks');

const modelDefinitions = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [model.name, model]),
);
const repositoryCache = new Map();
const modelByCollection = new Map(
  Object.entries(metadata).map(([modelName, value]) => [value.collectionName, modelName]),
);

function delegateName(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function delegateFor(modelName) {
  const delegate = getPrismaClient()[delegateName(modelName)];
  if (!delegate) throw new Error(`Prisma delegate is missing for model ${modelName}`);
  return delegate;
}

function definitionFor(modelName) {
  const definition = modelDefinitions.get(modelName);
  if (!definition) throw new Error(`Unknown Prisma model ${modelName}`);
  return definition;
}

function fieldMap(modelName) {
  const result = new Map();
  for (const field of definitionFor(modelName).fields) {
    result.set(field.name, field);
    if (field.dbName) result.set(field.dbName, field);
  }
  return result;
}

function normalizeId(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object') {
    if (value.id !== undefined) return String(value.id);
    if (value._id !== undefined) return String(value._id);
    if (typeof value.toHexString === 'function') return value.toHexString();
  }
  return String(value);
}

function normalizeJson(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(normalizeJson).filter((item) => item !== undefined);
  if (typeof value.toHexString === 'function') return value.toHexString();
  if (value.id !== undefined && Object.keys(value).every((key) => ['id', '_id'].includes(key))) return String(value.id);
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, nested]) => [key, normalizeJson(nested)])
      .filter(([, nested]) => nested !== undefined),
  );
}

function mergeDefaults(defaults, source) {
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) return cloneValue(source);
  const result = cloneValue(defaults);
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
      && result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = mergeDefaults(result[key], value);
    } else {
      result[key] = cloneValue(value);
    }
  }
  return result;
}

function applyModelDefaults(modelName, source) {
  return mergeDefaults(metadata[modelName]?.defaults || {}, source || {});
}

function sanitizeData(modelName, source, { forUpdate = false } = {}) {
  const fields = fieldMap(modelName);
  const data = {};
  for (const [rawName, rawValue] of Object.entries(source || {})) {
    if (['_id', '__v'].includes(rawName) || rawName.startsWith('__enc_') || rawValue === undefined) continue;
    const field = fields.get(rawName);
    if (!field || field.kind !== 'scalar') continue;
    if (forUpdate && field.isId) continue;
    let value = rawValue;
    if (field.type === 'String' && !field.isList && value !== null && typeof value === 'object') value = normalizeId(value);
    else if (field.type === 'String' && field.isList && Array.isArray(value)) value = value.map(normalizeId);
    else if (field.type === 'DateTime' && value !== null && !(value instanceof Date)) value = new Date(value);
    else if (field.type === 'Json') value = normalizeJson(value);
    data[field.name] = value;
  }
  return data;
}

function regexFilter(expression, options = '') {
  const regex = expression instanceof RegExp ? expression : new RegExp(String(expression), options);
  const source = regex.source.replace(/\\([.*+?^${}()|[\]\\])/g, '$1');
  const insensitive = regex.ignoreCase ? { mode: 'insensitive' } : {};
  if (regex.source.startsWith('^') && regex.source.endsWith('$')) {
    return { equals: source.replace(/^\^/, '').replace(/\$$/, ''), ...insensitive };
  }
  if (regex.source.startsWith('^')) return { startsWith: source.replace(/^\^/, ''), ...insensitive };
  if (regex.source.endsWith('$')) return { endsWith: source.replace(/\$$/, ''), ...insensitive };
  return { contains: source, ...insensitive };
}

function scalarCondition(field, condition) {
  if (condition instanceof RegExp) return field.type === 'String' ? regexFilter(condition) : null;
  if (condition === null || condition === undefined || typeof condition !== 'object' || condition instanceof Date || Array.isArray(condition)) {
    if (field.isList && !Array.isArray(condition)) return { has: normalizeId(condition) };
    return condition;
  }
  const result = {};
  for (const [operator, value] of Object.entries(condition)) {
    if (operator === '$options') continue;
    if (operator === '$regex') {
      if (field.type !== 'String') return null;
      Object.assign(result, regexFilter(value, condition.$options));
    } else if (operator === '$eq') result.equals = value;
    else if (operator === '$ne') result.not = value;
    else if (operator === '$gt') result.gt = value;
    else if (operator === '$gte') result.gte = value;
    else if (operator === '$lt') result.lt = value;
    else if (operator === '$lte') result.lte = value;
    else if (operator === '$in') {
      if (value.some((item) => item instanceof RegExp)) return null;
      if (field.isList) result.hasSome = value.map(normalizeId);
      else result.in = value.map((item) => field.type === 'String' ? normalizeId(item) : item);
    } else if (operator === '$nin') {
      if (field.isList) return null;
      result.notIn = value.map((item) => field.type === 'String' ? normalizeId(item) : item);
    } else if (operator === '$all' && field.isList) result.hasEvery = value.map(normalizeId);
    else if (operator === '$exists') {
      if (value) result.not = null;
      else result.equals = null;
    }
    else return null;
  }
  return result;
}

function toPrismaWhere(modelName, filter = {}) {
  const fields = fieldMap(modelName);
  const where = {};
  for (const [rawKey, condition] of Object.entries(filter || {})) {
    if (rawKey === '$and' || rawKey === '$or' || rawKey === '$nor') {
      const nested = condition.map((item) => toPrismaWhere(modelName, item));
      if (nested.some((item) => item === null)) return null;
      if (rawKey === '$and') where.AND = nested;
      else if (rawKey === '$or') where.OR = nested;
      else where.NOT = { OR: nested };
      continue;
    }
    if (rawKey.startsWith('$') || rawKey.includes('.')) return null;
    const lookupName = rawKey === '_id' ? 'id' : rawKey;
    const field = fields.get(lookupName);
    if (!field || field.kind !== 'scalar' || field.type === 'Json') return null;
    const converted = scalarCondition(field, condition);
    if (converted === null) return null;
    where[field.name] = converted;
  }
  return where;
}

function parseProjection(projection) {
  if (!projection) return { include: null, exclude: new Set(), force: new Set() };
  const entries = typeof projection === 'string'
    ? projection.split(/\s+/).filter(Boolean).map((field) => {
      if (field.startsWith('+')) return [field.slice(1), 'force'];
      if (field.startsWith('-')) return [field.slice(1), 0];
      return [field, 1];
    })
    : Object.entries(projection);
  const include = new Set(entries.filter(([, value]) => value === 1 || value === true).map(([field]) => field));
  return {
    include: include.size ? include : null,
    exclude: new Set(entries.filter(([, value]) => value === 0 || value === false).map(([field]) => field)),
    force: new Set(entries.filter(([, value]) => value === 'force').map(([field]) => field)),
  };
}

function plainDocument(document) {
  if (!document || typeof document !== 'object') return document;
  if (typeof document.toObject === 'function') return document.toObject();
  if (Array.isArray(document)) return document.map(plainDocument);
  return cloneValue(document);
}

function applyProjection(modelName, source, projection) {
  if (!source) return source;
  const parsed = parseProjection(projection);
  const hidden = new Set(metadata[modelName]?.hiddenFields || []);
  const result = {};
  const sourceEntries = Object.entries(source);
  if (parsed.include) {
    const fields = new Set([...parsed.include, ...parsed.force, 'id', '_id']);
    for (const [field, value] of sourceEntries) if (fields.has(field)) result[field] = value;
  } else {
    Object.assign(result, source);
  }
  for (const field of hidden) if (!parsed.force.has(field)) delete result[field];
  for (const field of parsed.exclude) delete result[field];
  return result;
}

function normalizePopulate(populate) {
  if (!populate) return [];
  if (Array.isArray(populate)) return populate.flatMap(normalizePopulate);
  if (typeof populate === 'string') return populate.split(/\s+/).filter(Boolean).map((path) => ({ path }));
  return [populate];
}

async function populateDocuments(modelName, input, populateOptions) {
  const documents = Array.isArray(input) ? input : [input];
  for (const option of normalizePopulate(populateOptions)) {
    const path = option.path;
    const reference = metadata[modelName]?.references?.[path];
    if (!reference) continue;
    const ids = [...new Set(documents.flatMap((document) => {
      const value = getPath(document, path);
      return (Array.isArray(value) ? value : [value]).filter(Boolean).map(normalizeId);
    }))];
    if (!ids.length) continue;
    let related = await delegateFor(reference.model).findMany({ where: { id: { in: ids } } });
    related = related.map((record) => ({ ...afterLoad(reference.model, record), _id: record.id }));
    if (option.match) related = related.filter((record) => matchesMongo(record, option.match));
    const byId = new Map(related.map((record) => [String(record.id), applyProjection(reference.model, record, option.select)]));
    for (const document of documents) {
      const value = getPath(document, path);
      const populated = reference.many || Array.isArray(value)
        ? (value || []).map((id) => byId.get(normalizeId(id))).filter(Boolean)
        : byId.get(normalizeId(value)) || null;
      setPath(document, path, populated);
    }
    if (option.populate) {
      const nested = documents.flatMap((document) => {
        const value = getPath(document, path);
        return Array.isArray(value) ? value : value ? [value] : [];
      });
      await populateDocuments(reference.model, nested, option.populate);
    }
  }
  return Array.isArray(input) ? documents : documents[0];
}

function createDocument(modelName, source, repository, { isNew = false, projection = null } = {}) {
  const loaded = isNew ? { ...source } : afterLoad(modelName, source);
  const projected = applyProjection(modelName, { ...loaded, id: loaded.id, _id: loaded.id }, projection);
  const modified = new Set(isNew ? Object.keys(projected) : []);
  let proxy;
  const target = projected;

  Object.defineProperties(target, {
    isNew: { enumerable: false, writable: true, value: isNew },
    __modified: { enumerable: false, value: modified },
    toObject: {
      enumerable: false,
      value: () => Object.fromEntries(
        Object.entries(target).map(([key, value]) => [key, plainDocument(value)]),
      ),
    },
    toJSON: { enumerable: false, value: () => target.toObject() },
    markModified: { enumerable: false, value: (field) => modified.add(field) },
    isModified: { enumerable: false, value: (field) => modified.has(field) },
    save: {
      enumerable: false,
      value: async () => {
        const saved = await repository.__save(proxy);
        for (const key of Object.keys(target)) delete target[key];
        Object.assign(target, saved.toObject());
        target.isNew = false;
        modified.clear();
        return proxy;
      },
    },
    deleteOne: { enumerable: false, value: () => repository.deleteOne({ id: target.id }) },
    populate: {
      enumerable: false,
      value: async (...args) => {
        const options = typeof args[0] === 'string' ? { path: args[0], select: args[1] } : args[0];
        await populateDocuments(modelName, proxy, options);
        return proxy;
      },
    },
  });
  attachDocumentMethods(modelName, target);
  proxy = new Proxy(target, {
    set(object, property, value) {
      object[property] = value;
      if (typeof property === 'string' && !property.startsWith('__')) modified.add(property);
      return true;
    },
  });
  return proxy;
}

class PrismaQuery {
  constructor(modelName, executor, { many = false } = {}) {
    this.modelName = modelName;
    this.executor = executor;
    this.many = many;
    this.projection = null;
    this.sortValue = null;
    this.skipValue = 0;
    this.limitValue = null;
    this.populateValue = [];
    this.leanValue = false;
  }

  select(projection) { this.projection = projection; return this; }
  sort(sort) { this.sortValue = sort; return this; }
  skip(skip) { this.skipValue = Number(skip) || 0; return this; }
  limit(limit) { this.limitValue = Number(limit); return this; }
  populate(path, select, model, match) {
    this.populateValue.push(typeof path === 'string' ? { path, select, model, match } : path);
    return this;
  }
  lean(value = true) { this.leanValue = value; return this; }
  session() { return this; }
  collation() { return this; }
  hint() { return this; }
  maxTimeMS() { return this; }
  setOptions() { return this; }
  clone() {
    const copy = new PrismaQuery(this.modelName, this.executor, { many: this.many });
    Object.assign(copy, this, { populateValue: [...this.populateValue] });
    return copy;
  }

  async exec() {
    let result = await this.executor(this);
    if (this.sortValue && Array.isArray(result)) result.sort(compareDocuments(this.sortValue));
    if (Array.isArray(result)) {
      if (this.skipValue) result = result.slice(this.skipValue);
      if (Number.isFinite(this.limitValue) && this.limitValue >= 0) result = result.slice(0, this.limitValue);
    }
    if (this.populateValue.length) result = await populateDocuments(this.modelName, result, this.populateValue);
    const repository = getPrismaModel(this.modelName);
    const convert = (record) => {
      if (!record) return record;
      const projected = applyProjection(this.modelName, record, this.projection);
      return this.leanValue ? cloneValue(projected) : createDocument(this.modelName, projected, repository, { projection: this.projection });
    };
    return Array.isArray(result) ? result.map(convert) : convert(result);
  }

  then(resolve, reject) { return this.exec().then(resolve, reject); }
  catch(reject) { return this.exec().catch(reject); }
  finally(callback) { return this.exec().finally(callback); }
}

async function findRaw(modelName, filter = {}, { first = false } = {}) {
  const delegate = delegateFor(modelName);
  const where = toPrismaWhere(modelName, filter);
  if (where !== null) {
    const result = first ? await delegate.findFirst({ where }) : await delegate.findMany({ where });
    const decorate = (record) => record ? { ...afterLoad(modelName, record), _id: record.id } : null;
    return Array.isArray(result) ? result.map(decorate) : decorate(result);
  }
  const all = (await delegate.findMany()).map((record) => ({ ...afterLoad(modelName, record), _id: record.id }));
  const matched = all.filter((record) => matchesMongo(record, filter));
  return first ? matched[0] || null : matched;
}

async function saveExisting(modelName, current, update, { isInsert = false } = {}) {
  const repository = getPrismaModel(modelName);
  const merged = applyMongoUpdate(isInsert ? applyModelDefaults(modelName, current) : current || {}, update, isInsert);
  const prepared = await beforeSave(modelName, merged, {
    isNew: isInsert,
    modified: new Set(Object.keys(update || {}).flatMap((key) => key.startsWith('$') ? Object.keys(update[key] || {}) : [key]).map((key) => key.split('.')[0])),
  });
  const data = sanitizeData(modelName, prepared, { forUpdate: !isInsert });
  const raw = isInsert
    ? await delegateFor(modelName).create({ data })
    : await delegateFor(modelName).update({ where: { id: normalizeId(current.id || current._id) }, data });
  return createDocument(modelName, raw, repository);
}

function getPrismaModel(modelName) {
  if (repositoryCache.has(modelName)) return repositoryCache.get(modelName);
  const getDelegate = () => delegateFor(modelName);

  function Model(data = {}) {
    return createDocument(modelName, applyModelDefaults(modelName, data), Model, { isNew: true });
  }

  Model.modelName = modelName;
  Model.collection = { name: metadata[modelName]?.collectionName };
  Model.find = (filter = {}) => new PrismaQuery(modelName, () => findRaw(modelName, filter), { many: true });
  Model.findOne = (filter = {}) => new PrismaQuery(modelName, () => findRaw(modelName, filter, { first: true }));
  Model.findById = (id) => new PrismaQuery(modelName, async () => {
    if (id === null || id === undefined) return null;
    const record = await getDelegate().findUnique({ where: { id: normalizeId(id) } });
    return record ? { ...afterLoad(modelName, record), _id: record.id } : null;
  });
  Model.create = async (input, options = {}) => {
    if (Array.isArray(input)) return Model.insertMany(input, options);
    const withDefaults = applyModelDefaults(modelName, input);
    const prepared = await beforeSave(modelName, withDefaults, { isNew: true, modified: new Set(Object.keys(input || {})) });
    const record = await getDelegate().create({ data: sanitizeData(modelName, prepared) });
    return createDocument(modelName, record, Model);
  };
  Model.insertMany = async (inputs) => Promise.all((inputs || []).map((input) => Model.create(input)));
  Model.__save = async (document) => {
    const data = document.toObject ? document.toObject() : { ...document };
    const prepared = await beforeSave(modelName, data, {
      isNew: document.isNew,
      modified: document.__modified || new Set(Object.keys(data)),
    });
    const clean = sanitizeData(modelName, prepared, { forUpdate: !document.isNew });
    const record = document.isNew
      ? await getDelegate().create({ data: clean })
      : await getDelegate().update({ where: { id: normalizeId(document.id || document._id) }, data: clean });
    return createDocument(modelName, record, Model);
  };
  Model.findByIdAndUpdate = (id, update, options = {}) => new PrismaQuery(modelName, async () => {
    const current = await findRaw(modelName, { id: normalizeId(id) }, { first: true });
    if (!current) {
      if (!options.upsert) return null;
      return (await saveExisting(modelName, { id: normalizeId(id) }, update, { isInsert: true })).toObject();
    }
    const saved = await saveExisting(modelName, current, update);
    return (options.new || options.returnDocument === 'after') ? saved.toObject() : current;
  });
  Model.findOneAndUpdate = (filter, update, options = {}) => new PrismaQuery(modelName, async () => {
    const current = await findRaw(modelName, filter, { first: true });
    if (!current) {
      if (!options.upsert) return null;
      const base = Object.fromEntries(Object.entries(filter || {}).filter(([key, value]) => !key.startsWith('$') && !key.includes('.') && (value === null || typeof value !== 'object')));
      return (await saveExisting(modelName, base, update, { isInsert: true })).toObject();
    }
    const saved = await saveExisting(modelName, current, update);
    return (options.new || options.returnDocument === 'after') ? saved.toObject() : current;
  });
  Model.updateOne = async (filter, update, options = {}) => {
    const current = await findRaw(modelName, filter, { first: true });
    if (!current && options.upsert) {
      const created = await Model.findOneAndUpdate(filter, update, { ...options, upsert: true, new: true });
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: created?.id };
    }
    if (!current) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    await saveExisting(modelName, current, update);
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1, n: 1, nModified: 1 };
  };
  Model.updateMany = async (filter, update) => {
    const records = await findRaw(modelName, filter);
    for (const record of records) await saveExisting(modelName, record, update);
    return { acknowledged: true, matchedCount: records.length, modifiedCount: records.length, n: records.length, nModified: records.length };
  };
  Model.replaceOne = (filter, replacement, options = {}) => Model.updateOne(filter, replacement, options);
  Model.findByIdAndDelete = (id) => new PrismaQuery(modelName, async () => {
    const current = await findRaw(modelName, { id: normalizeId(id) }, { first: true });
    if (!current) return null;
    await getDelegate().delete({ where: { id: current.id } });
    return current;
  });
  Model.findOneAndDelete = (filter) => new PrismaQuery(modelName, async () => {
    const current = await findRaw(modelName, filter, { first: true });
    if (!current) return null;
    await getDelegate().delete({ where: { id: current.id } });
    return current;
  });
  Model.deleteOne = async (filter) => {
    const current = await findRaw(modelName, filter, { first: true });
    if (!current) return { acknowledged: true, deletedCount: 0 };
    await getDelegate().delete({ where: { id: current.id } });
    return { acknowledged: true, deletedCount: 1 };
  };
  Model.deleteMany = async (filter = {}) => {
    const where = toPrismaWhere(modelName, filter);
    if (where !== null) return getDelegate().deleteMany({ where });
    const records = await findRaw(modelName, filter);
    if (!records.length) return { count: 0, deletedCount: 0 };
    const result = await getDelegate().deleteMany({ where: { id: { in: records.map((record) => record.id) } } });
    return { ...result, deletedCount: result.count };
  };
  Model.countDocuments = async (filter = {}) => {
    const where = toPrismaWhere(modelName, filter);
    return where === null ? (await findRaw(modelName, filter)).length : getDelegate().count({ where });
  };
  Model.estimatedDocumentCount = () => getDelegate().count();
  Model.exists = async (filter) => {
    const record = await findRaw(modelName, filter, { first: true });
    return record ? { _id: record.id, id: record.id } : null;
  };
  Model.distinct = async (field, filter = {}) => {
    const records = await findRaw(modelName, filter);
    const values = records.flatMap((record) => {
      const value = getPath(record, field);
      return Array.isArray(value) ? value : [value];
    }).filter((value) => value !== null && value !== undefined);
    return values.filter((value, index) => values.findIndex((other) => valuesEqual(value, other)) === index);
  };
  Model.bulkWrite = async (operations = []) => {
    let insertedCount = 0;
    let modifiedCount = 0;
    let deletedCount = 0;
    for (const operation of operations) {
      if (operation.insertOne) { await Model.create(operation.insertOne.document); insertedCount += 1; }
      else if (operation.updateOne) { const result = await Model.updateOne(operation.updateOne.filter, operation.updateOne.update, operation.updateOne); modifiedCount += result.modifiedCount || 0; }
      else if (operation.updateMany) { const result = await Model.updateMany(operation.updateMany.filter, operation.updateMany.update); modifiedCount += result.modifiedCount || 0; }
      else if (operation.deleteOne) { const result = await Model.deleteOne(operation.deleteOne.filter); deletedCount += result.deletedCount || 0; }
      else if (operation.deleteMany) { const result = await Model.deleteMany(operation.deleteMany.filter); deletedCount += result.deletedCount || result.count || 0; }
      else if (operation.replaceOne) { const result = await Model.replaceOne(operation.replaceOne.filter, operation.replaceOne.replacement, operation.replaceOne); modifiedCount += result.modifiedCount || 0; }
    }
    return { acknowledged: true, insertedCount, modifiedCount, deletedCount, upsertedCount: 0 };
  };
  Model.aggregate = async (pipeline = []) => {
    const records = (await getDelegate().findMany()).map((record) => ({ ...afterLoad(modelName, record), _id: record.id }));
    return runAggregation(records, pipeline, {
      resolveCollection: async (collectionName) => {
        const targetName = modelByCollection.get(collectionName);
        return targetName ? findRaw(targetName, {}) : [];
      },
    });
  };
  Model.hydrate = (data) => createDocument(modelName, data, Model);

  attachStatics(modelName, Model);
  repositoryCache.set(modelName, Model);
  return Model;
}

module.exports = getPrismaModel;
module.exports.__private = {
  applyProjection,
  sanitizeData,
  scalarCondition,
  toPrismaWhere,
};
