import fs from 'node:fs';
import path from 'node:path';

import type { PackageJson } from '../types';

export function getPackageJson(basePath: string) {
  const packageJsonPath = path.join(basePath, 'package.json');
  const rawPackageJson = fs.readFileSync(packageJsonPath, 'utf8');
  return JSON.parse(rawPackageJson) as PackageJson;
}
