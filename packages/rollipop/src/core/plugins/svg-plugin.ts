import fs from 'node:fs';

import { Config, transform } from '@svgr/core';
import type * as rolldown from '@rollipop/rolldown';

export interface SvgPluginOptions {
  enabled: boolean;
}

function svgPlugin(options: SvgPluginOptions): rolldown.Plugin | null {
  if (!options.enabled) {
    return null;
  }

  return {
    name: 'rollipop:svg',
    load: {
      filter: {
        id: /\.svg$/,
      },
      async handler(id) {
        const rawSvg = fs.readFileSync(id, 'utf-8');
        const svgTransformedCode = await transform(
          rawSvg,
          {
            template: defaultTemplate,
            plugins: [require.resolve('@svgr/plugin-jsx')],
            native: true,
          },
          { filePath: id },
        );
        return { code: svgTransformedCode, moduleType: 'jsx' };
      },
    },
  };
}

const SVG_COMPONENT_NAME = 'SvgLogo';
const defaultTemplate: Config['template'] = (variables, { tpl }) => {
  return tpl`${variables.imports};

${variables.interfaces};

const ${SVG_COMPONENT_NAME} = (${variables.props}) => (
  ${variables.jsx}
);

export default ${SVG_COMPONENT_NAME};`;
};

export { svgPlugin as svg };
