import winston from "winston";

const { createLogger, format, transports } = winston;
const { combine, timestamp, json, colorize } = format;

const logger = createLogger({
  level: "debug",
  format: combine(colorize(), timestamp(), json()),
  transports: [new transports.Console()],
});

export default logger;
