/**
 * Based on https://github.com/sindresorhus/log-update/blob/master/index.js
 * Based on https://github.com/unjs/webpackbar
 */

import wrapAnsi from 'wrap-ansi';

export function eraseLines(count: number) {
  let clear = '';
  for (let i = 0; i < count; i++) {
    clear += `\u001B[2K` + (i < count - 1 ? `\u001B[1A` : '');
  }
  if (count) clear += `\u001B[G`;
  return clear;
}

export function ellipsisLeft(value: string, maxLength: number) {
  if (value.length <= maxLength - 3) {
    return value;
  }
  return `...${value.slice(value.length - maxLength - 1)}`;
}

const originalWrite = Symbol('original-write');

export class StreamManager {
  private prevLineCount: number;
  private listening: boolean;
  private extraLines: string;
  private _streams: (NodeJS.WriteStream & {
    write: typeof process.stderr.write & {
      [originalWrite]: typeof process.stderr.write;
    };
  })[];

  constructor() {
    this.prevLineCount = 0;
    this.listening = false;
    this.extraLines = '';
    this._onData = this._onData.bind(this);
    this._streams = [process.stdout as any, process.stderr as any];
  }

  render(lines: string) {
    this.listen();

    const wrappedLines = wrapAnsi(lines, this.columns, {
      trim: false,
      hard: true,
      wordWrap: false,
    });

    const data = eraseLines(this.prevLineCount) + wrappedLines + '\n' + this.extraLines;

    this.write(data);

    const _lines = data.split('\n');
    this.prevLineCount = _lines.length;
  }

  get columns() {
    return (process.stderr.columns || 80) - 2;
  }

  write(data: Uint8Array | string) {
    const stream = process.stderr as typeof process.stderr & {
      write: {
        [originalWrite]: typeof process.stderr.write;
      };
    };

    if (stream.write[originalWrite]) {
      stream.write[originalWrite].call(stream, data, 'utf8');
    } else {
      stream.write(data, 'utf8');
    }
  }

  clear() {
    this.done();
    this.write(eraseLines(this.prevLineCount));
  }

  done() {
    this.stopListen();
    this.prevLineCount = 0;
    this.extraLines = '';
  }

  _onData(data: Uint8Array | string) {
    const str = String(data);
    const lines = str.split('\n').length - 1;
    if (lines > 0) {
      this.prevLineCount += lines;
      this.extraLines += data;
    }
  }

  listen() {
    // Prevent listening more than once
    if (this.listening) {
      return;
    }

    // Spy on all streams
    for (const stream of this._streams) {
      // Prevent overriding more than once
      if (stream.write[originalWrite]) {
        continue;
      }

      // Create a wrapper fn
      const write = (data: Uint8Array | string, ...args: any[]) => {
        if (!stream.write[originalWrite]) {
          return stream.write(data, ...args);
        }
        this._onData(data);
        return stream.write[originalWrite].call(stream, data, ...args);
      };

      // Backup original write fn
      write[originalWrite] = stream.write;

      // Override write fn
      stream.write = write;
    }

    this.listening = true;
  }

  stopListen() {
    // Restore original write fns
    for (const stream of this._streams) {
      if (stream.write[originalWrite]) {
        stream.write = stream.write[originalWrite] as typeof stream.write;
      }
    }

    this.listening = false;
  }
}
