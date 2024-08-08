import type { GraphQL } from "~/types";
import db from "../../db.server";
import createHttpError from "http-errors";
import { getLogCombinedMessage, getLogContext, errorHandler } from "~/util";
import logger from "logger";
import { deleteFulfillmentServiceShopify } from "./deleteFulfillmentService";
// Fulfillment services are designed for retailers to import products from suppliers
// https://shopify.dev/docs/apps/build/orders-fulfillment/fulfillment-service-apps
// https://shopify.dev/docs/api/admin-graphql/2024-04/mutations/fulfillmentServiceCreate

export type FulfillmentServiceProps = {
  id: string;
  name: string;
};

// Helper functions for creating fulfillment service (in Shopify and database)
async function createFulfillmentServiceShopify(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const response = await graphql(
      `
        mutation fulfillmentServiceCreate(
          $name: String!
          $callbackUrl: URL!
          $trackingSupport: Boolean!
        ) {
          fulfillmentServiceCreate(
            name: $name
            callbackUrl: $callbackUrl
            trackingSupport: $trackingSupport
          ) {
            fulfillmentService {
              id
              serviceName
              callbackUrl
              trackingSupport
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          name: "Synqsells",
          callbackUrl: "https://smth.synqsell.com", // placeholder value
          trackingSupport: true,
        },
      },
    );

    const { data } = await response.json();
    const fulfillmentServiceCreate = data?.fulfillmentServiceCreate;

    if (
      !fulfillmentServiceCreate ||
      !fulfillmentServiceCreate.fulfillmentService
    ) {
      const errorMessages = fulfillmentServiceCreate?.userErrors?.map(
        (error) => error.message,
      ) || [`Failed to create fulfillment service on Shopify.`];
      const logMessage = getLogCombinedMessage(
        createFulfillmentServiceShopify,
        errorMessages.join(" "),
        sessionId,
        graphql,
      );
      logger.error(logMessage);
      throw new createHttpError.BadRequest(errorMessages.join(" "));
    }

    const { fulfillmentService } = fulfillmentServiceCreate;

    return {
      id: fulfillmentService.id,
      name: fulfillmentService.serviceName,
    };
  } catch (error) {
    const context = getLogContext(
      createFulfillmentServiceShopify,
      sessionId,
      graphql,
    );
    throw errorHandler(
      error,
      context,
      "Failed to create fulfillment service in Shopify.",
    );
  }
}

async function createFulfillmentServiceDatabase(
  sessionId: string,
  fulfillmentServiceId: string,
) {
  try {
    const fulfillmentService = await db.fulfillmentService.create({
      data: {
        sessionId,
        fulfillmentServiceId,
      },
    });
    return fulfillmentService;
  } catch (error) {
    const context = getLogContext(
      createFulfillmentServiceDatabase,
      sessionId,
      fulfillmentServiceId,
    );
    throw errorHandler(
      error,
      context,
      "Failed to create fulfillment service in database. Please try again later.",
    );
  }
}

// !!! Add Retry Logic
export async function createFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
): Promise<FulfillmentServiceProps> {
  let fulfillmentServiceShopify;
  try {
    fulfillmentServiceShopify = await createFulfillmentServiceShopify(
      sessionId,
      graphql,
    );
    await createFulfillmentServiceDatabase(
      sessionId,
      fulfillmentServiceShopify.id,
    );
    return fulfillmentServiceShopify;
  } catch (error) {
    // rollback mechanism if graphql query succeeds but db operation fails
    const context = getLogContext(createFulfillmentService, sessionId, graphql);
    if (!fulfillmentServiceShopify) {
      throw errorHandler(
        error,
        context,
        "Failed to create fulfillment services",
      );
    }

    try {
      await deleteFulfillmentServiceShopify(
        fulfillmentServiceShopify.id,
        graphql,
      );
    } catch {
      const logMessage = getLogCombinedMessage(
        createFulfillmentService,
        `Failed deleting fulfillment service ${fulfillmentServiceShopify.id} during rollback`,
        sessionId,
        graphql,
      );
      logger.error(logMessage);
      throw new createHttpError.InternalServerError(
        "Failed to delete new fulfillment service. Please contact support.",
      );
    }
    throw errorHandler(error, context, "Failed to create fulfillment services");
  }
}