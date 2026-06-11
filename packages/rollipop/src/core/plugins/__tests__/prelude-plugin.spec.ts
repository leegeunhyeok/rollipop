import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { prelude } from '../prelude-plugin';

const tempDirs: string[] = [];

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rollipop-prelude-'));
  tempDirs.push(dir);
  return dir;
}

describe('prelude plugin', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { force: true, recursive: true });
    }
  });

  it('adds the entry file to watch files when reading it directly', () => {
    const root = createTempDir();
    const entryPath = path.join(root, 'index.js');
    const preludePath = path.join(root, 'prelude.js');
    fs.writeFileSync(entryPath, 'console.log("entry");');
    fs.writeFileSync(preludePath, 'console.log("prelude");');

    const plugin = prelude({ modulePaths: [preludePath] })!;
    const resolveId = plugin.resolveId as {
      handler: (
        source: string,
        importer: string | undefined,
        extraOptions: { isEntry?: boolean },
      ) => { id: string; meta: Record<PropertyKey, unknown> } | undefined;
    };
    const load = plugin.load as {
      handler: (this: unknown, id: string) => string | undefined;
    };

    const resolved = resolveId.handler(entryPath, undefined, { isEntry: true })!;
    const addWatchFile = vi.fn();
    const code = load.handler.call(
      {
        addWatchFile,
        debug: vi.fn(),
        getModuleInfo: () => ({ meta: resolved.meta }),
      },
      resolved.id,
    );

    expect(addWatchFile).toHaveBeenCalledWith(entryPath);
    expect(code).toContain(`import '${preludePath}';`);
    expect(code).toContain('console.log("entry");');
  });
});
