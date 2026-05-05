import fs from 'node:fs';
import path from 'node:path';

import { PackageJson } from '../types';

export function resolveFrom(basePath: string, lookupPath: string) {
  if (path.isAbsolute(lookupPath)) {
    return lookupPath;
  }

  return require.resolve(lookupPath, {
    paths: [basePath],
  });
}

export function resolvePackagePath(basePath: string, packageName: string) {
  let packagePath: string | null = null;

  try {
    packagePath = resolvePackagePathWithNodeRequire(basePath, packageName, 'package.json');

    if (packagePath) {
      return packagePath;
    }
  } catch {}

  try {
    packagePath = resolvePackagePathWithNodeRequire(basePath, packageName);

    if (packagePath) {
      return packagePath;
    }
  } catch {}

  throw new Error(`Failed to resolve package path for '${packageName}'`);
}

export function resolvePackageJson(basePath: string, packageName: string) {
  try {
    const packagePath = resolvePackagePath(basePath, packageName);
    const packageJsonPath = path.join(packagePath, 'package.json');
    const rawPackageJson = fs.readFileSync(packageJsonPath, 'utf-8');
    return JSON.parse(rawPackageJson) as PackageJson;
  } catch {
    return null;
  }
}

function resolvePackagePathWithNodeRequire(
  basePath: string,
  packageName: string,
  subpath?: string,
) {
  const resolvedPath = require.resolve(subpath ? `${packageName}/${subpath}` : packageName, {
    paths: [basePath],
  });
  const root = path.parse(resolvedPath).root;
  let currentPath = path.dirname(resolvedPath);

  while (currentPath !== root) {
    if (fs.existsSync(path.join(currentPath, 'package.json'))) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}
