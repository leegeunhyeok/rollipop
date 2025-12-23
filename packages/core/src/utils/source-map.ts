export function replaceSourceMappingURL(code: string, sourceMappingURL: string) {
  const marker = '//# sourceMappingURL=';
  const lastIndex = code.lastIndexOf(marker);

  if (lastIndex === -1) {
    return code;
  }

  let endIndex = code.indexOf('\n', lastIndex);

  if (endIndex === -1) {
    endIndex = code.length;
  }

  return [code.slice(0, lastIndex), `${marker}${sourceMappingURL}`, code.slice(endIndex)].join('');
}
