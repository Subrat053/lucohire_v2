/* eslint-disable no-console */
/**
 * Builds the initial PostgreSQL Prisma schema from the existing Mongoose
 * schemas. This script only reads application code and writes schema.prisma;
 * it never opens a database connection.
 *
 * The generated schema intentionally keeps ObjectId references as String
 * columns. This preserves the public ID contract while the relation-by-
 * relation controller migration is completed without inventing foreign-key
 * delete behaviour that did not exist in MongoDB.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const backendRoot = path.resolve(__dirname, '..');
const modelsRoot = path.join(backendRoot, 'legacy-mongoose-models');
const outputPath = path.join(backendRoot, 'prisma', 'schema.prisma');
const relationReportPath = path.join(backendRoot, 'prisma', 'RELATION_MIGRATION.md');
const metadataPath = path.join(backendRoot, 'prisma', 'model-metadata.json');

// Some schemas initialise encryption plugins while they are imported. A
// disposable value is sufficient because this script never reads or writes a
// record and never invokes the plugin.
process.env.ENCRYPTION_SECRET ||= 'prisma-schema-generation-only';

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function prismaType(schemaType) {
  const instance = schemaType?.instance;
  if (instance === 'String' || instance === 'ObjectId' || instance === 'ObjectID' || instance === 'UUID') return 'String';
  if (instance === 'Number') return 'Float';
  if (instance === 'Boolean') return 'Boolean';
  if (instance === 'Date') return 'DateTime';
  if (instance === 'Decimal128') return 'Decimal';
  if (instance === 'Buffer') return 'Bytes';
  if (instance === 'Array') {
    const casterType = prismaType(schemaType.caster);
    return ['String', 'Float', 'Boolean', 'DateTime', 'Decimal', 'Bytes'].includes(casterType)
      ? `${casterType}[]`
      : 'Json';
  }
  return 'Json';
}

function escapePrismaString(value) {
  return JSON.stringify(String(value));
}

function defaultAttribute(schemaType, type, fieldName) {
  if (fieldName === 'createdAt') return '@default(now())';
  if (fieldName === 'updatedAt') return '@updatedAt';
  if (type.endsWith('[]')) return '@default([])';

  const value = schemaType?.defaultValue;
  if (value === undefined || value === null) return '';
  if (type === 'String' && typeof value === 'string') return `@default(${escapePrismaString(value)})`;
  if (type === 'Boolean' && typeof value === 'boolean') return `@default(${value})`;
  if ((type === 'Float' || type === 'Decimal') && typeof value === 'number' && Number.isFinite(value)) {
    return `@default(${value})`;
  }
  if (type === 'DateTime' && typeof value === 'function' && (value === Date.now || value.name === 'now')) {
    return '@default(now())';
  }
  return '';
}

function isRequired(schemaType, type, defaultAttr, fieldName) {
  if (fieldName === 'createdAt' || fieldName === 'updatedAt') return true;
  if (type.endsWith('[]')) return true;
  return Boolean(schemaType?.isRequired || defaultAttr);
}

function prismaFieldName(name) {
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, '_');
  if (/^[A-Za-z]/.test(cleaned)) return cleaned;
  return `field_${cleaned.replace(/^_+/, '') || 'value'}`;
}

function modelMetadata(model) {
  const fields = [];
  const fieldByName = new Map();
  const topLevelNames = new Set(
    Object.keys(model.schema.tree || {})
      .map((name) => name.split('.')[0])
      .filter((name) => !['_id', '__v', 'id'].includes(name) && !name.startsWith('__enc_')),
  );

  // schema.tree can omit a top-level key for a few nested declarations, while
  // schema.paths always contains the flattened path.
  for (const pathName of Object.keys(model.schema.paths)) {
    const topLevel = pathName.split('.')[0];
    if (!['_id', '__v', 'id'].includes(topLevel) && !topLevel.startsWith('__enc_')) topLevelNames.add(topLevel);
  }

  for (const name of [...topLevelNames].sort()) {
    const directPath = model.schema.path(name);
    const hasNestedPaths = Object.keys(model.schema.paths).some((pathName) => pathName.startsWith(`${name}.`));
    const type = directPath && !hasNestedPaths ? prismaType(directPath) : 'Json';
    const defaultAttr = defaultAttribute(directPath, type, name);
    const required = isRequired(directPath, type, defaultAttr, name);
    const unique = Boolean(directPath?.options?.unique) && !type.endsWith('[]') && type !== 'Json';
    const attributes = [defaultAttr, unique ? '@unique' : ''].filter(Boolean).join(' ');
    const field = {
      name,
      prismaName: prismaFieldName(name),
      type,
      required,
      attributes,
      indexable: type !== 'Json' && !type.endsWith('[]') && type !== 'Bytes',
    };
    fields.push(field);
    fieldByName.set(name, field);
  }

  const indexes = [];
  const seenIndexes = new Set();
  for (const [definition, options] of model.schema.indexes()) {
    const names = Object.keys(definition);
    if (!names.length || names.some((name) => name.includes('.') || !fieldByName.get(name)?.indexable)) continue;
    if (Object.values(definition).some((kind) => typeof kind === 'string')) continue;
    // Prisma schema syntax cannot represent MongoDB partial unique indexes.
    // Rendering them as global uniques changes semantics and can block normal rows,
    // so retain their lookup value as a non-unique PostgreSQL index instead.
    const kind = options?.unique && !options?.partialFilterExpression ? '@@unique' : '@@index';
    if (kind === '@@unique' && names.length === 1 && fieldByName.get(names[0])?.attributes.includes('@unique')) {
      continue;
    }
    const signature = `${kind}:${names.join(',')}`;
    if (seenIndexes.has(signature)) continue;
    seenIndexes.add(signature);
    indexes.push(`  ${kind}([${names.map((name) => fieldByName.get(name).prismaName).join(', ')}])`);
  }

  const references = Object.entries(model.schema.paths)
    .map(([fieldName, schemaType]) => ({
      fieldName,
      target: schemaType?.options?.ref || schemaType?.caster?.options?.ref || null,
      many: schemaType?.instance === 'Array',
    }))
    .filter((reference) => reference.target);

  const hiddenFields = Object.entries(model.schema.paths)
    .filter(([, schemaType]) => schemaType?.options?.select === false)
    .map(([fieldName]) => fieldName);

  const defaults = model.hydrate({}).toObject({
    depopulate: true,
    minimize: false,
    versionKey: false,
    virtuals: false,
  });
  delete defaults._id;

  return {
    name: model.modelName,
    collectionName: model.collection.collectionName,
    fields,
    indexes,
    references,
    hiddenFields,
    defaults,
  };
}

function loadModels() {
  const loaded = [];
  const failures = [];

  for (const filePath of walk(modelsRoot).filter((file) => file.endsWith('.js')).sort()) {
    try {
      const exported = require(filePath);
      const candidates = exported?.modelName
        ? [exported]
        : Object.values(exported || {}).filter((value) => value?.modelName);

      for (const model of candidates) loaded.push(modelMetadata(model));
    } catch (error) {
      failures.push(`${path.relative(backendRoot, filePath)}: ${error.message}`);
    } finally {
      mongoose.deleteModel(/.+/);
    }
  }

  if (failures.length) {
    throw new Error(`Unable to inspect all Mongoose models:\n${failures.join('\n')}`);
  }

  return loaded.sort((a, b) => a.name.localeCompare(b.name));
}

function addPrismaRelations(models) {
  const byName = new Map(models.map((model) => [model.name, model]));
  for (const model of models) model.relationFields = [];

  for (const source of models) {
    for (const reference of source.references) {
      if (reference.many || reference.fieldName.includes('.')) continue;
      const target = byName.get(reference.target);
      const scalar = source.fields.find((field) => field.name === reference.fieldName);
      if (!target || !scalar || scalar.type !== 'String') continue;

      const relationName = `Rel_${source.name}_${scalar.prismaName}_${target.name}`;
      let relationFieldName = `${scalar.prismaName}Record`;
      while (source.fields.some((field) => field.prismaName === relationFieldName)
        || source.relationFields.some((field) => field.name === relationFieldName)) {
        relationFieldName += 'Relation';
      }
      let inverseName = `${source.name.charAt(0).toLowerCase()}${source.name.slice(1)}_${scalar.prismaName}Links`;
      while (target.fields.some((field) => field.prismaName === inverseName)
        || target.relationFields.some((field) => field.name === inverseName)) {
        inverseName += 'Relation';
      }

      source.relationFields.push({
        name: relationFieldName,
        type: `${target.name}${scalar.required ? '' : '?'}`,
        attribute: `@relation(${escapePrismaString(relationName)}, fields: [${scalar.prismaName}], references: [id], onDelete: NoAction, onUpdate: Cascade)`,
      });
      target.relationFields.push({
        name: inverseName,
        type: `${source.name}[]`,
        attribute: `@relation(${escapePrismaString(relationName)})`,
      });
      reference.prismaRelation = true;
    }
  }
}

function renderModel(model) {
  const lines = [
    `model ${model.name} {`,
    '  id String @id @default(cuid())',
  ];

  for (const field of model.fields) {
    const optional = field.required ? '' : '?';
    const mapAttribute = field.prismaName === field.name ? '' : ` @map(${escapePrismaString(field.name)})`;
    lines.push(
      `  ${field.prismaName} ${field.type}${optional}${field.attributes ? ` ${field.attributes}` : ''}${mapAttribute}`,
    );
  }

  for (const relationField of model.relationFields || []) {
    lines.push(`  ${relationField.name} ${relationField.type} ${relationField.attribute}`);
  }

  if (model.indexes.length) lines.push('', ...model.indexes);
  lines.push(`  @@map(${escapePrismaString(model.collectionName)})`, '}');
  return lines.join('\n');
}

const models = loadModels();
addPrismaRelations(models);
const schema = [
  '// Generated from the legacy Mongoose schemas by scripts/generatePrismaSchema.js.',
  '// Review relation candidates in prisma/RELATION_MIGRATION.md before adding foreign keys.',
  '',
  'generator client {',
  '  provider = "prisma-client-js"',
  '}',
  '',
  'datasource db {',
  '  provider = "postgresql"',
  '  url      = env("DATABASE_URL")',
  '}',
  '',
  models.map(renderModel).join('\n\n'),
  '',
].join('\n');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, schema);
const references = models.flatMap((model) =>
  model.references.map((reference) => ({ source: model.name, ...reference })),
);
const relationReport = [
  '# Prisma relation migration inventory',
  '',
  'This file is generated from legacy Mongoose `ref` metadata. Singular top-level references are represented by a string foreign-key column plus an explicit Prisma relation using `onDelete: NoAction`. Nested and array references retain JSON/string-list storage so the existing API shape remains stable; they can be normalized into join tables during the later data-migration phase.',
  '',
  '| Source | Field | Target | Cardinality | Prisma status |',
  '| --- | --- | --- | --- | --- |',
  ...references.map(
    ({ source, fieldName, target, many }) =>
      `| ${source} | ${fieldName} | ${target} | ${many ? 'many' : 'one'} | ${references.find((candidate) => candidate.source === source && candidate.fieldName === fieldName)?.prismaRelation ? 'foreign key relation' : 'preserved JSON/string list'} |`,
  ),
  '',
].join('\n');
fs.writeFileSync(relationReportPath, relationReport);
fs.writeFileSync(
  metadataPath,
  `${JSON.stringify(
    Object.fromEntries(
      models.map((model) => [model.name, {
        collectionName: model.collectionName,
        references: Object.fromEntries(
          model.references.map((reference) => [reference.fieldName, {
            model: reference.target,
            many: reference.many,
          }]),
        ),
        hiddenFields: model.hiddenFields,
        defaults: model.defaults,
      }]),
    ),
    null,
    2,
  )}\n`,
);
console.log(
  `Wrote ${models.length} Prisma models and ${references.length} relation candidates to prisma`,
);
