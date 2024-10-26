import developmentLogger from './developmentLogger';
import productionLogger from './productionLogger';

let logger = developmentLogger;

if (process.env.NODE_ENV === 'development') {
  logger = developmentLogger;
} else if (process.env.NODE_ENV === 'production') {
  logger = productionLogger;
} else {
  throw new Error('Unhandled node environment. Please contact support.');
}

export default logger;
