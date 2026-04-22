/**
 * Runtime setup loaded by vitest via `test.setupFiles`.
 *
 * Defines the RN-flavoured globals (`__DEV__`, `IS_REACT_ACT_ENVIRONMENT`,
 * `requestAnimationFrame`, etc.) the way jest-preset does, and exposes a
 * jest-compat shim on `globalThis.jest` so the prebuilt jest-preset mock
 * files (which call `jest.fn()`, `jest.requireActual()`, etc.) resolve
 * against vitest's `vi` API.
 */

import nodeFs from 'node:fs';
import { createRequire } from 'node:module';

import { vi } from 'vitest';

Object.defineProperties(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: {
    configurable: true,
    enumerable: true,
    value: true,
    writable: true,
  },
  IS_REACT_NATIVE_TEST_ENVIRONMENT: {
    configurable: true,
    enumerable: true,
    value: true,
    writable: true,
  },
  __DEV__: {
    configurable: true,
    enumerable: true,
    value: true,
    writable: true,
  },
  cancelAnimationFrame: {
    configurable: true,
    enumerable: true,
    value(id: ReturnType<typeof setTimeout>): void {
      return clearTimeout(id);
    },
    writable: true,
  },
  nativeFabricUIManager: {
    configurable: true,
    enumerable: true,
    value: {},
    writable: true,
  },
  requestAnimationFrame: {
    configurable: true,
    enumerable: true,
    value(callback: (now: number) => void): ReturnType<typeof setTimeout> {
      return setTimeout(() => callback(Date.now()), 0);
    },
    writable: true,
  },
  window: {
    configurable: true,
    enumerable: true,
    value: globalThis,
    writable: true,
  },
});

// jest-preset's mock files (prebuilt under `.rollipop/.vitest/`) call
// `jest.fn()`, `jest.mock()`, `jest.requireActual()` at module evaluation
// time. vitest's `vi` covers the subset of that API these mocks rely on;
// we expose it under `jest` so the prebuilt output runs unchanged.
//
//  - `jest.fn` / `jest.spyOn` / `jest.clearAllMocks` etc. alias to `vi`
//  - `jest.mock` is a no-op at runtime: path-level module replacement is
//    already realised by the prebuild trampolines, so a later
//    `jest.mock(...)` call in user code would double-count. Users who
//    need runtime mocking should use `vi.mock` directly.
//  - `jest.requireActual` must resolve relative to the caller (jest-preset
//    mocks use paths like `'../mockComponent'`). We walk the V8 stack to
//    find the caller's filename and build a `createRequire` rooted there.
//    `ROLLIPOP_VITEST_ROOT` is the fallback when the caller is not a real
//    file (REPL, eval, etc.).
const rootDir = process.env.ROLLIPOP_VITEST_ROOT ?? process.cwd();
const fallbackRequire = createRequire(`${rootDir}/_rollipop-jest-shim.js`);

function callerRequire(depth: number): NodeJS.Require {
  const original = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (_, stack) => stack;
    const holder: { stack?: NodeJS.CallSite[] } = {};
    Error.captureStackTrace(holder, callerRequire);
    const frames = holder.stack ?? [];
    const frame = frames[depth];
    const file = frame?.getFileName() ?? null;
    if (file != null && !file.startsWith('node:') && file !== '') {
      const normalised = file.startsWith('file://') ? new URL(file).pathname : file;
      return createRequire(normalised);
    }
  } catch {
    // fall through to the project-root require below
  } finally {
    Error.prepareStackTrace = original;
  }
  return fallbackRequire;
}

const jestShim = Object.assign(vi, {
  requireActual<T = unknown>(id: string): T {
    const req = callerRequire(1);
    // If the caller is asking for a path that the prebuild has replaced
    // with a jest-preset trampoline, the real (pre-mock) module lives at
    // a `.__actual.js` sibling — prefer that to avoid mocks re-entering
    // their own trampoline.
    try {
      const resolved = req.resolve(id);
      const sidecar = resolved.replace(/\.js$/, '.__actual.js');
      if (resolved.endsWith('.js') && sidecar !== resolved && nodeFs.existsSync(sidecar)) {
        return req(sidecar) as T;
      }
    } catch {
      // fall through to plain require
    }
    return req(id) as T;
  },
});

Object.defineProperty(globalThis, 'jest', {
  configurable: true,
  enumerable: false,
  value: jestShim,
  writable: true,
});
