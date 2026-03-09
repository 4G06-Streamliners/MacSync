const React = require('react');
const { View, Pressable, Text } = require('react-native');

module.exports.CameraView = ({ style, children, onBarcodeScanned, ...props }) => {
  return React.createElement(
    View,
    { ...props, style, testID: 'camera-view' },
    children,
    onBarcodeScanned &&
      React.createElement(
        Pressable,
        {
          testID: 'mock-scan-trigger',
          onPress: () =>
            onBarcodeScanned({ data: '1:5:10:mock-signature', nativeEvent: { data: '1:5:10:mock-signature' } }),
        },
        React.createElement(Text, {}, 'Mock Scan'),
      ),
  );
};

module.exports.useCameraPermissions = () => [
  { granted: true, canAskAgain: false },
  () => Promise.resolve({ granted: true }),
  () => Promise.resolve({ granted: true }),
];
