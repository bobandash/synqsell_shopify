import logger from "~/logger";
import pRetry from "p-retry";
import { getLogCombinedMessage } from "~/util";

type Fn = () => Promise<any>;

function retryOperation(func: Fn, retries = 3) {
  return pRetry(func, {
    onFailedAttempt: (error) => {
      const message = getLogCombinedMessage(
        func,
        `Attempt ${error.attemptNumber} failed with ${error.message}.`,
      );
      logger.warn(message);
    },
    retries,
  });
}

export default retryOperation;
