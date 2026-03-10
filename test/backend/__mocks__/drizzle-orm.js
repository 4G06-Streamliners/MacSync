module.exports = {
  eq: jest.fn((...args) => ({ type: 'eq', args })),
  sql: jest.fn((...args) => ({ type: 'sql', args })),
  and: jest.fn((...args) => ({ type: 'and', args })),
  asc: jest.fn((...args) => ({ type: 'asc', args })),
  desc: jest.fn((...args) => ({ type: 'desc', args })),
};
