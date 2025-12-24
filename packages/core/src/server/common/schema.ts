import Ajv from 'ajv';
import { asConst, type FromSchema } from 'json-schema-to-ts';

export const bundleRequestSchema = asConst({
  type: 'object',
  properties: {
    platform: {
      type: 'string',
    },
    app: {
      type: 'string',
    },
    dev: {
      type: 'boolean',
    },
    minify: {
      type: 'boolean',
    },
    runModule: {
      type: 'boolean',
    },
    inlineSourceMap: {
      type: 'boolean',
    },
    modulesOnly: {
      type: 'boolean',
    },
  },
  required: ['platform'],
});

export type BundleRequestSchema = FromSchema<typeof bundleRequestSchema>;
export const validateBundleRequest = new Ajv().compile(bundleRequestSchema);
