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

export async function getFulfillmentService(shop: string, graphql: GraphQL) {
  try {
    const fulfillmentService = await db.fulfillmentService.findFirst({
      where: {
        shop,
      },
    });
    if (!fulfillmentService) {
      return null;
    }
    return await supplementFulfillmentService(fulfillmentService.id, graphql);
  } catch (error) {
    const context = getLogContext(getFulfillmentService, shop, graphql);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve fulfillment service.",
    );
  }
}

// Helper functions for creating fulfillment service (in Shopify and database)
async function createFulfillmentServiceShopify(shop: string, graphql: GraphQL) {
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
          name: "SyncSell",
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
        shop,
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
      shop,
      graphql,
    );
    throw errorHandler(
      error,
      context,
      "Failed to create fulfillment service in Shopify.",
    );
  }
}

async function createFulfillmentServiceDatabase(shop: string, id: string) {
  try {
    const fulfillmentService = await db.fulfillmentService.create({
      data: {
        shop: shop,
        id: id,
      },
    });
    return fulfillmentService;
  } catch (error) {
    const context = getLogContext(createFulfillmentServiceDatabase, shop, id);
    throw errorHandler(
      error,
      context,
      "Failed to create fulfillment service in database",
    );
  }
}

export async function createFulfillmentService(
  shop: string,
  graphql: GraphQL,
): Promise<FulfillmentServiceProps> {
  let fulfillmentServiceShopify;
  try {
    fulfillmentServiceShopify = await createFulfillmentServiceShopify(
      shop,
      graphql,
    );
    await createFulfillmentServiceDatabase(shop, fulfillmentServiceShopify.id);
    return fulfillmentServiceShopify;
  } catch (error) {
    // rollback mechanism if graphql query succeeds but db operation fails
    const context = getLogContext(createFulfillmentService, shop, graphql);
    if (!fulfillmentServiceShopify) {
      throw errorHandler(
        error,
        context,
        "Failed to create fulfillment services",
      );
    }
    // !!! Add Retry Logic
    try {
      await deleteFulfillmentServiceShopify(
        shop,
        fulfillmentServiceShopify.id,
        graphql,
      );
    } catch {
      const logMessage = getLogCombinedMessage(
        createFulfillmentService,
        `Failed deleting fulfillment service ${fulfillmentServiceShopify.id} during rollback`,
        shop,
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
      throw new createHttpError.BadRequest(
        `supplementFulfillmentService (id: ${id}): Could not fetch fulfillment service given id.`,
      );
    }

    const { fulfillmentService } = data;

    return {
      id: fulfillmentService.id,
      name: fulfillmentService.serviceName,
    };
  } catch (error) {
    if (createHttpError.isHttpError(error)) {
      throw error;
    }
    throw new createHttpError.InternalServerError(
      `createFulfillmentService (id: ${id}): Failed to query fulfillment service.`,
    );
  }
}
