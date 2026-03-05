import * as fs from 'node:fs';
import path from 'node:path';

import open from 'open';
import { generateAnalyzer } from 'rolldown-analyzer/node';
import { type Plugin, type PluginOption, rolldownExperimental } from 'rollipop';

const { bundleAnalyzerPlugin } = rolldownExperimental;

export interface AnalyzePluginOptions {
  /**
   * Output filename for the analysis data
   *
   * Defaults to `analyze-data.json`
   */
  analyzeDataFileName?: string;
  /**
   * Output directory for the analysis report
   *
   * Defaults to the output directory of the bundle
   */
  outDir?: string;
  /**
   * Automatically open the analysis report in the browser
   *
   * Defaults to `false`
   */
  autoOpen?: boolean;
}

export function analyzePlugin(options: AnalyzePluginOptions = {}): PluginOption {
  const { analyzeDataFileName = 'analyze-data.json', autoOpen = false } = options;

  const generateReportPlugin: Plugin = {
    name: 'generate-analyze-report',
    writeBundle(options, output) {
      if (!(analyzeDataFileName in output)) {
        return;
      }

      const targetAsset = output[analyzeDataFileName];
      const outDir = getOutDir(options);

      if (outDir == null) {
        return;
      }

      const analyzeFilePath = path.resolve(outDir, targetAsset.fileName);
      const analyzeReportPath = path.resolve(outDir, 'index.html');

      if (fs.existsSync(analyzeFilePath)) {
        generateAnalyzer({ dataPath: analyzeFilePath, outDir });
        this.info(`Analysis data generated at '${analyzeFilePath}'`);
        this.info(`Analysis report generated at '${analyzeReportPath}'`);

        if (autoOpen) {
          this.info(`Opening analysis report in your browser...`);
          open(analyzeReportPath).catch((error) => {
            this.warn('Failed to open analysis report automatically');
            this.debug(error instanceof Error ? error.message : String(error));
          });
        }
      }
    },
  };

  return [bundleAnalyzerPlugin({ fileName: analyzeDataFileName }), generateReportPlugin];
}

interface NormalizedOutputOptions {
  dir: string | undefined;
  file: string | undefined;
}

function getOutDir<Options extends NormalizedOutputOptions>(options: Options) {
  if (options.dir) {
    return options.dir;
  }

  if (options.file) {
    return path.dirname(options.file);
  }

  return null;
}
