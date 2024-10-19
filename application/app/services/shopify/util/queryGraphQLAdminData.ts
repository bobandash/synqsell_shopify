import type { GraphQL } from '~/types';

async function queryGraphQLAdminData<T>(
  graphql: GraphQL,
  query: string,
  variables: any,
): Promise<T> {
  const response = await graphql(query, { variables });
  const { data } = await response.json();
  if (!data) {
    throw new Error('No data returned from GraphQL query');
  }
  return data as T;
}

export default queryGraphQLAdminData;
