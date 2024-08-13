import createHttpError from "http-errors";
import { errorHandler, getLogCombinedMessage, getLogContext } from "~/util";
import db from "../../db.server";
import type { GraphQL } from "~/types";
import logger from "~/logger";

export async function getFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const fulfillmentService = await db.fulfillmentService.findFirst({
      where: {
        sessionId,
      },
    });
    if (!fulfillmentService) {
      return null;
    }
    const { fulfillmentServiceId } = fulfillmentService;
    return await supplementFulfillmentService(fulfillmentServiceId, graphql);
  } catch (error) {
    const context = getLogContext(getFulfillmentService, sessionId, graphql);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve fulfillment service.",
    );
  }
}

// TODO: These two services have to be synced together
async function supplementFulfillmentService(
  fulfillmentServiceId: string,
  graphql: GraphQL,
) {
  try {
    const response = await graphql(
      `
        query supplementFulfillmentServiceQuery($id: ID!) {
          fulfillmentService(id: $id) {
            id
            serviceName
          }
        }
      `,
      {
        variables: { id: fulfillmentServiceId },
      },
    );

    const { data } = await response.json();
    if (!data || !data.fulfillmentService) {
      const logMessage = getLogCombinedMessage(
        supplementFulfillmentService,
        `Could not fetch fulfillment service given id ${fulfillmentServiceId}`,
        fulfillmentServiceId,
        graphql,
      );
      logger.error(logMessage);
      //!!! TODO: Maybe need to delete the fulfillment service from db, need to google
      throw new createHttpError.BadRequest(
        `Could not retrieve fulfillment service. Please contact support.`,
      );
    }

    const { fulfillmentService } = data;

    return {
      id: fulfillmentService.id,
      name: fulfillmentService.serviceName,
    };
  } catch (error) {
    const context = getLogContext(
      supplementFulfillmentService,
      fulfillmentServiceId,
      graphql,
    );
    throw errorHandler(
      error,
      context,
      "Failed to retrieve the fulfillment service in Shopify.",
    );
  }
}
