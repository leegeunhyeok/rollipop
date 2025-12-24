export function getBaseBundleName(name: string) {
  return name.replace(/^\//, '').replace(/\.bundle$/, '');
}
