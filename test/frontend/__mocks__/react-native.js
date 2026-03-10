const React = require('react');

const View = React.forwardRef(function View(
  { children, testID, className, style, ...rest },
  ref,
) {
  return React.createElement(
    'div',
    { ref, 'data-testid': testID, className, style },
    children,
  );
});

const Text = React.forwardRef(function Text(
  { children, testID, className, ...rest },
  ref,
) {
  return React.createElement(
    'span',
    { ref, 'data-testid': testID, className },
    children,
  );
});

const TextInput = React.forwardRef(function TextInput(
  {
    onChangeText,
    testID,
    placeholder,
    value,
    className,
    multiline,
    style,
    ...rest
  },
  ref,
) {
  const El = multiline ? 'textarea' : 'input';
  return React.createElement(El, {
    ref,
    'data-testid': testID,
    placeholder,
    value: value || '',
    className,
    style,
    onChange: (e) => onChangeText?.(e.target.value),
  });
});

const Pressable = React.forwardRef(function Pressable(
  { onPress, children, testID, disabled, className, ...rest },
  ref,
) {
  return React.createElement(
    'div',
    {
      ref,
      role: 'button',
      'data-testid': testID,
      onClick: disabled ? undefined : onPress,
      className,
    },
    children,
  );
});

const ScrollView = React.forwardRef(function ScrollView(
  { children, testID, className, ...rest },
  ref,
) {
  return React.createElement(
    'div',
    { ref, 'data-testid': testID, className },
    children,
  );
});

function Switch({ value, onValueChange, testID }) {
  return React.createElement('input', {
    type: 'checkbox',
    'data-testid': testID,
    checked: value || false,
    role: 'switch',
    onChange: () => onValueChange?.(!value),
  });
}

function MockImage({ testID, source, className }) {
  return React.createElement('img', {
    'data-testid': testID,
    src: source?.uri || '',
    className,
  });
}

function ActivityIndicator({ testID }) {
  return React.createElement('div', {
    'data-testid': testID || 'activity-indicator',
    role: 'progressbar',
  });
}

function Modal({ visible, children }) {
  return visible
    ? React.createElement('div', { role: 'dialog' }, children)
    : null;
}

function RefreshControl() {
  return null;
}

const Alert = {
  alert: jest.fn(),
};

const Keyboard = {
  dismiss: jest.fn(),
};

const TouchableWithoutFeedback = React.forwardRef(
  function TouchableWithoutFeedback({ onPress, children }, ref) {
    return React.createElement(
      'div',
      { ref, onClick: onPress },
      children,
    );
  },
);

const Platform = {
  OS: 'ios',
  select: (obj) => obj.ios ?? obj.default,
};

const useWindowDimensions = () => ({ width: 400, height: 800 });

const StyleSheet = {
  create: (styles) => styles,
};

module.exports = {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Image: MockImage,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  useWindowDimensions,
  StyleSheet,
};
