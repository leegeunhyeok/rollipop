import { mergeWith } from 'es-toolkit';

export function mergeBabelOptions(
  baseOptions: babel.TransformOptions,
  ...options: babel.TransformOptions[]
) {
  return options.reduce((acc, options) => mergeWith(acc, options, merge), baseOptions);
}

function merge(target: any, source: any, key: string) {
  if (key === 'plugins') {
    return [...(target ?? []), ...(source ?? [])];
  }
  if (key === 'presets') {
    return [...(target ?? []), ...(source ?? [])];
  }
}
