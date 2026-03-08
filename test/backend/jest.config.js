module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
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
    '^drizzle-orm$': '<rootDir>/__mocks__/drizzle-orm.js',
    '^drizzle-orm/(.*)$': '<rootDir>/__mocks__/drizzle-orm.js',
  },
  modulePaths: ['<rootDir>/../node_modules'],
  rootDir: '.',
};
