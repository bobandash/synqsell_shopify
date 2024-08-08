import type { GraphQL } from "~/types";
import db from "../../db.server";
import createHttpError from "http-errors";
import { getLogCombinedMessage, getLogContext } from "~/util/getLogContext";
import { errorHandler } from "~/util";
import logger from "logger";
import { createFulfillmentService } from "./createFulfillmentService";

export async function deleteFulfillmentServiceDatabase(id: string) {
  try {
    await db.fulfillmentService.delete({
      where: {
        id,
      },
    });
    return true;
  } catch (error) {
    const context = getLogContext(deleteFulfillmentServiceDatabase, id);
    throw errorHandler(
      error,
      context,
      "Failed to delete fulfillment service from database.",
    );
  }
}

export async function deleteFulfillmentServiceShopify(
  id: string,
  graphql: GraphQL,
) {
  try {
    const response = await graphql(
      `
        mutation fulfillmentServiceDelete($id: ID!) {
          fulfillmentServiceDelete(id: $id) {
            deletedId
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          id: id,
        },
      },
    );
    const { data } = await response.json();
    const fulfillmentServiceDelete = data?.fulfillmentServiceDelete;
    if (!fulfillmentServiceDelete || !fulfillmentServiceDelete.deletedId) {
      const errorMessages = fulfillmentServiceDelete?.userErrors?.map(
        (error) => error.message,
      ) || [`Failed to delete fulfillment service in Shopify.`];
      const logMessage = getLogCombinedMessage(
        deleteFulfillmentServiceShopify,
        errorMessages.join(" "),
        id,
        graphql,
      );
      logger.error(logMessage);
      throw new createHttpError.BadRequest(errorMessages.join(" "));
    }

    return true;
  } catch (error) {
    const context = getLogContext(deleteFulfillmentServiceShopify, id, graphql);
    throw errorHandler(
      error,
      context,
      "Failed to delete fulfillment service in Shopify.",
    );
  }
}

async function rollbackDeleteFulfillmentService(
  id: string,
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const newFulfillmentService = await createFulfillmentService(
      sessionId,
      graphql,
    );
    db.fulfillmentService.update({
      where: {
        id: id,
      },
      data: {
        fulfillmentServiceId: newFulfillmentService.id,
      },
    });
  } catch (error) {
    const logMessage = getLogCombinedMessage(
      deleteFulfillmentService,
      `Failed re-creating fulfillment service during rollback.`,
      sessionId,
      id,
      graphql,
    );
    logger.error(logMessage);
    throw new createHttpError.InternalServerError(
      "Failed re-creating fulfillment service. Please contact support.",
    );
  }
}

export async function deleteFulfillmentService(
  sessionId: string,
  id: string,
  graphql: GraphQL,
) {
  let deletedShopifyFulfillmentService = false;
  try {
    await deleteFulfillmentServiceShopify(id, graphql);
    deletedShopifyFulfillmentService = true;
    await deleteFulfillmentServiceDatabase(id);
    return true;
  } catch (error) {
    // rollback if failed to delete
    const context = getLogContext(
      deleteFulfillmentService,
      sessionId,
      id,
      graphql,
    );
    if (!deletedShopifyFulfillmentService) {
      throw errorHandler(
        error,
        context,
        "Failed to delete fulfillment services",
      );
    }
    // !!! TODO: maybe add retry to rollback as well as last resort
    await rollbackDeleteFulfillmentService(id, sessionId, graphql);
    throw errorHandler(error, context, "Failed to delete fulfillment service.");
  }
}
