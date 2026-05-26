// @see https://docs.swmansion.com/react-native-reanimated/docs/guides/testing
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// @see https://github.com/AppAndFlow/react-native-safe-area-context#testing
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Rozenite devtools rely on native bindings unavailable in the test env.
jest.mock('@rozenite/react-navigation-plugin', () => ({
  useReactNavigationDevTools: () => {},
}));
