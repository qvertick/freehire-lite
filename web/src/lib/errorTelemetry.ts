import { isTransientNoise } from "./transientNoise.js";
import type { LogRecordExporter } from "@opentelemetry/sdk-logs";
import type { OtelException, OtelLogger } from "./otelLogger.js";

interface ErrorTelemetryOptions {
  endpoint?: string;
  service: string;
  environment?: string;
  version?: string;
  exporter?: LogRecordExporter;
  logToConsole?: boolean;
}

// Only exception fields enter telemetry. Never serialize a thrown object, a request,
// or a rejection value: these often contain API responses or personal input.
function sanitize(value: string, limit: number): string {
  return value
    .slice(0, limit * 2)
    .replace(
      /(?:https?|file|chrome-extension|moz-extension):\/\/[^\s)"'<>]+/gi,
      (raw) => {
        try {
          const url = new URL(raw);
          return `${url.protocol}//${url.host}${url.pathname}`;
        } catch {
          return "[url]";
        }
      },
    )
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(
      /\b[a-z0-9_-]*(?:token|password|passwd|secret|api[_-]?key|authorization|credentials?)["']?\s*[:=]\s*(?:"(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?|(?:(?:basic|bearer)\s+)?[^\s,;"']+)/gi,
      "[redacted]",
    )
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[token]")
    .slice(0, limit);
}

// The OpenTelemetry SDK lives in its own module and is fetched only when an
// endpoint is configured — see otelLogger.ts for why it must not be imported
// here. `ready` is the promise for that fetch; a failure resolves to undefined,
// which is "no logger", not a thrown error: telemetry must never be the reason
// a page breaks.
export function createErrorTelemetry(options: ErrorTelemetryOptions) {
  if (!options.endpoint) return undefined;
  const endpoint = options.endpoint;
  const ready: Promise<OtelLogger | undefined> = import("./otelLogger.js")
    .then((module) =>
      module.createOtelLogger({
        endpoint,
        service: options.service,
        environment: options.environment,
        version: options.version,
        exporter: options.exporter,
      }),
    )
    .catch(() => undefined);

  // The emits are chained rather than fired and forgotten: `flush` has to wait
  // for every exception captured before it to reach the exporter, or a test (or
  // a shutdown) would read the log before the last record arrived. The chain
  // keeps their order, which is the order the errors happened in.
  let chain: Promise<void> = Promise.resolve();

  const seen = new Set<string>();
  let windowStart = Date.now();
  return {
    capture(error: unknown) {
      try {
        if (isTransientNoise(error)) return;
        if (
          error instanceof Error &&
          /\[['"]@context['"]\]\.toLowerCase/.test(error.message)
        )
          return;
        let rawMessage = "Non-Error exception";
        if (error instanceof Error) rawMessage = error.message;
        else if (
          ["string", "number", "boolean", "bigint"].includes(typeof error)
        )
          rawMessage = String(error);
        const type = error instanceof Error ? error.name : typeof error;
        const message = sanitize(rawMessage, 1024);
        const stack = sanitize(
          error instanceof Error ? error.stack || "" : "",
          8192,
        );
        // Preserve a sanitized local copy before delivery bounds can drop an event.
        if (options.logToConsole) {
          try {
            console.error(stack || `${sanitize(type, 128)}: ${message}`);
          } catch {
            /* Continue exporting if local logging fails. */
          }
        }
        const key = `${message}\n${stack}`;
        const now = Date.now();
        if (now - windowStart >= 60_000) {
          windowStart = now;
          seen.clear();
        }
        if (seen.size >= 20 || seen.has(key)) return;
        seen.add(key);
        const exception: OtelException = { type, message, stack };
        chain = chain.then(async () => {
          const logger = await ready;
          logger?.emitException(exception);
        });
      } catch {
        /* Reporting must never become an application error. */
      }
    },
    async flush() {
      try {
        await chain;
        const logger = await ready;
        await logger?.flush();
      } catch {
        /* Best effort. */
      }
    },
    async shutdown() {
      try {
        await chain;
        const logger = await ready;
        await logger?.shutdown();
      } catch {
        /* Best effort. */
      }
    },
  };
}

type ErrorTelemetry = ReturnType<typeof createErrorTelemetry>;

// Only discard stacks whose every recognizable frame belongs to an extension.
// V8 uses "at fn (url)"; Firefox and Safari use "fn@url".
const EXTENSION_FRAME = /^(?:chrome|moz|safari|safari-web|edge)-extension:\/\//i;
function fromExtensionOnly(error: unknown): boolean {
  if (!(error instanceof Error) || typeof error.stack !== "string") return false;
  const frames = error.stack.split("\n").filter((line) => /^\s*at\s+|@\S+:\d+/.test(line));
  return frames.length > 0 && frames.every((frame) => {
    const location = frame.trim().replace(/^\s*at\s+(?:.*?\s+\()?/, "").replace(/^.*?@/, "");
    return EXTENSION_FRAME.test(location);
  });
}

/** A provenance predicate is required in content scripts sharing a host page. */
export function installErrorListeners(
  target: EventTarget,
  telemetry: Pick<NonNullable<ErrorTelemetry>, "capture"> | undefined,
  owns?: (error: Error, filename: string) => boolean,
) {
  // The extension-only filter serves the caller with no predicate of its own (the web
  // client, where every window event is adopted by default). A caller that passes `owns`
  // already answers provenance — for a browser extension the extension's own frames ARE
  // its code — so its answer stands alone.
  const foreign = owns ? undefined : fromExtensionOnly;
  target.addEventListener("error", (event) => {
    const failure = event as ErrorEvent;
    if (failure.error == null) return;
    if (foreign?.(failure.error)) return;
    if (
      !owns ||
      (failure.error instanceof Error &&
        owns(failure.error, failure.filename || ""))
    )
      telemetry?.capture(failure.error);
  });
  target.addEventListener("unhandledrejection", (event) => {
    const reason: unknown = (event as PromiseRejectionEvent).reason;
    if (foreign?.(reason)) return;
    if (!owns || (reason instanceof Error && owns(reason, ""))) telemetry?.capture(reason);
  });
}
