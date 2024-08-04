import { type GraphQLClient } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients/types";
import { type AdminOperations } from "node_modules/@shopify/admin-api-client/dist/ts/graphql/types";

export type GraphQL = GraphQLClient<AdminOperations>;
export type FormDataObject = Record<string, any>;
