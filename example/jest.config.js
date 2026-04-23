module.exports = {
  preset: 'react-native',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': require.resolve('rollipop/jest'),
    // Preserve the preset's asset transformer — jest's `transform` fully
    // replaces the preset, so we re-add the RN asset handler explicitly.
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      'react-native/jest/assetFileTransformer.js',
    ),
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-.+)/)',
  ],
};
