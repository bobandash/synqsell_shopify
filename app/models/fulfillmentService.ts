import db from "../db.server";
import { type GraphQLClient } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients/types";
import { type AdminOperations } from "node_modules/@shopify/admin-api-client/dist/ts/graphql/types";

type GraphQL = GraphQLClient<AdminOperations>;

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

// TODO: Figure out retries and error handling
export async function createFulfillmentService(shop: string, graphql: GraphQL) {
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

  return response;
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

  const {
    data: { fulfillmentService },
  } = await response.json();
  return {
    id: fulfillmentService.id,
    name: fulfillmentService.serviceName,
  };
}
