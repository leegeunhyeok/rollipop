const TS_EXTENSION_REGEXP = /\.tsx?$/;

export function isTS(id: string) {
  return TS_EXTENSION_REGEXP.test(id);
}

export function isJSX(id: string) {
  return id.endsWith('x');
}
