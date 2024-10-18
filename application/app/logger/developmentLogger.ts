import winston from "winston";

const { createLogger, format, transports } = winston;
const { combine, timestamp, json, prettyPrint } = format;

const logger = createLogger({
  level: "debug",
  format: combine(
    json(),
    timestamp({
      format: "MMM-DD-YYYY HH:mm:ss",
    }),
    prettyPrint(),
  ),
  transports: [new transports.Console()],
});

export default logger;
