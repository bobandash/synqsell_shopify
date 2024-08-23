import { errorHandler, getLogContext } from "~/util";
import db from "../../db.server";

async function getFulfillmentService(sessionId: string) {
  try {
    const fulfillmentService = await db.fulfillmentService.findFirstOrThrow({
      where: {
        sessionId,
      },
    });
    return fulfillmentService;
  } catch (error) {
    const context = getLogContext(getFulfillmentService, sessionId);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve fulfillment service.",
    );
  }
}

async function hasFulfillmentService(sessionId: string) {
  try {
    const fulfillmentService = await db.fulfillmentService.findFirstOrThrow({
      where: {
        sessionId,
      },
    });
    if (!fulfillmentService) {
      return false;
    }
    return true;
  } catch (error) {
    const context = getLogContext(hasFulfillmentService, sessionId);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve fulfillment service.",
    );
  }
}

export { getFulfillmentService, hasFulfillmentService };
