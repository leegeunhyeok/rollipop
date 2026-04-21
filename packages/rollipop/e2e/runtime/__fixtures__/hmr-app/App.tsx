import React from 'react';
import { Text, View } from 'react-native';

// e2e-marker: initial
export function App() {
  return (
    <View>
      <Text>hmr-e2e-initial</Text>
    </View>
  );
}

// Explicit HMR boundary so rolldown can emit a Patch (hmr:update) for
// edits to this file. Without this, changes would bubble up to a
// FullReload because the built-in react-refresh-wrapper plugin only
// wraps class components (has_refresh && extends Component).
if (import.meta.hot) {
  import.meta.hot.accept();
}
