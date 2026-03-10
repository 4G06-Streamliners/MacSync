const React = require('react');

const QRCode = React.forwardRef(function QRCode({ value, size, testID }, ref) {
  return React.createElement('div', {
    ref,
    'data-testid': testID || 'qr-code',
    'data-value': value,
    style: { width: size, height: size },
  });
});

module.exports = QRCode;
module.exports.default = QRCode;
