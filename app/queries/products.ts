import { nodesFromEdges, parseGid } from "@shopify/admin-graphql-api-utilities";
import { type GraphQL } from "~/types";
import { errorHandler, getLogContext } from "~/util";

async function getIdMappedToStoreUrl(graphql: GraphQL, productIds: string[]) {
  try {
    const numProducts = productIds.length;
    const productIdsQueryFmt = productIds.map((id) => `id:${parseGid(id)}`);

    const queryStr = `${productIdsQueryFmt.join(" OR ")}`;

    const response = await graphql(
      `
        query ProductUrlsQuery($first: Int, $query: String) {
          products(first: $first, query: $query) {
            edges {
              node {
                id
                onlineStoreUrl
              }
            }
          }
        }
      `,
      {
        variables: {
          first: numProducts,
          query: queryStr,
        },
      },
    );
    const { data } = await response.json();
    // !!! TODO: Fix error handling. data can have an errors prop
    if (data) {
      const {
        products: { edges },
      } = data;
      const nodes = nodesFromEdges(edges);
      const idToStoreUrl = nodes.reduce((acc, node) => {
        const { id, onlineStoreUrl } = node;
        return {
          ...acc,
          [id]: onlineStoreUrl,
        };
      }, {});
      return idToStoreUrl;
    }
    return {};
  } catch (error) {
    const context = getLogContext(getIdMappedToStoreUrl, graphql, productIds);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve product urls from product ids.",
    );
  }
}

export { getIdMappedToStoreUrl };
