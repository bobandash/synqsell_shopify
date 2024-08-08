import createHttpError from "http-errors";
import { errorHandler, getLogCombinedMessage, getLogContext } from "~/util";
import db from "../../db.server";
import type { GraphQL } from "~/types";
import logger from "logger";

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
    return await supplementFulfillmentService(fulfillmentService.id, graphql);
  } catch (error) {
    const context = getLogContext(getFulfillmentService, sessionId, graphql);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve fulfillment service.",
    );
  }
}

async function supplementFulfillmentService(id: string, graphql: GraphQL) {
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
        variables: { id: id },
      },
    );

    const { data } = await response.json();
    if (!data || !data.fulfillmentService) {
      const logMessage = getLogCombinedMessage(
        supplementFulfillmentService,
        `Could not fetch fulfillment service given id ${id}`,
        id,
        graphql,
      );
      logger.error(logMessage);
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
    const context = getLogContext(supplementFulfillmentService, id, graphql);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve the fulfillment service in Shopify.",
    );
  }
}
