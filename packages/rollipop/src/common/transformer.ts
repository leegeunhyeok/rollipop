import transform from 'fast-flow-transform';

export async function stripFlowTypes(id: string, code: string) {
  const result = await transform({
    filename: id,
    source: code,
    sourcemap: true,
    dialect: 'flow',
    format: 'pretty',
  });

  return result;
}
