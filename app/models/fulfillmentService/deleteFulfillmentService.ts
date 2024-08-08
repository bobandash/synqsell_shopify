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
  shop: string,
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
        shop,
        id,
        graphql,
      );
      logger.error(logMessage);
      throw new createHttpError.BadRequest(errorMessages.join(" "));
    }

    return true;
  } catch (error) {
    const context = getLogContext(
      deleteFulfillmentServiceShopify,
      shop,
      id,
      graphql,
    );
    throw errorHandler(
      error,
      context,
      "Failed to delete fulfillment service in Shopify.",
    );
  }
}

export async function deleteFulfillmentService(
  shop: string,
  id: string,
  graphql: GraphQL,
) {
  let deletedShopifyFulfillmentService = false;
  try {
    await deleteFulfillmentServiceShopify(shop, id, graphql);
    deletedShopifyFulfillmentService = true;
    await deleteFulfillmentServiceDatabase(id);
    return true;
  } catch (error) {
    // rollback if failed to delete
    const context = getLogContext(deleteFulfillmentService, shop, id, graphql);
    if (!deletedShopifyFulfillmentService) {
      throw errorHandler(
        error,
        context,
        "Failed to delete fulfillment services",
      );
    }

    try {
      const newFulfillmentService = await createFulfillmentService(
        shop,
        graphql,
      );
      db.fulfillmentService.update({
        where: {
          shop: shop,
        },
        data: {
          id: newFulfillmentService.id,
        },
      });
    } catch (error) {
      const logMessage = getLogCombinedMessage(
        deleteFulfillmentService,
        `Failed re-creating fulfillment service during rollback.`,
        shop,
        id,
        graphql,
      );
      logger.error(logMessage);
      throw new createHttpError.InternalServerError(
        "Failed to re-create fulfillment service. Please contact support.",
      );
    }

    throw errorHandler(error, context, "Failed to delete fulfillment services");
  }
}

//     const context = getLogContext(createFulfillmentService, shop, graphql);
//     if (!fulfillmentServiceShopify) {
//       throw errorHandler(
//         error,
//         context,
//         "Failed to create fulfillment services",
//       );
//     }
//     // !!! Add Retry Logic
//     try {
//       await deleteFulfillmentServiceShopify(
//         shop,
//         fulfillmentServiceShopify.id,
//         graphql,
//       );
//     } catch {
//       const logMessage = getLogCombinedMessage(
//         createFulfillmentService,
//         `Failed deleting fulfillment service ${fulfillmentServiceShopify.id} during rollback`,
//         shop,
//         graphql,
//       );
//       logger.error(logMessage);
//       throw new createHttpError.InternalServerError(
//         "Failed to delete new fulfillment service. Please contact support.",
//       );
//     }
//     throw errorHandler(error, context, "Failed to create fulfillment services");
//   }
// }
