const tsJestPath = require.resolve('ts-jest');

module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {},
  rootDir: '../..',
  roots: ['<rootDir>/test/frontend', '<rootDir>/src/frontend/mobile/app'],
  testMatch: ['<rootDir>/test/frontend/**/*.test.{ts,tsx}'],
  transform: {
    '^.+\\.tsx?$': [
      tsJestPath,
      {
        diagnostics: false,
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          module: 'commonjs',
          moduleResolution: 'node',
          strict: false,
          skipLibCheck: true,
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^react$': '<rootDir>/test/node_modules/react',
    '^react/(.*)$': '<rootDir>/test/node_modules/react/$1',
    '^react-dom$': '<rootDir>/test/node_modules/react-dom',
    '^react-dom/(.*)$': '<rootDir>/test/node_modules/react-dom/$1',
    '^react-native$': '<rootDir>/test/frontend/__mocks__/react-native.js',
    '^react-native/(.*)$': '<rootDir>/test/frontend/__mocks__/react-native.js',
    '^react-native-qrcode-svg$': '<rootDir>/test/frontend/__mocks__/react-native-qrcode-svg.js',
    '^expo-router$': '<rootDir>/test/frontend/__mocks__/expo-router.js',
    '^react-native-safe-area-context$':
      '<rootDir>/test/frontend/__mocks__/react-native-safe-area-context.js',
    '^@react-navigation/native$':
      '<rootDir>/test/frontend/__mocks__/react-navigation-native.js',
    '\\.css$': '<rootDir>/test/frontend/__mocks__/styleMock.js',
  },
  modulePaths: ['<rootDir>/test/node_modules'],
  collectCoverageFrom: [
    'src/frontend/mobile/app/**/*.{ts,tsx}',
    '!src/frontend/mobile/app/**/*.d.ts',
    '!src/frontend/mobile/app/_layout.tsx',
  ],
  coverageDirectory: '<rootDir>/test/coverage/frontend',
};
