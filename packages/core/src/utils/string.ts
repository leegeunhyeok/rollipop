export function indent(text: string, indent: number, space = ' ') {
  return text.replace(/^/gm, space.repeat(indent));
}
