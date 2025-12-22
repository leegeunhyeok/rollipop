import * as babel from '@babel/core';
import { type Plugin, PluginUtils } from 'rollipop';

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
  return PluginUtils.cacheable({
    name: 'worklet',
    transform: {
      filter: {
        id: {
          exclude: new RegExp(`node_modules/(?:${EXCLUDE_PACKAGES.join('|')})/`),
        },
        code: new RegExp(REANIMATED_AUTOWORKLETIZATION_KEYWORDS.join('|')),
      },
      handler(code, id) {
        const result = babel.transformSync(code, {
          filename: id,
          babelrc: false,
          configFile: false,
          sourceMaps: true,
          presets: [
            [
              require.resolve('@babel/preset-typescript'),
              {
                isTSX: id.endsWith('x'),
                allExtensions: true,
              },
            ],
          ],
          plugins: [[require.resolve('react-native-worklets/plugin'), {}]],
        });

        if (result?.code == null) {
          throw new Error(`Failed to transform worklet: ${id}`);
        }

        return { code: result.code, map: result.map };
      },
    },
  });
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
