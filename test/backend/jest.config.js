const tsJestPath = require.resolve('ts-jest');

module.exports = {
  testEnvironment: 'node',
  rootDir: '../..',
  roots: [
    '<rootDir>/test/backend',
    '<rootDir>/src/backend/src/events',
    '<rootDir>/src/backend/src/auth',
    '<rootDir>/src/backend/src/users',
  ],
  testMatch: ['<rootDir>/test/backend/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      tsJestPath,
      {
        diagnostics: false,
        tsconfig: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          strict: false,
          skipLibCheck: true,
          target: 'es2020',
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^drizzle-orm$': '<rootDir>/test/backend/__mocks__/drizzle-orm.js',
    '^drizzle-orm/(.*)$': '<rootDir>/test/backend/__mocks__/drizzle-orm.js',
    '^stripe$': '<rootDir>/test/backend/__mocks__/stripe.js',
  },
  modulePaths: ['<rootDir>/test/node_modules'],
  collectCoverageFrom: [
    'src/backend/src/events/**/*.ts',
    '!src/backend/src/events/**/*.d.ts',
    '!src/backend/src/events/*.module.ts',
    'src/backend/src/auth/**/*.ts',
    '!src/backend/src/auth/**/*.d.ts',
    '!src/backend/src/auth/*.module.ts',
    'src/backend/src/users/**/*.ts',
    '!src/backend/src/users/**/*.d.ts',
    '!src/backend/src/users/*.module.ts',
  ],
  coverageDirectory: '<rootDir>/test/coverage/backend',
};
