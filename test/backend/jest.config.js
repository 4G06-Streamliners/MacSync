const tsJestPath = require.resolve('ts-jest');

module.exports = {
  testEnvironment: 'node',
  rootDir: '../..',
  roots: ['<rootDir>/test/backend', '<rootDir>/src/backend/src/events'],
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
  },
  modulePaths: ['<rootDir>/test/node_modules'],
  collectCoverageFrom: [
    'src/backend/src/events/**/*.ts',
    '!src/backend/src/events/**/*.d.ts',
    '!src/backend/src/events/*.module.ts',
  ],
  coverageDirectory: '<rootDir>/test/coverage/backend',
};
