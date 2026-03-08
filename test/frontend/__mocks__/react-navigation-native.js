const React = require('react');

const useFocusEffect = (callback) => {
  React.useEffect(() => {
    callback();
  }, [callback]);
};

module.exports = {
  useFocusEffect,
};
