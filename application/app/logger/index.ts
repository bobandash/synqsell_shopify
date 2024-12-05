import developmentLogger from './developmentLogger.server';
import productionLogger from './productionLogger.server';
import testingLogger from './testingLogger.server';

let logger = developmentLogger;

// staging environment is also production
if (process.env.NODE_ENV === 'development') {
  logger = developmentLogger;
} else if (process.env.NODE_ENV === 'production') {
  logger = productionLogger;
} else if (process.env.NODE_ENV === 'test') {
  logger = testingLogger;
} else {
  throw new Error('Unhandled node environment. Please contact support.');
}

export default logger;
