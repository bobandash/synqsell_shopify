import { Page, Layout, BlockStack } from '@shopify/polaris';
import { authenticate } from '~/shopify.server';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import {
  createMissingChecklistStatuses,
  getMissingChecklistIds,
  getTablesAndStatuses,
} from '~/services/models/checklistTable.server';
import {
  Await,
  defer,
  useActionData,
  useLoaderData,
  useNavigation,
} from '@remix-run/react';
import { Suspense, useEffect } from 'react';
import { INTENTS, MODALS } from './constants';
import {
  toggleChecklistVisibilityAction,
  getStartedRetailerAction,
  getStartedSupplierAction,
} from './actions';
import {
  convertFormDataToObject,
  isActionDataError,
  isActionDataSuccess,
} from '~/lib/utils';
import { ChecklistTables } from './asyncComponents';
import { TableSkeleton } from './components/Skeleton';
import { PaddedBox } from '~/components';
import { getOrCreateStorefrontAccessToken } from './loader/storefrontAccessToken';
import { getOrCreateCarrierService, getOrCreateProfile } from './loader';
import { getOrCreateUserPreferences } from '~/services/models/userPreferences.server';
import { createJSONError, getRouteError, logError } from '~/lib/utils/server';
import { StatusCodes } from 'http-status-codes';
import { userHasStripePaymentMethod } from '~/services/models/stripeCustomerAccount.server';
import { userHasStripeConnectAccount } from '~/services/models/stripeConnectAccount.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {
    session: { id: sessionId },
    admin: { graphql },
  } = await authenticate.admin(request);
  // for initializing the application with required data to run the app
  await Promise.all([
    getOrCreateCarrierService(sessionId, graphql),
    getOrCreateStorefrontAccessToken(sessionId, graphql),
    getOrCreateProfile(sessionId, graphql),
    getOrCreateUserPreferences(sessionId),
  ]);

  const missingChecklistIds = await getMissingChecklistIds(sessionId);
  if (missingChecklistIds.length > 0) {
    await createMissingChecklistStatuses(missingChecklistIds, sessionId);
  }

  return defer({
    loaderData: Promise.all([
      getTablesAndStatuses(sessionId),
      userHasStripePaymentMethod(sessionId),
      userHasStripeConnectAccount(sessionId),
    ]).then(([tables, hasStripePaymentMethod, hasStripeConnectAccount]) => ({
      tables,
      hasStripePaymentMethod,
      hasStripeConnectAccount,
    })),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  let sessionId: string | undefined;
  try {
    const {
      session,
      admin: { graphql },
    } = await authenticate.admin(request);
    sessionId = session.id;
    let formData = await request.formData();
    const intent = formData.get('intent');
    const formDataObject = convertFormDataToObject(formData);
    switch (intent) {
      case INTENTS.TOGGLE_CHECKLIST_VISIBILITY:
        return toggleChecklistVisibilityAction(formDataObject, sessionId);
      case INTENTS.RETAILER_GET_STARTED:
        return getStartedRetailerAction(graphql, formDataObject, sessionId);
      case INTENTS.SUPPLIER_GET_STARTED:
        return getStartedSupplierAction(formDataObject, sessionId);
      default:
        return createJSONError(
          `Invalid intent ${intent}.`,
          StatusCodes.BAD_REQUEST,
        );
    }
  } catch (error) {
    logError(error, { sessionId });
    return getRouteError(
      error,
      'Failed to toggle checklist table visibility. Please try again later.',
    );
  }
};

function Index() {
  const { loaderData } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  useEffect(() => {
    if (navigation.state === 'loading') {
      shopify.modal.hide(MODALS.BECOME_RETAILER);
      shopify.modal.hide(MODALS.BECOME_SUPPLIER);
    }
  }, [navigation]);

  useEffect(() => {
    if (!actionData || navigation.state !== 'idle') {
      return;
    }
    if (isActionDataError(actionData)) {
      shopify.toast.show(actionData.error.message, {
        isError: true,
      });
    } else if (isActionDataSuccess(actionData)) {
      shopify.toast.show(actionData.message);
    }
  }, [actionData, navigation]);

  return (
    <Page title="SynqSell" subtitle="Where Brand Partnerships Flourish">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Suspense fallback={<TableSkeleton />}>
              <Await resolve={loaderData}>
                <ChecklistTables />
              </Await>
            </Suspense>
          </Layout.Section>
        </Layout>
      </BlockStack>
      <PaddedBox />
    </Page>
  );
}

export default Index;
