import url from 'url';

import { codeFrameColumns } from '@babel/code-frame';
import { NullableMappedPosition, SourceMapConsumer } from 'source-map';

import { InMemoryBundle } from './bundle';

export interface StackFrameInput {
  file?: string;
  lineNumber?: number;
  column?: number;
  methodName?: string;
}

export type StackFrameOutput = Readonly<IntermediateStackFrame>;

export interface IntermediateStackFrame extends StackFrameInput {
  collapse?: boolean;
}

export interface CodeFrame {
  content: string;
  location: {
    column: number;
    row: number;
  };
  fileName: string;
}

export interface SymbolicateResult {
  stack: StackFrameOutput[];
  codeFrame: CodeFrame | null;
}

/**
 * @see https://github.com/facebook/react-native/blob/0.83-stable/packages/metro-config/src/index.flow.js#L17
 */
const INTERNAL_CALLSITES_REGEX = new RegExp(
  [
    '/Libraries/BatchedBridge/MessageQueue\\.js$',
    '/Libraries/Core/.+\\.js$',
    '/Libraries/LogBox/.+\\.js$',
    '/Libraries/Network/.+\\.js$',
    '/Libraries/Pressability/.+\\.js$',
    '/Libraries/Renderer/implementations/.+\\.js$',
    '/Libraries/Utilities/.+\\.js$',
    '/Libraries/vendor/.+\\.js$',
    '/Libraries/WebSocket/.+\\.js$',
    '/src/private/renderer/errorhandling/.+\\.js$',
    '/metro-runtime/.+\\.js$',
    '/node_modules/@babel/runtime/.+\\.js$',
    '/node_modules/@react-native/js-polyfills/.+\\.js$',
    '/node_modules/invariant/.+\\.js$',
    '/node_modules/react-devtools-core/.+\\.js$',
    '/node_modules/react-native/index.js$',
    '/node_modules/react-refresh/.+\\.js$',
    '/node_modules/scheduler/.+\\.js$',
    '^\\[native code\\]$',
  ]
    // Make patterns work with both Windows and POSIX paths.
    .map((pathPattern) => pathPattern.replaceAll('/', '[/\\\\]'))
    .join('|'),
);

export async function symbolicate(
  bundle: InMemoryBundle,
  stack: StackFrameInput[],
): Promise<SymbolicateResult> {
  const sourceMapConsumer = await bundle.sourceMapConsumer;
  const symbolicatedStack = stack
    .filter((frame) => frame.file?.startsWith('http'))
    .map((frame) => originalPositionFor(sourceMapConsumer, frame))
    .map((frame) => collapseFrame(frame));

  return {
    stack: symbolicatedStack,
    codeFrame: getCodeFrame(sourceMapConsumer, symbolicatedStack, bundle),
  };
}

function originalPositionFor(sourceMapConsumer: SourceMapConsumer, frame: StackFrameInput) {
  if (frame.column == null || frame.lineNumber == null) {
    return frame;
  }

  const originalPosition = sourceMapConsumer.originalPositionFor({
    column: frame.column,
    line: frame.lineNumber,
  });

  return Object.entries(originalPosition).reduce((frame, [key, value]) => {
    const targetKey = convertFrameKey(key as keyof typeof originalPosition);
    return {
      ...frame,
      ...(value ? { [targetKey]: value } : null),
    };
  }, frame);
}

function collapseFrame(frame: StackFrameInput): StackFrameOutput {
  return {
    ...frame,
    collapse: Boolean(frame.file && INTERNAL_CALLSITES_REGEX.test(frame.file)),
  };
}

function isCollapsed(frame: StackFrameInput) {
  return ('collapse' in frame && frame.collapse) as boolean;
}

function convertFrameKey(key: keyof NullableMappedPosition): keyof StackFrameInput {
  if (key === 'line') {
    return 'lineNumber';
  } else if (key === 'source') {
    return 'file';
  } else if (key === 'name') {
    return 'methodName';
  }
  return key;
}

function getCodeFrame(
  sourceMapConsumer: SourceMapConsumer,
  frames: StackFrameInput[],
  bundle: InMemoryBundle,
): CodeFrame | null {
  const frame = frames.find((frame) => {
    return frame.lineNumber != null && frame.column != null && !isCollapsed(frame);
  });

  if (frame?.file == null || frame.column == null || frame.lineNumber == null) {
    return null;
  }

  try {
    const { lineNumber, column, file } = frame;
    const unresolved = file.startsWith('http');
    const source = unresolved ? bundle.code : sourceMapConsumer.sourceContentFor(frame.file);
    const fileName = unresolved ? (url.parse(file).pathname ?? 'unknown') : file;
    let content = '';

    if (source) {
      content = codeFrameColumns(
        source,
        {
          start: { column, line: lineNumber },
        },
        { highlightCode: true },
      );
    }

    return {
      content,
      fileName,
      location: { column, row: lineNumber },
    };
  } catch {
    return null;
  }
}
