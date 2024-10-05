import { Page, Layout, BlockStack } from '@shopify/polaris';
import { authenticate } from '~/shopify.server';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import {
  createMissingChecklistStatuses,
  getMissingChecklistIds,
  getTablesAndStatuses,
} from '~/services/models/checklistTable';
import { Await, defer, useActionData, useLoaderData } from '@remix-run/react';
import { Suspense, useEffect } from 'react';
import {
  createUserPreferences,
  hasUserPreferences,
} from '~/services/models/userPreferences';
import { INTENTS, MODALS } from './constants';
import {
  toggleChecklistVisibilityAction,
  getStartedRetailerAction,
  getStartedSupplierAction,
} from './actions';
import { convertFormDataToObject, getJSONError } from '~/util';
import { hasProfile } from '~/services/models/userProfile';
import { ChecklistTables } from './asyncComponents';
import { TableSkeleton } from './components/Skeleton';
import { getOrCreateProfile } from '~/services/helper/userProfile';
import { PaddedBox } from '~/components';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const [userPreferencesExist, profileExists, missingChecklistIds] =
      await Promise.all([
        hasUserPreferences(sessionId),
        hasProfile(sessionId),
        getMissingChecklistIds(sessionId),
      ]);

    // initialization of user
    if (!userPreferencesExist) {
      await createUserPreferences(sessionId);
    }
    if (!profileExists) {
      await getOrCreateProfile(sessionId, admin.graphql);
    }
    if (missingChecklistIds) {
      await createMissingChecklistStatuses(missingChecklistIds, sessionId);
    }
    const tablesPromise = await getTablesAndStatuses(sessionId);
    return defer({
      tables: tablesPromise,
    });
  } catch (error) {
    throw getJSONError(error, '/app/_index');
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
    }
  } catch (error) {
    return getJSONError(error, '/app/_index');
  }
};

function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  useEffect(() => {
    if (actionData && 'message' in actionData) {
      shopify.modal.hide(MODALS.BECOME_RETAILER);
      shopify.modal.hide(MODALS.BECOME_SUPPLIER);
      shopify.toast.show(actionData.message);
    }
  }, [actionData]);

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
