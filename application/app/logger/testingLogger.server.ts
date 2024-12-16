import * as winston from 'winston';

const { createLogger, format, transports } = winston;
const { combine, json } = format;

const testingLogger = createLogger({
  level: 'debug',
  format: combine(json()),
  transports: [new transports.Console()],
});
export default testingLogger;
