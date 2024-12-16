import { createLogger, format, transports } from "winston";
const { combine, json } = format;

// pg package just returns these as errors:
// https://www.postgresql.org/docs/12/errcodes-appendix.html

// these context give any important details to filter to see issues
type ErrorContext = {
  webhookId?: string;
  sessionId?: string;
  accountId?: string;
  context?: string;
  eventDetails?: any; // any event details that would be relevant to the error
  shop?: string;
};

type InfoContext = {
  webhookId?: string;
  sessionId?: string;
  accountId?: string;
  shop?: string;
  eventDetails?: any; // any event details that would be relevant to the error
};

class PostgresError extends Error {
  code?: string;
  detail?: string;
  table?: string;
  schema?: string;

  constructor(message: string) {
    super(message);
    this.name = "PostgresError";
  }
}

function isPostgresError(error: unknown): error is PostgresError {
  return error instanceof Error && "code" in error;
}

const logger = createLogger({
  level: "info",
  format: combine(json()),
  transports: [new transports.Console()],
});

function logError(error: unknown, context: ErrorContext) {
  // For postgres errors, note: detail can contain PII, so decided not to log it
  if (isPostgresError(error)) {
    logger.error({
      name: error.name,
      message: error.message,
      pgErrorCode: error.code,
      pgTable: error.table,
      pgSchema: error.schema,
      ...context,
    });
  }

  if (error instanceof Error) {
    logger.error({
      ...context,
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return;
  }

  logger.error({
    name: "UnhandledError",
    ...context,
    message: error,
    errorType: typeof error,
    errorDetails: {
      isObject: error instanceof Object,
      keys: error instanceof Object ? Object.keys(error) : null,
      stringify: JSON.stringify(error),
      toString: String(error),
    },
  });
}

function logInfo(message: string, context: InfoContext) {
  logger.info({
    ...context,
    message,
  });
}

export { logError, logInfo };
