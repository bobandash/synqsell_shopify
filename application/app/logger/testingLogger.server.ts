import * as winston from 'winston';

const { createLogger, format, transports } = winston;
const { combine, json } = format;

// TODO: Fix this; I should only log debug for test to view errors

const testingLogger = createLogger({
  level: 'debug',
  format: combine(json()),
  transports: [
    new transports.Console({
      level: 'debug',
      silent: false,
      format: format.combine(
        format.colorize(),
        format.simple(),
        format((info) => {
          if (info.level !== 'debug') {
            return false;
          }
          return info;
        })(),
      ),
    }),
  ],
});
export default testingLogger;
