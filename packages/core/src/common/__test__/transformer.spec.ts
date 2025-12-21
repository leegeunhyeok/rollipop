// oxlint-disable no-non-null-asserted-optional-chain
import { codeFrameColumns } from '@babel/code-frame';
import dedent from 'dedent';
import { SourceMapConsumer } from 'source-map';
import { describe, it, expect } from 'vitest';

import { getErrorStack } from '../../testing/error-stack';
import { evaluateContext } from '../../testing/evaluate-context';
import { blockScoping, stripFlowSyntax } from '../transformer';

describe('stripFlowSyntax', () => {
  const FLOW_1 = dedent`
  // @flow
  const values: ReadonlyArray<?number> = [1, 2, 3, null, 4, 5];

  function calculate(values: ReadonlyArray<mixed>): number {
    return values.filter(Boolean).reduce((acc, value) => acc + value, 0);
  }

  assert(calculate(values) === 15);
  `;

  const FLOW_2 = dedent`
  // @flow
  function boom() {
    if (false) {
      console.log('no boom');
    } else {
      throw new Error('boom');
    }
  }
  boom();
  `;

  it('should strip Flow syntax', () => {
    const { code, map } = stripFlowSyntax(FLOW_1, 'test.js');
    const { evaluate } = evaluateContext();
    expect(code).not.toContain('@flow');
    expect(() => evaluate(code)).not.toThrow();
    expect(map?.sources).toContain('test.js');
  });

  it('should return the correct source map', async () => {
    const { code, map } = stripFlowSyntax(FLOW_2, 'test.js');
    const { evaluate } = evaluateContext();
    const consumer = await new SourceMapConsumer(map!);

    let errorStack: ReturnType<typeof getErrorStack> | null = null;
    try {
      evaluate(code);
    } catch (error) {
      errorStack = getErrorStack(error);
    }

    expect(errorStack).toBeTruthy();

    const originalPosition = consumer.originalPositionFor({
      line: errorStack?.line!,
      column: errorStack?.column!,
    });

    expect(originalPosition.column).toBeDefined();
    expect(originalPosition.line).toBeDefined();

    const codeFrame = codeFrameColumns(
      FLOW_2,
      {
        start: {
          line: originalPosition.line!,
          column: originalPosition.column!,
        },
      },
      { highlightCode: false },
    );

    expect(codeFrame).toMatchInlineSnapshot(`
      "  4 |     console.log('no boom');
        5 |   } else {
      > 6 |     throw new Error('boom');
          |          ^
        7 |   }
        8 | }
        9 | boom();"
    `);
  });
});

describe('blockScoping', () => {
  const CODE_1 = dedent`
  const bindings = {};
  function setBindings() {
    for (let i = 0; i < 10; i++) {
      bindings[i] = {
        getValue: () => i,
      };
    }
  }
  setBindings();

  assert(bindings[0].getValue() === 0);
  assert(bindings[9].getValue() === 9);
  `;

  const CODE_2 = dedent`
  const v = false;
  const boom = () => {
    if (v) {
      console.log('no boom');
    } else {
      throw new Error('boom');
    }
  }
  boom();
  `;

  it('should block scope bindings', () => {
    const { code, map: rawMap } = blockScoping(CODE_1, 'test.js', false, true);
    const { evaluate } = evaluateContext();
    expect(code).not.toContain('let');
    expect(code).not.toContain('const');
    expect(() => evaluate(code)).not.toThrow();

    const map = JSON.parse(rawMap as string);
    expect(map.sources).toContain('test.js');
  });

  it('should return the correct source map', async () => {
    const { code, map } = blockScoping(CODE_2, 'test.js', false, true);
    const { evaluate } = evaluateContext();
    const consumer = await new SourceMapConsumer(map!);

    let errorStack: ReturnType<typeof getErrorStack> | null = null;
    try {
      evaluate(code);
    } catch (error) {
      errorStack = getErrorStack(error);
    }

    expect(errorStack).toBeTruthy();

    const originalPosition = consumer.originalPositionFor({
      line: errorStack?.line!,
      column: errorStack?.column!,
    });

    expect(originalPosition.column).toBeDefined();
    expect(originalPosition.line).toBeDefined();

    const codeFrame = codeFrameColumns(
      CODE_2,
      {
        start: {
          line: originalPosition.line!,
          column: originalPosition.column!,
        },
      },
      { highlightCode: false },
    );

    expect(codeFrame).toMatchInlineSnapshot(`
      "  4 |     console.log('no boom');
        5 |   } else {
      > 6 |     throw new Error('boom');
          |          ^
        7 |   }
        8 | }
        9 | boom();"
    `);
  });
});
