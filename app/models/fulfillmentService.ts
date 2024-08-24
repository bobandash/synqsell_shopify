import { errorHandler, getLogCombinedMessage, getLogContext } from "~/util";
import db from "../db.server";
import { type GraphQL } from "~/types";
import createHttpError from "http-errors";
import { FULFILLMENT_SERVICE } from "~/constants";
import logger from "~/logger";

export type FulfillmentServiceShopifyProps = {
  id: string;
  name: string;
};

export type FulfillmentServiceDBProps = {
  id: string;
  fulfillmentServiceId: string;
  sessionId: string;
};

export async function getFulfillmentService(sessionId: string) {
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

// function is more for development, but it's possible that the shopify admin api & prisma db are not in sync
// this is the only way to retrieve the id of the fulfillment service w/out being provided the id
export async function getFulfillmentServiceIdShopify(graphql: GraphQL) {
  try {
    const response = await graphql(`
      query FulfillmentServicesQuery {
        shop {
          fulfillmentServices {
            id
            serviceName
          }
        }
      }
    `);
    const { data } = await response.json();
    if (!data) {
      throw new createHttpError.BadRequest(
        "Failed to get fulfillment services from shopify.",
      );
    }
    const {
      shop: { fulfillmentServices },
    } = data;
    const fulfillmentService = fulfillmentServices.filter(
      (service) => service.serviceName === FULFILLMENT_SERVICE,
    )[0];
    if (!fulfillmentService) {
      return null;
    }
    return fulfillmentService.id;
  } catch (error) {
    const context = getLogContext(getFulfillmentServiceIdShopify, graphql);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve fulfillment service from shopify.",
    );
  }
}

export async function hasFulfillmentService(sessionId: string) {
  try {
    const fulfillmentService = await db.fulfillmentService.findFirst({
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

// methods for deleting a fulfillment service in prisma
export async function deleteFulfillmentServiceDatabase(id: string) {
  try {
    const deletedFulfillmentService = await db.fulfillmentService.delete({
      where: {
        id,
      },
    });
    return deletedFulfillmentService;
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
    const newFulfillmentService = await getOrCreateFulfillmentService(
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
    await rollbackDeleteFulfillmentService(id, sessionId, graphql);
    throw errorHandler(error, context, "Failed to delete fulfillment service.");
  }
}

// for creating fulfillment services
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
          name: "Synqsell_test",
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

export async function getOrCreateFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const fulfillmentServiceExists = await hasFulfillmentService(sessionId);
    if (fulfillmentServiceExists) {
      return await getFulfillmentService(sessionId);
    }
    let fulfillmentServiceShopify;
    try {
      fulfillmentServiceShopify = await createFulfillmentServiceShopify(
        sessionId,
        graphql,
      );
      const fulfillmentServiceDb = await createFulfillmentServiceDatabase(
        sessionId,
        fulfillmentServiceShopify.id,
      );
      return fulfillmentServiceDb;
    } catch (error) {
      // rollback mechanism if graphql query succeeds but db operation fails
      const context = getLogContext(
        getOrCreateFulfillmentService,
        sessionId,
        graphql,
      );
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
          getOrCreateFulfillmentService,
          `Failed deleting fulfillment service ${fulfillmentServiceShopify.id} during rollback`,
          sessionId,
          graphql,
        );
        logger.error(logMessage);
        throw new createHttpError.InternalServerError(
          "Failed to delete new fulfillment service. Please contact support.",
        );
      }
      throw errorHandler(
        error,
        context,
        "Failed to create fulfillment services",
      );
    }
  } catch (error) {
    const context = getLogContext(
      getOrCreateFulfillmentService,
      sessionId,
      graphql,
    );
    throw errorHandler(
      error,
      context,
      "Failed to create fulfillment service in database. Please try again later.",
    );
  }
}
