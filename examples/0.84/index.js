import { AppRegistry } from 'react-native';
import { setCustomHMRHandler } from 'rollipop/runtime';

import { App } from './App';
import { name as appName } from './app.json';

setCustomHMRHandler((_socket, message) => {
  console.log('Received custom HMR message:', message);
});

console.log('Build mode:', import.meta.env.MODE);
if (import.meta.env.BASE_URL) {
  console.log('Dev Server is running at', import.meta.env.BASE_URL);
}

AppRegistry.registerComponent(appName, () => App);
