import type { GraphQL } from "~/types";
import db from "../db.server";
import createHttpError from "http-errors";

// Fulfillment services are designed for retailers to import products from suppliers
// https://shopify.dev/docs/apps/build/orders-fulfillment/fulfillment-service-apps
// https://shopify.dev/docs/api/admin-graphql/2024-04/mutations/fulfillmentServiceCreate

export async function getFulfillmentService(shop: string, graphql: GraphQL) {
  const fulfillmentService = await db.fulfillmentService.findFirst({
    where: {
      shop,
    },
  });
  if (!fulfillmentService) {
    return null;
  }

  return await supplementFulfillmentService(fulfillmentService.id, graphql);
}

export async function createFulfillmentService(shop: string, graphql: GraphQL) {
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
    if (!fulfillmentServiceCreate) {
      throw new createHttpError.BadRequest(
        "Could not create fulfillment service on Shopify",
      );
    }

    const { userErrors, fulfillmentService } = fulfillmentServiceCreate;

    if (userErrors) {
      const errorMessages = userErrors.map((error) => {
        return error.message;
      });
      throw new createHttpError.BadRequest(errorMessages.join(" "));
    }
  } catch {}
}

async function supplementFulfillmentService(id: string, graphql: GraphQL) {
  const response = await graphql(
    `
      query supplementFulfillmentService($id: ID!) {
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
  const { fulfillmentService } = data;

  return {
    id: fulfillmentService.id,
    name: fulfillmentService.serviceName,
  };
}
