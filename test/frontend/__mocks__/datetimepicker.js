/**
 * Jest stub — real picker uses native modules not available in jsdom.
 */
const React = require('react');

function DateTimePicker() {
  return null;
}

module.exports = DateTimePicker;
module.exports.default = DateTimePicker;
