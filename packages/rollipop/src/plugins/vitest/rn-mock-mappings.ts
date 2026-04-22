/**
 * Static mapping table describing which `react-native` internal paths
 * jest-preset replaces with a mock, and where the mock file lives relative
 * to the jest-preset source root.
 *
 * The `from` and `mockFile` pairs mirror `setup.js` in:
 *  - `react-native/jest/` for RN <= 0.84
 *  - `@react-native/jest-preset/` for RN >= 0.85
 *
 * Paths omit the `.js` extension. `mockFile: null` marks entries that
 * jest-preset automocks (empty exports) rather than pointing at a file.
 *
 * Update policy: verify against upstream `setup.js` whenever bumping
 * supported react-native versions. `validateMappings` flags divergence at
 * prebuild time via a mock-count sanity check on the installed setup.js.
 */
export interface JestPresetMapping {
  /** RN-internal path (no `.js`) that jest-preset replaces. */
  from: string;
  /**
   * Mock file path (no `.js`) relative to the jest-preset source root.
   * `null` for jest's implicit automock (we emit an empty-exports stub).
   */
  mockFile: string | null;
}

export const JEST_PRESET_MAPPINGS: readonly JestPresetMapping[] = [
  { from: 'Libraries/AppState/AppState', mockFile: 'mocks/AppState' },
  { from: 'Libraries/BatchedBridge/NativeModules', mockFile: 'mocks/NativeModules' },
  {
    from: 'Libraries/Components/AccessibilityInfo/AccessibilityInfo',
    mockFile: 'mocks/AccessibilityInfo',
  },
  {
    from: 'Libraries/Components/ActivityIndicator/ActivityIndicator',
    mockFile: 'mocks/ActivityIndicator',
  },
  { from: 'Libraries/Components/Clipboard/Clipboard', mockFile: 'mocks/Clipboard' },
  {
    from: 'Libraries/Components/RefreshControl/RefreshControl',
    mockFile: 'mocks/RefreshControl',
  },
  { from: 'Libraries/Components/ScrollView/ScrollView', mockFile: 'mocks/ScrollView' },
  { from: 'Libraries/Components/TextInput/TextInput', mockFile: 'mocks/TextInput' },
  { from: 'Libraries/Components/View/View', mockFile: 'mocks/View' },
  {
    from: 'Libraries/Components/View/ViewNativeComponent',
    mockFile: 'mocks/ViewNativeComponent',
  },
  { from: 'Libraries/Core/InitializeCore', mockFile: 'mocks/InitializeCore' },
  // jest-preset calls `mock('m#../Libraries/Core/NativeExceptionsManager')`
  // with no factory, which is jest's automock. We emit an empty-exports stub.
  { from: 'Libraries/Core/NativeExceptionsManager', mockFile: null },
  { from: 'Libraries/Image/Image', mockFile: 'mocks/Image' },
  { from: 'Libraries/Linking/Linking', mockFile: 'mocks/Linking' },
  { from: 'Libraries/Modal/Modal', mockFile: 'mocks/Modal' },
  {
    from: 'Libraries/NativeComponent/NativeComponentRegistry',
    mockFile: 'mocks/NativeComponentRegistry',
  },
  { from: 'Libraries/ReactNative/RendererProxy', mockFile: 'mocks/RendererProxy' },
  {
    from: 'Libraries/ReactNative/requireNativeComponent',
    mockFile: 'mocks/requireNativeComponent',
  },
  { from: 'Libraries/ReactNative/UIManager', mockFile: 'mocks/UIManager' },
  { from: 'Libraries/Text/Text', mockFile: 'mocks/Text' },
  { from: 'Libraries/Utilities/useColorScheme', mockFile: 'mocks/useColorScheme' },
  { from: 'Libraries/Vibration/Vibration', mockFile: 'mocks/Vibration' },
];
