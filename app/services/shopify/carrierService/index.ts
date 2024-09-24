import { CARRIER_SERVICE_NAME } from '~/constants';
import { errorHandler } from '~/services/util';
import type { GraphQL } from '~/types';
import {
  CREATE_CARRIER_SERVICE,
  GET_INITIAL_CARRIER_SERVICES,
  GET_SUBSEQUENT_CARRIER_SERVICES,
} from './graphql';
import { getUserError } from '../util';

type CarrierServiceDetail = {
  id: string;
  name: string;
};

// helper function for getCarrierService
async function getAllCarrierServices(graphql: GraphQL) {
  const carrierServices: CarrierServiceDetail[] = [];
  let hasNextPage = true;
  let isInitialFetch = true;
  let endCursor = '';
  do {
    const query = isInitialFetch
      ? GET_INITIAL_CARRIER_SERVICES
      : GET_SUBSEQUENT_CARRIER_SERVICES;
    const variables = isInitialFetch ? {} : { variables: { after: endCursor } };
    const response = await graphql(query, variables);
    const { data } = await response.json();
    if (!data) {
      throw new Error('Failed to get carrier service from shopify.');
    }
    const edgesData = Object.values(data)[0];
    edgesData.edges.forEach(({ node }) => {
      carrierServices.push({
        id: node.id,
        name: node.name ?? '',
      });
    });
    endCursor = edgesData.pageInfo.endCursor ?? '';
    hasNextPage = edgesData.pageInfo.hasNextPage;
    isInitialFetch = false;
  } while (hasNextPage);

  return carrierServices;
}

export async function getCarrierService(sessionId: string, graphql: GraphQL) {
  // retrieve all the carrier services
  try {
    const carrierServices = await getAllCarrierServices(graphql);
    const filteredCarrierServices = carrierServices.filter(({ name }) => {
      return name === CARRIER_SERVICE_NAME;
    });

    if (filteredCarrierServices.length === 0) {
      return null;
    }
    return filteredCarrierServices[0];
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get carrier service from shopify.',
      getCarrierService,
      { sessionId },
    );
  }
}

export async function createCarrierService(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const response = await graphql(CREATE_CARRIER_SERVICE, {
      variables: {
        input: {
          active: true,
          callbackUrl: process.env.CARRIER_SERVICE_CALLBACK_URL ?? '',
          name: CARRIER_SERVICE_NAME,
          supportsServiceDiscovery: false,
        },
      },
    });

    const { data } = await response.json();
    const carrierServiceCreate = data?.carrierServiceCreate;
    if (
      !carrierServiceCreate ||
      !carrierServiceCreate.carrierService ||
      carrierServiceCreate.userErrors.length > 0
    ) {
      throw getUserError({
        defaultMessage:
          'Data is missing from creating the carrier service in Shpoify.',
        userErrors: carrierServiceCreate?.userErrors,
        parentFunc: createCarrierService,
        data: { sessionId },
      });
    }
    return {
      id: carrierServiceCreate.carrierService.id,
      name: carrierServiceCreate.carrierService.name,
    };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create carrier service in shopify.',
      createCarrierService,
      { sessionId },
    );
  }
}
