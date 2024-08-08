import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import { getRoles } from "~/models/roles";
import { ROLES } from "~/constants";
import { useState } from "react";
import { RoleProvider } from "~/context/RoleProvider";
import { getJSONError } from "~/util";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const roles = await getRoles(sessionId);
    return json({ apiKey: process.env.SHOPIFY_API_KEY || "", roles });
  } catch (error) {
    throw getJSONError(error, "app root");
  }
};

export default function App() {
  const { apiKey, roles: initalRoles } = useLoaderData<typeof loader>();
  const [roles, setRoles] = useState(new Set(initalRoles));
  const isSupplier = roles.has(ROLES.RETAILER);
  const isRetailer = roles.has(ROLES.SUPPLIER);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <RoleProvider roles={roles} setRoles={setRoles}>
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          {isSupplier && (
            <Link to="/app/retailer-network">Retailer Network</Link>
          )}
          {isRetailer && (
            <Link to="/app/supplier-network">Supplier Network</Link>
          )}
          {isSupplier && <Link to="/app/price-list">Price Lists</Link>}
          {(isSupplier || isRetailer) && (
            <>
              <Link to="/app/partnerships">Partnerships</Link>
              <Link to="/app/settings">Settings</Link>
            </>
          )}
        </NavMenu>
        <Outlet />
      </RoleProvider>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
