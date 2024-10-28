import developmentLogger from './developmentLogger.server';
import productionLogger from './productionLogger.server';

let logger = developmentLogger;

if (process.env.NODE_ENV === 'development') {
  logger = developmentLogger;
} else if (process.env.NODE_ENV === 'production') {
  logger = productionLogger;
} else {
  throw new Error('Unhandled node environment. Please contact support.');
}

export default logger;
