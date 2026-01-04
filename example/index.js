import { AppRegistry } from 'react-native';
import { setCustomHMRHandler } from 'rollipop/runtime';

import { App } from './App';
import { name as appName } from './app.json';

setCustomHMRHandler((_socket, message) => {
  console.log('Received custom HMR message:', message);
});

AppRegistry.registerComponent(appName, () => App);
