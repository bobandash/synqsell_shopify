import type { GraphQL } from '~/types';

async function mutateGraphQLAdminData<T>(
  graphql: GraphQL,
  mutation: string,
  variables: any,
  defaultErrorMessage: string,
): Promise<T> {
  const response = await graphql(mutation, { variables });
  const { data } = await response.json();
  if (!data) {
    throw new Error(defaultErrorMessage);
  }
  const mutationName = Object.keys(data)[0];
  const mutationData = data[mutationName];
  if (mutationData.userErrors && mutationData.userErrors.length > 0) {
    throw new Error(
      mutationData.userErrors.map((error: any) => error.message).join(' '),
    );
  }
  return data as T;
}

export default mutateGraphQLAdminData;
