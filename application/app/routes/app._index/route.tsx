import { Page, Layout, BlockStack } from '@shopify/polaris';
import { authenticate } from '~/shopify.server';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import {
  createMissingChecklistStatuses,
  getMissingChecklistIds,
  getTablesAndStatuses,
} from '~/services/models/checklistTable';
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
import {
  getOrCreateCarrierService,
  getOrCreateProfile,
  handleAppReinstalled,
} from './loader';
import { getOrCreateUserPreferences } from '~/services/models/userPreferences';
import { getSession } from '~/services/models/session';
import { createJSONError, handleRouteError } from '~/lib/utils/server';
import { StatusCodes } from 'http-status-codes';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const {
      session: { id: sessionId },
      admin: { graphql },
    } = await authenticate.admin(request);
    // for initializing the application with required data to run the app
    const session = await getSession(sessionId);
    if (session.isAppUninstalled) {
      await handleAppReinstalled(sessionId);
    }

    await Promise.all([
      getOrCreateCarrierService(sessionId, graphql),
      getOrCreateStorefrontAccessToken(sessionId, graphql),
      getOrCreateProfile(sessionId, graphql),
      getOrCreateUserPreferences(sessionId),
    ]);

    const missingChecklistIds = await getMissingChecklistIds(sessionId);
    if (missingChecklistIds) {
      await createMissingChecklistStatuses(missingChecklistIds, sessionId);
    }
    const tablesPromise = await getTablesAndStatuses(sessionId);
    return defer({
      tables: tablesPromise,
    });
  } catch (error) {
    throw handleRouteError(error, '/app/_index');
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const {
      session,
      admin: { graphql },
    } = await authenticate.admin(request);
    const { id: sessionId } = session;
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
    return handleRouteError(error, '/app/_index');
  }
};

function Index() {
  const loaderData = useLoaderData<typeof loader>();
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
