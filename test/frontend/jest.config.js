module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
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
    '^react$': '<rootDir>/../node_modules/react',
    '^react/(.*)$': '<rootDir>/../node_modules/react/$1',
    '^react-dom$': '<rootDir>/../node_modules/react-dom',
    '^react-dom/(.*)$': '<rootDir>/../node_modules/react-dom/$1',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native/(.*)$': '<rootDir>/__mocks__/react-native.js',
    '^expo-router$': '<rootDir>/__mocks__/expo-router.js',
    '^react-native-safe-area-context$':
      '<rootDir>/__mocks__/react-native-safe-area-context.js',
    '^@react-navigation/native$':
      '<rootDir>/__mocks__/react-navigation-native.js',
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  modulePaths: ['<rootDir>/../node_modules'],
  rootDir: '.',
};
