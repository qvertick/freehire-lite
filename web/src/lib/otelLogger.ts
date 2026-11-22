// The OpenTelemetry SDK, behind a dynamic import.
//
// It used to be imported statically by errorTelemetry.ts, which meant the whole
// client entry shipped it: the SDK and its dependencies are ~95 kB of the
// ~104 kB `entry/app.js` every page loads before it can render — and telemetry
// is inert unless PUBLIC_OTEL_LOGS_ENDPOINT is configured. On a laptop that has
// to run the whole app, that is a quarter of the first-load bytes spent on a
// feature most deployments never enable.
//
// Here it is only fetched when there IS an endpoint, and off the critical path:
// the page renders while this chunk is on its way. Nothing else in the app may
// import the SDK directly — that would put it back on the critical path.

import { SeverityNumber } from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
  type LogRecordExporter,
} from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";

export interface OtelLoggerOptions {
  endpoint: string;
  service: string;
  environment?: string;
  version?: string;
  exporter?: LogRecordExporter;
}

/** One sanitized exception, ready to become a log record. */
export interface OtelException {
  type: string;
  message: string;
  stack: string;
}

export interface OtelLogger {
  emitException(exception: OtelException): void;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

// createOtelLogger builds the provider and returns undefined when it cannot: an
// exporter that refuses to construct is a telemetry problem, not an application
// one, and the caller treats a missing logger as "nothing to report to".
export function createOtelLogger(options: OtelLoggerOptions): OtelLogger | undefined {
  let provider: LoggerProvider;
  try {
    provider = new LoggerProvider({
      resource: resourceFromAttributes({
        "service.name": options.service,
        "service.version": options.version || "unknown",
        "deployment.environment.name": options.environment || "development",
      }),
      logRecordLimits: {
        attributeCountLimit: 8,
        attributeValueLengthLimit: 8192,
      },
      processors: [
        new BatchLogRecordProcessor({
          exporter:
            options.exporter ??
            new OTLPLogExporter({
              url: options.endpoint,
              timeoutMillis: 3000,
              concurrencyLimit: 1,
            }),
          maxQueueSize: 20,
          maxExportBatchSize: 5,
          scheduledDelayMillis: 500,
          exportTimeoutMillis: 3000,
        }),
      ],
    });
  } catch {
    return undefined;
  }
  const logger = provider.getLogger("freehire.errors");
  return {
    emitException(exception: OtelException) {
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: "ERROR",
        body: "Unhandled exception",
        attributes: {
          "event.name": "exception",
          "exception.type": exception.type,
          "exception.message": exception.message,
          "exception.stacktrace": exception.stack,
        },
      });
    },
    async flush() {
      try {
        await provider.forceFlush({ timeoutMillis: 3000 });
      } catch {
        /* Best effort. */
      }
    },
    async shutdown() {
      try {
        await provider.shutdown();
      } catch {
        /* Best effort. */
      }
    },
  };
}
