import * as winston from 'winston';

const { createLogger, format, transports } = winston;
const { combine, json } = format;

const logger = createLogger({
  level: 'info',
  format: combine(json()),
  transports: [new transports.Console()],
});

export default logger;
