import winston from 'winston';

const { createLogger, format, transports } = winston;
const { combine, json } = format;

const logger = createLogger({
  level: 'warn',
  format: combine(json()),
  transports: [new transports.Console()],
});

export default logger;
