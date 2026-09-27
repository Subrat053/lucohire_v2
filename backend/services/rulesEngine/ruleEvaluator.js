/**
 * Safe JSON Rule DSL Evaluator
 * Evaluates business rule expressions against context dictionaries safely without eval().
 */

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  if (path in obj) return obj[path];
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function normalizeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

/**
 * Evaluates a single rule node
 * @param {Object} rule - { field, op, value } or { operator, rules }
 * @param {Object} context - candidate/resume data
 * @returns {boolean}
 */
function evaluateRule(rule, context = {}) {
  if (!rule || typeof rule !== 'object') return true;

  // Handle logical combinators
  if (rule.operator || rule.op === 'and' || rule.op === 'or' || rule.op === 'not') {
    const op = (rule.operator || rule.op).toLowerCase();
    const subRules = Array.isArray(rule.rules) ? rule.rules : [];

    if (op === 'and') {
      return subRules.every((sub) => evaluateRule(sub, context));
    }
    if (op === 'or') {
      return subRules.some((sub) => evaluateRule(sub, context));
    }
    if (op === 'not') {
      return subRules.length > 0 ? !evaluateRule(subRules[0], context) : false;
    }
  }

  // Atomic condition rule: { field, op, value }
  const fieldVal = getNestedValue(context, rule.field);
  const targetVal = rule.value;
  const op = String(rule.op || 'eq').toLowerCase();

  switch (op) {
    case 'eq':
      return String(fieldVal).toLowerCase() === String(targetVal).toLowerCase();

    case 'neq':
      return String(fieldVal).toLowerCase() !== String(targetVal).toLowerCase();

    case 'gt':
      return Number(fieldVal) > Number(targetVal);

    case 'gte':
      return Number(fieldVal) >= Number(targetVal);

    case 'lt':
      return Number(fieldVal) < Number(targetVal);

    case 'lte':
      return Number(fieldVal) <= Number(targetVal);

    case 'between': {
      if (!Array.isArray(targetVal) || targetVal.length < 2) return false;
      const num = Number(fieldVal);
      return num >= Number(targetVal[0]) && num <= Number(targetVal[1]);
    }

    case 'exists': {
      const shouldExist = targetVal !== false;
      const exists = fieldVal !== undefined && fieldVal !== null && fieldVal !== '';
      return shouldExist ? exists : !exists;
    }

    case 'count': {
      const count = Array.isArray(fieldVal) ? fieldVal.length : 0;
      return count >= Number(targetVal);
    }

    case 'contains': {
      if (Array.isArray(fieldVal)) {
        const normTarget = normalizeStr(targetVal);
        return fieldVal.some((item) => normalizeStr(item).includes(normTarget) || normTarget.includes(normalizeStr(item)));
      }
      if (typeof fieldVal === 'string') {
        return normalizeStr(fieldVal).includes(normalizeStr(targetVal));
      }
      return false;
    }

    case 'containsany': {
      if (!Array.isArray(targetVal)) return false;
      const arr = Array.isArray(fieldVal) ? fieldVal : [fieldVal];
      const normArr = arr.map(normalizeStr);
      return targetVal.some((t) => {
        const nt = normalizeStr(t);
        return normArr.some((item) => item.includes(nt) || nt.includes(item));
      });
    }

    case 'containsall': {
      if (!Array.isArray(targetVal)) return false;
      const arr = Array.isArray(fieldVal) ? fieldVal : [fieldVal];
      const normArr = arr.map(normalizeStr);
      return targetVal.every((t) => {
        const nt = normalizeStr(t);
        return normArr.some((item) => item.includes(nt) || nt.includes(item));
      });
    }

    case 'percentage': {
      const num = Number(fieldVal);
      return num >= Number(targetVal);
    }

    case 'matches': {
      try {
        const pattern = new RegExp(String(targetVal).slice(0, 100), 'i');
        return pattern.test(String(fieldVal || ''));
      } catch {
        return false;
      }
    }

    default:
      return false;
  }
}

/**
 * Calculates score contribution for an array of ATS scoring rules
 * @param {Array} rules - ATSScoringRule objects
 * @param {Object} context - evaluation context
 * @returns {{ score: number, components: Array<{ rule: string, contribution: number, evidence: any }> }}
 */
function evaluateScoringRules(rules = [], context = {}, baseScore = 60, maxScore = 98) {
  let totalScore = Number(baseScore) || 60;
  const components = [];

  for (const rule of rules) {
    if (rule.isEnabled === false) continue;

    const conditionPassed = evaluateRule(rule.ruleDSL, context);
    if (conditionPassed) {
      const points = Math.min(Number(rule.points || 0), Number(rule.maxContribution || 20));
      totalScore += points;
      components.push({
        rule: rule.ruleName,
        category: rule.category,
        contribution: points,
        passed: true,
      });
    } else {
      components.push({
        rule: rule.ruleName,
        category: rule.category,
        contribution: 0,
        passed: false,
      });
    }
  }

  const clampedScore = Math.min(maxScore, Math.max(0, Math.round(totalScore)));

  return {
    score: clampedScore,
    components,
  };
}

module.exports = {
  evaluateRule,
  evaluateScoringRules,
  normalizeStr,
};
