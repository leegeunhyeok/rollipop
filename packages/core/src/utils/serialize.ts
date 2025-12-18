export function serialize(value: unknown) {
  return JSON.stringify(value, (_, value) => {
    if (typeof value === 'function') {
      return value.toString();
    }
    if (value instanceof RegExp) {
      return value.toString();
    }
    return value;
  });
}
