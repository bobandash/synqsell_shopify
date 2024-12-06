import * as winston from 'winston';

const { createLogger, format, transports } = winston;
const { combine, json } = format;

const testingLogger = createLogger({
  level: 'info',
  format: combine(json()),
  transports: [
    new transports.Console({
      silent: true,
    }),
  ],
});

export default testingLogger;