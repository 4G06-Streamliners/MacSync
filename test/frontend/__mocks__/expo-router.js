const React = require('react');

let mockParams = {};

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(() => true),
  navigate: jest.fn(),
};

const useRouter = () => mockRouter;

const useLocalSearchParams = jest.fn(() => mockParams);

function Stack({ children }) {
  return React.createElement('div', null, children);
}
Stack.Screen = function StackScreen() {
  return null;
};

function Redirect() {
  return null;
}

function Link({ children }) {
  return React.createElement('a', null, children);
}

module.exports = {
  useRouter,
  useLocalSearchParams,
  router: mockRouter,
  Stack,
  Redirect,
  Link,
  __mockRouter: mockRouter,
  __setParams: (params) => {
    mockParams = params;
  },
};
