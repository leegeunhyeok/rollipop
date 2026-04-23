/**
 * Public entry for the rollipop jest transformer.
 *
 * Consumed as `require.resolve('rollipop/jest')` inside jest's
 * `transform` config:
 *
 *     module.exports = {
 *       preset: 'react-native',
 *       transform: {
 *         '^.+\\.(js|jsx|ts|tsx)$': require.resolve('rollipop/jest'),
 *       },
 *     };
 *
 * The `./jest` subpath ships CJS only — jest itself runs in CJS and
 * there is no scenario where consumers would want an ESM build of the
 * transformer. See `createTransformer.ts` for the runtime contract.
 */

import { createTransformer } from './jest/createTransformer';

export { createTransformer };
export type { TransformerOptions } from './jest/createTransformer';

/**
 * Default export shape follows jest's transformer convention: the
 * module must expose `createTransformer`. Jest calls
 * `require('rollipop/jest').createTransformer(options)` to obtain the
 * `{ process, processAsync, getCacheKey }` trio.
 */
export default { createTransformer };
