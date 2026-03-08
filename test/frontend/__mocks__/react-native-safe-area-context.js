const React = require('react');

const useSafeAreaInsets = () => ({
  top: 44,
  bottom: 34,
  left: 0,
  right: 0,
});

function SafeAreaProvider({ children }) {
  return React.createElement('div', null, children);
}

module.exports = {
  useSafeAreaInsets,
  SafeAreaProvider,
};
