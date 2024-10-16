import { updateStoreStatus } from '~/services/models/product';
import { errorHandler } from '~/services/util';
import db from '~/db.server';
import { getSession, type Session } from '~/services/models/session';
import { hasRole } from '~/services/models/roles';
import { ROLES } from '~/constants';
import {
  GET_PRODUCT_STATUS,
  UPDATE_PRODUCT_STATUS_MUTATION,
} from '~/services/shopify/products/graphql';
import type { ProductStatusQuery } from '~/services/shopify/products/types';
import { createMapIdToRestObj } from '~/routes/util';
import {
  mutateExternalStoreAdminAPI,
  queryExternalStoreAdminAPI,
} from '~/services/shopify/util';

type ImportedProductDetail = {
  retailerShopifyProductId: string;
  supplierShopifyProductId: string;
  retailerId: string;
};

// ==============================================================================================================
// START: FUNCTIONS TO REACTIVATE ALL RETAILERS' IMPORTED PRODUCTS IF SUPPLIER
// ==============================================================================================================
async function getProductStatusInfo(
  shopifyProductId: string,
  session: Session,
) {
  const res = await queryExternalStoreAdminAPI<ProductStatusQuery>(
    session.shop,
    shopifyProductId,
    GET_PRODUCT_STATUS,
    {
      id: shopifyProductId,
    },
  );

  const productStatusInfo = {
    id: res.product?.id ?? '',
    status: res.product?.status ?? '',
  };

  return productStatusInfo;
}

async function fetchImportedProductDetails(supplierId: string) {
  const res = await db.importedProduct.findMany({
    where: {
      prismaProduct: {
        priceList: {
          supplierId: supplierId,
        },
      },
    },
    select: {
      shopifyProductId: true,
      retailerId: true,
      prismaProduct: {
        select: {
          shopifyProductId: true,
        },
      },
    },
  });
  const importedProductDetails = res.map((val) => ({
    retailerShopifyProductId: val.shopifyProductId,
    supplierShopifyProductId: val.prismaProduct.shopifyProductId,
    retailerId: val.retailerId,
  }));
  return importedProductDetails;
}

async function addShopifyProductStatus(
  importedProductDetails: ImportedProductDetail[],
  supplierSession: Session,
) {
  const supplierProductStatusInfoPromises = importedProductDetails.map(
    ({ supplierShopifyProductId }) =>
      getProductStatusInfo(supplierShopifyProductId, supplierSession),
  );
  const supplierShopifyProductStatusInfo = await Promise.all(
    supplierProductStatusInfoPromises,
  );

  const supplierShopifyProductIdToStatusMap = createMapIdToRestObj(
    supplierShopifyProductStatusInfo,
    'id',
  );
  const allImportedProductDetailsWithStatus = importedProductDetails.map(
    ({ supplierShopifyProductId, ...rest }) => {
      const supplierProductStatus = supplierShopifyProductIdToStatusMap.get(
        supplierShopifyProductId,
      )?.status;

      // this typically should not run, only for ts safety
      if (!supplierProductStatus) {
        throw new Error(
          `No status is found for supplierShopifyProductId ${supplierShopifyProductId}.`,
        );
      }
      return {
        supplierShopifyProductId,
        supplierProductStatus,
        ...rest,
      };
    },
  );
  return allImportedProductDetailsWithStatus;
}

async function getAllImportedProductDetails(supplierSession: Session) {
  try {
    const importedProductDetails = await fetchImportedProductDetails(
      supplierSession.id,
    );
    const allImportedProductDetails = await addShopifyProductStatus(
      importedProductDetails,
      supplierSession,
    );
    return allImportedProductDetails;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get all imported product details',
      getAllImportedProductDetails,
      {
        sessionId: supplierSession.id,
      },
    );
  }
}

async function updateRetailerProductStatus(
  retailerId: string,
  retailerShopifyProductId: string,
  supplierProductStatus: string,
) {
  const retailerSession = await getSession(retailerId);
  await mutateExternalStoreAdminAPI(
    retailerSession.shop,
    retailerSession.accessToken,
    UPDATE_PRODUCT_STATUS_MUTATION,
    {
      input: {
        id: retailerShopifyProductId,
        status: supplierProductStatus,
      },
    },
    'Could not update retailer shopify product status.',
  );
}

async function handleReinstateAllRetailerProducts(supplierSession: Session) {
  const importedProductDetails =
    await getAllImportedProductDetails(supplierSession);
  const updateRetailerProductStatusPromises = importedProductDetails.map(
    (detail) => {
      const { retailerId, retailerShopifyProductId, supplierProductStatus } =
        detail;
      return updateRetailerProductStatus(
        retailerId,
        retailerShopifyProductId,
        supplierProductStatus,
      );
    },
  );
  await Promise.all(updateRetailerProductStatusPromises);
}

// ==============================================================================================================
// START: FUNCTIONS TO REACTIVATE ALL MERCHANT'S IMPORTED PRODUCTS
// ==============================================================================================================
async function fetchAllRetailerImportedProducts(retailerSession: Session) {
  try {
    const importedProducts = await db.importedProduct.findMany({
      where: {
        retailerId: retailerSession.id,
      },
      select: {
        shopifyProductId: true,
      },
    });
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get all retailer imported products',
      getAllImportedProductDetails,
      {
        sessionId: retailerSession.id,
      },
    );
  }
}

async function handleReinstateImportedProducts(retailerSession: Session) {}

// Shopify's app/uninstalled webhook runs immediately after uninstallation
// however, there are mandatory webhooks that the app has to subscribe to
// one of the webhook topics is shop/redact, where after 48 hours of uninstallation, Shopify tells you to delete the data
// So, if the merchant reinstalls the app w/in 48 hours, we need to reactivate all the data
// so if the merchant is a supplier, then we need to reactivate all the retailers' imported products to active
// and if the merchant is a retailer, then we need to reactivate all the merchant's imported products to active
export async function handleAppReinstalled(sessionId: string) {
  try {
    const [isRetailer, isSupplier, session] = await Promise.all([
      hasRole(sessionId, ROLES.RETAILER),
      hasRole(sessionId, ROLES.SUPPLIER),
      getSession(sessionId),
    ]);

    if (isRetailer) {
      await handleReinstateImportedProducts(session);
    }
    if (isSupplier) {
      await handleReinstateAllRetailerProducts(session);
    }
    // handle this last
    await updateStoreStatus(sessionId, true);
  } catch (error) {}
}
