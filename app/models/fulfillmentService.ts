import type { GraphQL } from "~/types";
import db from "../db.server";
import createHttpError from "http-errors";

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
    if (createHttpError.isHttpError(error)) {
      throw error;
    }

    throw new createHttpError.InternalServerError(
      `createFulfillmentService (id: ${shop}): Failed to get fulfillment service fulfillment service.`,
    );
  }
}

// Functions for creating fulfillment service (in Shopify and database)
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
          name: "SynqSell",
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
      ) || [
        `createFulfillmentServiceShopify (shop: ${shop}): Failed to create fulfillment service on Shopify.`,
      ];
      throw new createHttpError.BadRequest(errorMessages.join(" "));
    }

    const { fulfillmentService } = fulfillmentServiceCreate;

    return {
      id: fulfillmentService.id,
      name: fulfillmentService.serviceName,
    };
  } catch (error) {
    if (createHttpError.isHttpError(error)) {
      throw error;
    }

    throw new createHttpError.InternalServerError(
      `createFulfillmentServiceShopify (shop: ${shop}): Failed to retrieve checklist table.`,
    );
  }
}

export async function deleteFulfillmentService(
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
      ) || [
        `deleteFulfillmentService (shop: ${shop}, id: ${id}): Failed to delete fulfillment service.`,
      ];
      throw new createHttpError.BadRequest(errorMessages.join(" "));
    }

    return { id };
  } catch (error) {
    if (createHttpError.isHttpError(error)) {
      throw error;
    }

    throw new createHttpError.InternalServerError(
      `deleteFulfillmentService (shop: ${shop}, id: ${id}): Failed to delete fulfillment service.`,
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
  } catch {
    throw new createHttpError.InternalServerError(
      `createFulfillmentServiceDatabase (shop: ${shop} id: ${id}): Failed to create fulfillment service table.`,
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
    if (fulfillmentServiceShopify) {
      try {
        await deleteFulfillmentService(
          shop,
          fulfillmentServiceShopify.id,
          graphql,
        );
      } catch {
        throw new createHttpError.InternalServerError(
          `createFulfillmentService (shop: ${shop} fulfillmentServiceId: ${fulfillmentServiceShopify.id}): Failed to create fulfillment service table.`,
        );
      }
    }

    if (createHttpError.isHttpError(error)) {
      throw error;
    }

    throw new createHttpError.InternalServerError(
      `createFulfillmentService (shop: ${shop}): Failed to create fulfillment service.`,
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
