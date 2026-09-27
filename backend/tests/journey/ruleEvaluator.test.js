const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateRule, evaluateScoringRules } = require('../../services/rulesEngine/ruleEvaluator');

describe('Safe Rule DSL Evaluator Tests', () => {
  test('Numeric comparison operators: gt, gte, lt, lte, eq, between', () => {
    assert.equal(evaluateRule({ field: 'score', op: 'gt', value: 70 }, { score: 75 }), true);
    assert.equal(evaluateRule({ field: 'score', op: 'gt', value: 70 }, { score: 70 }), false);
    assert.equal(evaluateRule({ field: 'score', op: 'gte', value: 70 }, { score: 70 }), true);
    assert.equal(evaluateRule({ field: 'score', op: 'lt', value: 50 }, { score: 45 }), true);
    assert.equal(evaluateRule({ field: 'score', op: 'lte', value: 50 }, { score: 50 }), true);
    assert.equal(evaluateRule({ field: 'score', op: 'eq', value: 100 }, { score: 100 }), true);
    assert.equal(evaluateRule({ field: 'score', op: 'between', value: [50, 80] }, { score: 65 }), true);
    assert.equal(evaluateRule({ field: 'score', op: 'between', value: [50, 80] }, { score: 90 }), false);
  });

  test('Collection operators: contains, containsAny, containsAll, count', () => {
    const ctx = { skills: ['React', 'Next.js', 'TypeScript', 'Node.js'] };
    assert.equal(evaluateRule({ field: 'skills', op: 'contains', value: 'react' }, ctx), true);
    assert.equal(evaluateRule({ field: 'skills', op: 'contains', value: 'python' }, ctx), false);
    assert.equal(evaluateRule({ field: 'skills', op: 'containsAny', value: ['Python', 'Next.js'] }, ctx), true);
    assert.equal(evaluateRule({ field: 'skills', op: 'containsAll', value: ['React', 'TypeScript'] }, ctx), true);
    assert.equal(evaluateRule({ field: 'skills', op: 'containsAll', value: ['React', 'Go'] }, ctx), false);
    assert.equal(evaluateRule({ field: 'skills', op: 'count', value: 4 }, ctx), true);
    assert.equal(evaluateRule({ field: 'skills', op: 'count', value: 5 }, ctx), false);
  });

  test('Existence and boolean combinators: and, or, not', () => {
    const ctx = { bio: 'Senior Engineer', title: null };
    assert.equal(evaluateRule({ field: 'bio', op: 'exists', value: true }, ctx), true);
    assert.equal(evaluateRule({ field: 'title', op: 'exists', value: true }, ctx), false);

    const andRule = {
      operator: 'and',
      rules: [
        { field: 'bio', op: 'exists', value: true },
        { field: 'age', op: 'gte', value: 18 },
      ],
    };
    assert.equal(evaluateRule(andRule, { bio: 'Yes', age: 25 }), true);
    assert.equal(evaluateRule(andRule, { bio: 'Yes', age: 16 }), false);

    const orRule = {
      operator: 'or',
      rules: [
        { field: 'role', op: 'eq', value: 'admin' },
        { field: 'score', op: 'gte', value: 90 },
      ],
    };
    assert.equal(evaluateRule(orRule, { role: 'user', score: 95 }), true);
    assert.equal(evaluateRule(orRule, { role: 'user', score: 80 }), false);
  });

  test('evaluateScoringRules computes deterministic score with explainable components', () => {
    const rules = [
      { ruleName: 'Has Experience', category: 'experience', ruleDSL: { field: 'exp', op: 'gte', value: 2 }, points: 10, maxContribution: 10, isEnabled: true },
      { ruleName: 'Knows TypeScript', category: 'skills', ruleDSL: { field: 'skills', op: 'contains', value: 'TypeScript' }, points: 15, maxContribution: 15, isEnabled: true },
      { ruleName: 'Knows Rust', category: 'skills', ruleDSL: { field: 'skills', op: 'contains', value: 'Rust' }, points: 20, maxContribution: 20, isEnabled: true },
    ];
    const ctx = { exp: 3, skills: ['TypeScript', 'JavaScript'] };

    const result = evaluateScoringRules(rules, ctx, 50, 95);
    assert.equal(result.score, 75); // 50 base + 10 + 15
    assert.equal(result.components.length, 3);
    assert.equal(result.components[0].passed, true);
    assert.equal(result.components[1].passed, true);
    assert.equal(result.components[2].passed, false);
  });
});
