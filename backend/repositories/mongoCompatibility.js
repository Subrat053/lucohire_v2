const EARTH_RADIUS_METERS = 6371008.8;

function toComparable(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object') {
    if (value.id !== undefined) return String(value.id);
    if (value._id !== undefined) return String(value._id);
    if (typeof value.toHexString === 'function') return value.toHexString();
  }
  return value;
}

function cloneValue(value) {
  if (value === null || value === undefined || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value);
  if (Array.isArray(value)) return value.map(cloneValue);
  if (typeof value.toJSON === 'function' && value.constructor?.name === 'Decimal') return value;
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, cloneValue(nested)]));
}

function pathParts(path) {
  return String(path)
    .replace(/\.\$\./g, '.0.')
    .split('.')
    .filter(Boolean);
}

function getPath(source, path) {
  let current = source;
  for (const part of pathParts(path)) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current) && !/^\d+$/.test(part)) {
      current = current.map((item) => item?.[part]).flat();
    } else {
      current = current[part];
    }
  }
  return current;
}

function setPath(target, path, value) {
  const parts = pathParts(path);
  let current = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const nextPart = parts[index + 1];
    if (current[part] === null || current[part] === undefined) {
      current[part] = /^\d+$/.test(nextPart) ? [] : {};
    }
    current = current[part];
  }
  if (parts.length) current[parts.at(-1)] = cloneValue(value);
}

function unsetPath(target, path) {
  const parts = pathParts(path);
  let current = target;
  for (const part of parts.slice(0, -1)) {
    current = current?.[part];
    if (current === null || current === undefined) return;
  }
  if (current && parts.length) delete current[parts.at(-1)];
}

function valuesEqual(left, right) {
  const a = toComparable(left);
  const b = toComparable(right);
  if (Array.isArray(a)) return a.some((item) => valuesEqual(item, b));
  if (Array.isArray(b)) return b.some((item) => valuesEqual(a, item));
  if (a instanceof RegExp) return a.test(String(b ?? ''));
  if (b instanceof RegExp) return b.test(String(a ?? ''));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return String(a) === String(b) || a === b;
}

function distanceMeters(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length < 2 || second.length < 2) return Infinity;
  const [lng1, lat1] = first.map(Number);
  const [lng2, lat2] = second.map(Number);
  if (![lng1, lat1, lng2, lat2].every(Number.isFinite)) return Infinity;
  const toRadians = (value) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

function matchesOperator(actual, operator, expected, allOperators = {}) {
  const comparable = toComparable(actual);
  if (operator === '$eq') return valuesEqual(actual, expected);
  if (operator === '$ne') return !valuesEqual(actual, expected);
  if (operator === '$gt') return comparable > toComparable(expected);
  if (operator === '$gte') return comparable >= toComparable(expected);
  if (operator === '$lt') return comparable < toComparable(expected);
  if (operator === '$lte') return comparable <= toComparable(expected);
  if (operator === '$in') return expected.some((value) => valuesEqual(actual, value));
  if (operator === '$nin') return !expected.some((value) => valuesEqual(actual, value));
  if (operator === '$exists') return expected ? actual !== undefined && actual !== null : actual === undefined || actual === null;
  if (operator === '$size') return Array.isArray(actual) && actual.length === Number(expected);
  if (operator === '$all') return Array.isArray(actual) && expected.every((value) => actual.some((item) => valuesEqual(item, value)));
  if (operator === '$elemMatch') return Array.isArray(actual) && actual.some((item) => matchesMongo(item, expected));
  if (operator === '$not') return !matchesCondition(actual, expected);
  if (operator === '$regex') {
    const expression = expected instanceof RegExp
      ? expected
      : new RegExp(String(expected), String(allOperators.$options || ''));
    return Array.isArray(actual)
      ? actual.some((value) => expression.test(String(value ?? '')))
      : expression.test(String(actual ?? ''));
  }
  if (operator === '$near' || operator === '$nearSphere') {
    const geometry = expected?.$geometry || expected;
    const point = actual?.coordinates || actual;
    const target = geometry?.coordinates || geometry;
    const distance = distanceMeters(point, target);
    const max = Number(expected?.$maxDistance ?? Infinity);
    const min = Number(expected?.$minDistance ?? 0);
    return distance >= min && distance <= max;
  }
  if (operator === '$geoWithin') {
    const center = expected?.$centerSphere;
    if (!center) return true;
    const [target, radians] = center;
    return distanceMeters(actual?.coordinates || actual, target) <= Number(radians) * EARTH_RADIUS_METERS;
  }
  return true;
}

function matchesCondition(actual, expected) {
  if (expected instanceof RegExp) return expected.test(String(actual ?? ''));
  if (!expected || typeof expected !== 'object' || expected instanceof Date || Array.isArray(expected)) {
    return valuesEqual(actual, expected);
  }
  const operators = Object.keys(expected).filter((key) => key.startsWith('$'));
  if (!operators.length) return valuesEqual(actual, expected);
  return operators
    .filter((operator) => operator !== '$options')
    .every((operator) => matchesOperator(actual, operator, expected[operator], expected));
}

function matchesMongo(document, filter = {}) {
  if (!filter || !Object.keys(filter).length) return true;
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') return condition.some((nested) => matchesMongo(document, nested));
    if (key === '$and') return condition.every((nested) => matchesMongo(document, nested));
    if (key === '$nor') return !condition.some((nested) => matchesMongo(document, nested));
    if (key === '$expr') return Boolean(evaluateExpression(document, condition));
    if (key === '$text') {
      const search = String(condition?.$search || '').toLowerCase();
      return JSON.stringify(document).toLowerCase().includes(search);
    }
    return matchesCondition(getPath(document, key === '_id' ? 'id' : key), condition);
  });
}

function applyMongoUpdate(original, update = {}, isInsert = false) {
  const document = cloneValue(original || {});
  const hasOperators = Object.keys(update).some((key) => key.startsWith('$'));
  const operations = hasOperators ? update : { $set: update };

  for (const [path, value] of Object.entries(operations.$set || {})) setPath(document, path, value);
  if (isInsert) {
    for (const [path, value] of Object.entries(operations.$setOnInsert || {})) setPath(document, path, value);
  }
  for (const [path, value] of Object.entries(operations.$inc || {})) {
    setPath(document, path, Number(getPath(document, path) || 0) + Number(value));
  }
  for (const [path, value] of Object.entries(operations.$mul || {})) {
    setPath(document, path, Number(getPath(document, path) || 0) * Number(value));
  }
  for (const path of Object.keys(operations.$unset || {})) unsetPath(document, path);
  for (const [path, value] of Object.entries(operations.$push || {})) {
    const current = Array.isArray(getPath(document, path)) ? [...getPath(document, path)] : [];
    if (value && typeof value === 'object' && Array.isArray(value.$each)) current.push(...value.$each.map(cloneValue));
    else current.push(cloneValue(value));
    setPath(document, path, current);
  }
  for (const [path, value] of Object.entries(operations.$addToSet || {})) {
    const current = Array.isArray(getPath(document, path)) ? [...getPath(document, path)] : [];
    const additions = value && typeof value === 'object' && Array.isArray(value.$each) ? value.$each : [value];
    for (const addition of additions) {
      if (!current.some((item) => valuesEqual(item, addition))) current.push(cloneValue(addition));
    }
    setPath(document, path, current);
  }
  for (const [path, value] of Object.entries(operations.$pull || {})) {
    const current = Array.isArray(getPath(document, path)) ? getPath(document, path) : [];
    setPath(document, path, current.filter((item) => !matchesCondition(item, value)));
  }
  for (const [path] of Object.entries(operations.$pop || {})) {
    const current = Array.isArray(getPath(document, path)) ? [...getPath(document, path)] : [];
    operations.$pop[path] < 0 ? current.shift() : current.pop();
    setPath(document, path, current);
  }

  return document;
}

function compareDocuments(sort = {}) {
  const entries = typeof sort === 'string'
    ? sort.split(/\s+/).filter(Boolean).map((field) => [field.replace(/^-/, ''), field.startsWith('-') ? -1 : 1])
    : Object.entries(sort || {});
  return (left, right) => {
    for (const [path, directionValue] of entries) {
      const direction = directionValue === 'desc' || Number(directionValue) < 0 ? -1 : 1;
      const a = toComparable(getPath(left, path));
      const b = toComparable(getPath(right, path));
      if (a === b) continue;
      if (a === undefined || a === null) return -1 * direction;
      if (b === undefined || b === null) return 1 * direction;
      return (a > b ? 1 : -1) * direction;
    }
    return 0;
  };
}

function evaluateExpression(document, expression, variables = {}) {
  if (typeof expression === 'string') {
    if (expression.startsWith('$$')) return variables[expression.slice(2)];
    if (expression.startsWith('$')) return getPath(document, expression.slice(1));
    return expression;
  }
  if (expression === null || expression === undefined || typeof expression !== 'object') return expression;
  if (Array.isArray(expression)) return expression.map((item) => evaluateExpression(document, item, variables));

  const [[operator, operand]] = Object.entries(expression);
  if (!operator.startsWith('$')) {
    return Object.fromEntries(
      Object.entries(expression).map(([key, value]) => [key, evaluateExpression(document, value, variables)]),
    );
  }
  const values = () => (Array.isArray(operand) ? operand : [operand]).map((item) => evaluateExpression(document, item, variables));
  if (operator === '$literal') return operand;
  if (operator === '$ifNull') {
    const [value, fallback] = values();
    return value === null || value === undefined ? fallback : value;
  }
  if (operator === '$cond') {
    const [condition, truthy, falsy] = Array.isArray(operand)
      ? operand
      : [operand.if, operand.then, operand.else];
    return evaluateExpression(document, condition, variables)
      ? evaluateExpression(document, truthy, variables)
      : evaluateExpression(document, falsy, variables);
  }
  if (operator === '$eq') { const [a, b] = values(); return valuesEqual(a, b); }
  if (operator === '$ne') { const [a, b] = values(); return !valuesEqual(a, b); }
  if (operator === '$gt') { const [a, b] = values(); return toComparable(a) > toComparable(b); }
  if (operator === '$gte') { const [a, b] = values(); return toComparable(a) >= toComparable(b); }
  if (operator === '$lt') { const [a, b] = values(); return toComparable(a) < toComparable(b); }
  if (operator === '$lte') { const [a, b] = values(); return toComparable(a) <= toComparable(b); }
  if (operator === '$in') { const [a, b] = values(); return Array.isArray(b) && b.some((item) => valuesEqual(a, item)); }
  if (operator === '$and') return values().every(Boolean);
  if (operator === '$or') return values().some(Boolean);
  if (operator === '$not') return !evaluateExpression(document, operand, variables);
  if (operator === '$size') return (evaluateExpression(document, operand, variables) || []).length;
  if (operator === '$arrayElemAt') { const [array, index] = values(); return array?.[Number(index)]; }
  if (operator === '$setIntersection') {
    const [left = [], right = []] = values();
    return left.filter((item) => right.some((other) => valuesEqual(item, other)));
  }
  if (operator === '$split') { const [value, separator] = values(); return String(value ?? '').split(separator); }
  if (operator === '$toLower') return String(evaluateExpression(document, operand, variables) ?? '').toLowerCase();
  if (operator === '$toUpper') return String(evaluateExpression(document, operand, variables) ?? '').toUpperCase();
  if (operator === '$year') return new Date(evaluateExpression(document, operand, variables)).getUTCFullYear();
  if (operator === '$month') return new Date(evaluateExpression(document, operand, variables)).getUTCMonth() + 1;
  if (operator === '$dayOfMonth') return new Date(evaluateExpression(document, operand, variables)).getUTCDate();
  if (operator === '$dateToString') {
    const date = new Date(evaluateExpression(document, operand.date, variables));
    const format = operand.format || '%Y-%m-%d';
    return format
      .replace('%Y', String(date.getUTCFullYear()))
      .replace('%m', String(date.getUTCMonth() + 1).padStart(2, '0'))
      .replace('%d', String(date.getUTCDate()).padStart(2, '0'));
  }
  if (operator === '$add') return values().reduce((sum, value) => Number(sum) + Number(value), 0);
  if (operator === '$subtract') { const [a, b] = values(); return Number(a) - Number(b); }
  if (operator === '$multiply') return values().reduce((product, value) => Number(product) * Number(value), 1);
  if (operator === '$divide') { const [a, b] = values(); return Number(b) === 0 ? null : Number(a) / Number(b); }
  if (operator === '$round') { const [value, places = 0] = values(); const factor = 10 ** places; return Math.round(value * factor) / factor; }
  if (operator === '$convert') {
    const value = evaluateExpression(document, operand.input, variables);
    if (value === null || value === undefined) return operand.onNull ?? null;
    if (operand.to === 'double' || operand.to === 'int' || operand.to === 'long') {
      const number = Number(value);
      return Number.isFinite(number) ? number : operand.onError ?? null;
    }
    return String(value);
  }
  return null;
}

function groupDocuments(documents, specification) {
  const groups = new Map();
  for (const document of documents) {
    const id = evaluateExpression(document, specification._id);
    const key = JSON.stringify(id);
    if (!groups.has(key)) groups.set(key, { _id: cloneValue(id), __documents: [] });
    groups.get(key).__documents.push(document);
  }

  return [...groups.values()].map((group) => {
    const result = { _id: group._id };
    for (const [field, accumulator] of Object.entries(specification)) {
      if (field === '_id') continue;
      const [[operator, expression]] = Object.entries(accumulator);
      const values = group.__documents.map((document) => evaluateExpression(document, expression));
      if (operator === '$sum') result[field] = values.reduce((sum, value) => sum + Number(value || 0), 0);
      else if (operator === '$avg') result[field] = values.length ? values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length : null;
      else if (operator === '$min') result[field] = values.reduce((min, value) => (min === undefined || value < min ? value : min), undefined);
      else if (operator === '$max') result[field] = values.reduce((max, value) => (max === undefined || value > max ? value : max), undefined);
      else if (operator === '$first') result[field] = values[0];
      else if (operator === '$last') result[field] = values.at(-1);
      else if (operator === '$push') result[field] = values;
      else if (operator === '$addToSet') result[field] = values.filter((value, index) => values.findIndex((other) => valuesEqual(value, other)) === index);
    }
    return result;
  });
}

async function runAggregation(input, pipeline, context = {}) {
  let documents = input.map(cloneValue);
  for (const stage of pipeline || []) {
    const [[operator, specification]] = Object.entries(stage);
    if (operator === '$match') documents = documents.filter((document) => matchesMongo(document, specification));
    else if (operator === '$sort') documents.sort(compareDocuments(specification));
    else if (operator === '$skip') documents = documents.slice(Number(specification));
    else if (operator === '$limit') documents = documents.slice(0, Number(specification));
    else if (operator === '$count') documents = [{ [specification]: documents.length }];
    else if (operator === '$group') documents = groupDocuments(documents, specification);
    else if (operator === '$unwind') {
      const config = typeof specification === 'string' ? { path: specification } : specification;
      const path = config.path.replace(/^\$/, '');
      documents = documents.flatMap((document) => {
        const values = getPath(document, path);
        if (!Array.isArray(values) || !values.length) return config.preserveNullAndEmptyArrays ? [document] : [];
        return values.map((value, index) => {
          const next = cloneValue(document);
          setPath(next, path, value);
          if (config.includeArrayIndex) setPath(next, config.includeArrayIndex, index);
          return next;
        });
      });
    } else if (operator === '$project') {
      documents = documents.map((document) => {
        const inclusion = Object.values(specification).some((value) => value === 1 || (value && typeof value === 'object'));
        const result = inclusion ? {} : cloneValue(document);
        for (const [field, expression] of Object.entries(specification)) {
          if (expression === 0) unsetPath(result, field);
          else if (expression === 1) setPath(result, field, getPath(document, field));
          else setPath(result, field, evaluateExpression(document, expression));
        }
        return result;
      });
    } else if (operator === '$addFields' || operator === '$set') {
      documents = documents.map((document) => {
        const result = cloneValue(document);
        for (const [field, expression] of Object.entries(specification)) {
          setPath(result, field, evaluateExpression(document, expression));
        }
        return result;
      });
    } else if (operator === '$facet') {
      const result = {};
      for (const [field, nestedPipeline] of Object.entries(specification)) {
        result[field] = await runAggregation(documents, nestedPipeline, context);
      }
      documents = [result];
    } else if (operator === '$lookup' && context.resolveCollection) {
      const foreign = await context.resolveCollection(specification.from);
      documents = await Promise.all(documents.map(async (document) => {
        let matches = foreign;
        if (specification.localField && specification.foreignField) {
          const localValue = getPath(document, specification.localField);
          matches = foreign.filter((candidate) => valuesEqual(getPath(candidate, specification.foreignField), localValue));
        }
        if (specification.pipeline) matches = await runAggregation(matches, specification.pipeline, context);
        return { ...document, [specification.as]: matches };
      }));
    }
  }
  return documents;
}

module.exports = {
  applyMongoUpdate,
  cloneValue,
  compareDocuments,
  evaluateExpression,
  getPath,
  matchesMongo,
  runAggregation,
  setPath,
  toComparable,
  unsetPath,
  valuesEqual,
};

