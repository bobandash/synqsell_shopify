import { CARRIER_SERVICE_NAME } from '~/constants';
import { errorHandler } from '~/lib/utils/server';
import type { GraphQL } from '~/types';
import {
  CREATE_CARRIER_SERVICE,
  GET_INITIAL_CARRIER_SERVICES,
  GET_SUBSEQUENT_CARRIER_SERVICES,
} from './graphql';
import {
  mutateInternalStoreAdminAPI,
  queryInternalStoreAdminAPI,
} from '../utils';
import type {
  CarrierServiceCreateMutation,
  InitialCarrierServicesQuery,
  SubsequentCarrierServicesQuery,
} from '~/types/admin.generated';

// https://shopify.dev/docs/api/admin-graphql/2024-01/objects/DeliveryCarrierService
// By creating a carrier service, when the customer goes to the checkout screen, we can put custom shipping rates
// the callback url is in a public endpoint from a lambda function with the API Gateway as the trigger

type CarrierServiceDetail = {
  id: string;
  name: string;
  callbackUrl: string;
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
    const data = await queryInternalStoreAdminAPI<
      InitialCarrierServicesQuery | SubsequentCarrierServicesQuery
    >(graphql, query, variables);
    const edgesData = Object.values(data)[0];
    edgesData.edges.forEach(({ node }) => {
      carrierServices.push({
        id: node.id,
        name: node.name ?? '',
        callbackUrl: node.callbackUrl ?? '',
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
    const callbackUrl = process.env.CARRIER_SERVICE_CALLBACK_URL
      ? `${process.env.CARRIER_SERVICE_CALLBACK_URL}?sessionId=${sessionId}`
      : '';

    if (!callbackUrl) {
      throw new Error('Carrier service callback url is not defined.');
    }

    const variables = {
      input: {
        active: true,
        callbackUrl,
        name: CARRIER_SERVICE_NAME,
        supportsServiceDiscovery: false,
      },
    };

    const data =
      await mutateInternalStoreAdminAPI<CarrierServiceCreateMutation>(
        graphql,
        CREATE_CARRIER_SERVICE,
        variables,
        'Failed to create carrier service.',
      );
    const carrierServiceCreate = data.carrierServiceCreate;
    return {
      id: carrierServiceCreate?.carrierService?.id ?? '',
      name: carrierServiceCreate?.carrierService?.name ?? '',
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
