describe('Dummy Test Suite', () => {
  test('dummy test - should pass', () => {
    expect(1 + 1).toBe(2);
  });

  test('dummy test - string assertion', () => {
    const message = 'Hello, CI!';
    expect(message.length).toBeGreaterThan(0);
    expect(typeof message).toBe('string');
  });
});

