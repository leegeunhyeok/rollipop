import type { BabelTransformRule, Plugin } from 'rollipop';
import { code, exclude, id, include } from 'rollipop/pluginutils';

const EXCLUDE_PACKAGES = ['react-native', '@react-native'];
const REANIMATED_AUTOWORKLETIZATION_KEYWORDS = [
  'worklet',
  'useAnimatedGestureHandler',
  'useAnimatedScrollHandler',
  'useFrameCallback',
  'useAnimatedStyle',
  'useAnimatedProps',
  'createAnimatedPropAdapter',
  'useDerivedValue',
  'useAnimatedReaction',
  'useWorkletCallback',
  'withTiming',
  'withSpring',
  'withDecay',
  'withRepeat',
  'runOnUI',
  'executeOnUIRuntimeSync',
];

export function worklet(): Plugin {
  const workletBabelRule: BabelTransformRule = {
    filter: [
      exclude(id(new RegExp(`node_modules/(?:${EXCLUDE_PACKAGES.join('|')})/`))),
      include(code(new RegExp(REANIMATED_AUTOWORKLETIZATION_KEYWORDS.join('|')))),
    ],
    options: {
      plugins: [[require.resolve('react-native-worklets/plugin'), {}]],
    },
  };

  return {
    name: 'worklet',
    config(config) {
      return {
        ...config,
        transformer: {
          ...config.transformer,
          babel: {
            ...config.transformer?.babel,
            rules: [...(config.transformer?.babel?.rules ?? []), workletBabelRule],
          },
        },
      };
    },
  };
}

export function config(): Plugin {
  return {
    name: 'config',
    configResolved(resolvedConfig) {
      if (process.env.SHOW_CONFIG === '1') {
        console.log(resolvedConfig);
      }
    },
  };
}

export function hot(): Plugin {
  let count = 0;
  return {
    name: 'hot',
    configureServer(server) {
      setInterval(() => {
        if (server.hot.clients.size === 0) {
          this.debug('No clients connected, skipping sending message');
          return;
        } else {
          this.debug('Sending message to clients...');
        }

        server.hot.sendAll('custom-server-event', { message: `Hello from server: ${count++}` });
      }, 5_000);

      server.hot.on('custom-client-event', (data) => {
        console.log('Received custom client event:', data);
      });
    },
  };
}
