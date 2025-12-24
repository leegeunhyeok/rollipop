import type { FastifyReply } from 'fastify';

export type SerializableData = string | Buffer | Uint8Array;

export class BundleResponse {
  private static CRLF = '\r\n';
  private static THROTTLE_DELAY = 10;
  private done = 0;
  private total = 0;
  private boundary: string;
  private throttleTimer: NodeJS.Timeout | null = null;

  constructor(private reply: FastifyReply) {
    const boundary = performance.now().toString();
    this.boundary = boundary;
    this.reply.raw.writeHead(200, {
      'Content-Type': `multipart/mixed; boundary="${boundary}"`,
    });
  }

  private writeChunk(data: SerializableData, headers: Record<string, string>, end = false): void {
    if (this.reply.raw.writableEnded) {
      return;
    }

    const CRLF = BundleResponse.CRLF;
    this.reply.raw.write(`${CRLF}--${this.boundary}${CRLF}`);
    this.reply.raw.write(
      Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join(CRLF) +
        CRLF +
        CRLF,
    );

    if (data) {
      this.reply.raw.write(data);
    }

    if (end) {
      this.reply.raw.write(`${CRLF}--${this.boundary}--${CRLF}`);
      this.reply.raw.end();
    }
  }

  /**
   * Sample
   *
   * ```
   * --boundary
   *
   * Content-Type: application/json
   *
   * {"done":10,"total":100}
   * ```
   */
  writeBundleState(done: number, total: number): void {
    const previousProgress = this.done / this.total;
    const currentProgress = done / total;
    this.done = done;
    this.total = total;

    if (total < 10 || this.throttleTimer != null || previousProgress >= currentProgress) {
      return;
    }

    this.writeChunk(JSON.stringify({ done, total }), {
      'Content-Type': 'application/json',
    });

    this.throttleTimer = setTimeout(() => {
      this.throttleTimer = null;
    }, BundleResponse.THROTTLE_DELAY);
  }

  /**
   * Sample
   *
   * ```
   * --boundary
   *
   * X-Metro-Files-Changed-Count: 0
   * Content-Type: application/json
   * Content-Length: 100
   * Last-Modified: Thu, 10 Aug 2023 12:00:00 GMT
   *
   * <bundle result>
   * ```
   */
  endWithBundle(bundle: SerializableData): void {
    this.writeChunk(JSON.stringify({ done: this.total, total: this.total }), {
      'Content-Type': 'application/json',
    });
    this.writeChunk(
      bundle,
      {
        'X-Metro-Files-Changed-Count': String(0), // Shim
        'Content-Type': 'application/javascript; charset=UTF-8',
        'Content-Length': String(Buffer.byteLength(bundle)),
        'Last-Modified': new Date().toUTCString(),
      },
      true,
    );
  }

  endWithError(error?: Error): void {
    const errorData = JSON.stringify({
      type: error?.name ?? 'InternalError',
      message: error?.message ?? 'internal error',
      errors: [],
    });

    this.writeChunk(
      errorData,
      {
        'Content-Type': 'application/json',
        'X-Http-Status': '500',
      },
      true,
    );
  }
}
