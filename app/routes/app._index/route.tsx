import { Page, Layout, BlockStack } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  createMissingChecklistStatuses,
  getMissingChecklistIds,
  getTablesAndStatuses,
} from "~/models/checklistTable";
import {
  Await,
  defer,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { Suspense } from "react";
import {
  createUserPreferences,
  hasUserPreferences,
} from "~/models/userPreferences";
import logger from "~/logger";
import { INTENTS } from "./constants";
import {
  toggleChecklistVisibilityAction,
  getStartedRetailerAction,
  getStartedSupplierAction,
} from "./actions";
import { convertFormDataToObject, getJSONError } from "~/util";
import { getOrCreateProfile, hasProfile } from "~/models/userProfile";
import { ChecklistTables } from "./asyncComponents";
import { TableSkeleton } from "./components/Skeleton";

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
    throw getJSONError(error, "index");
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const { id: sessionId } = session;
    let formData = await request.formData();
    const intent = formData.get("intent");
    const formDataObject = convertFormDataToObject(formData);
    switch (intent) {
      case INTENTS.TOGGLE_CHECKLIST_VISIBILITY:
        return toggleChecklistVisibilityAction(formDataObject, sessionId);
      case INTENTS.RETAILER_GET_STARTED:
        return getStartedRetailerAction(
          admin.graphql,
          formDataObject,
          sessionId,
        );
      case INTENTS.SUPPLIER_GET_STARTED:
        return getStartedSupplierAction(formDataObject, sessionId);
    }
  } catch (error) {
    logger.error(error);
  }

  return null;
};

function Index() {
  const loaderData = useLoaderData<typeof loader>();
  return (
    <Page title="SynqSell" subtitle="Where Brand Partnerships Flourish">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Suspense fallback={<TableSkeleton />}>
              <Await
                resolve={loaderData}
                errorElement={<div>Oops, something wrong with the API!</div>}
              >
                <ChecklistTables />
              </Await>
            </Suspense>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    );
  } else if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    );
  } else {
    return <h1>Unknown Error</h1>;
  }
}

export default Index;
