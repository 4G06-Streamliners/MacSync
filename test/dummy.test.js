const assert = require('node:assert');

// Minimal describe/it so "node dummy.test.js" runs without Jest
function describe(name, fn) {
  console.log('\n' + name);
  fn();
}
function it(name, fn) {
  fn();
  console.log('  ✓', name);
}

describe('Dummy test suite', () => {
  it('should pass', () => {
    assert.strictEqual(1 + 1, 2);
  });
});

console.log('\n1 passing\n');
