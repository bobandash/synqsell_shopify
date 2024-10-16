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

// for changing all retailers that imported a supplier's product
type SupplierImportedProductDetail = {
  retailerShopifyProductId: string;
  supplierShopifyProductId: string;
  retailerId: string;
};

// for changing a retailer's individual imported product
type RetailerImportedProductDetail = {
  supplierId: string;
  supplierShopifyProductId: string;
  retailerShopifyProductId: string;
};

// ==============================================================================================================
// START: HELPER FUNCTIONS TO REACTIVATING PRODUCTS
// ==============================================================================================================
async function addSupplierShopifyProductStatus(
  importedProductDetails:
    | SupplierImportedProductDetail[]
    | RetailerImportedProductDetail[],
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

async function handleReinstateAllRetailerProductsForSupplier(
  supplierSession: Session,
) {
  const importedProductDetails = await fetchImportedProductDetails(
    supplierSession.id,
  );
  const importedProductDetailsWithStatus =
    await addSupplierShopifyProductStatus(
      importedProductDetails,
      supplierSession,
    );
  const updateRetailerProductStatusPromises =
    importedProductDetailsWithStatus.map((detail) => {
      // this is just for ts safety for retailerId
      if ('retailerId' in detail) {
        const { retailerId, retailerShopifyProductId, supplierProductStatus } =
          detail;
        return updateRetailerProductStatus(
          retailerId,
          retailerShopifyProductId,
          supplierProductStatus,
        );
      }
      return Promise.resolve();
    });
  await Promise.all(updateRetailerProductStatusPromises);
}

// ==============================================================================================================
// START: FUNCTIONS TO REACTIVATE ALL MERCHANT'S IMPORTED PRODUCTS
// ==============================================================================================================
async function fetchAllRetailerImportedProducts(retailerSession: Session) {
  try {
    const importedProductDetails = await db.importedProduct.findMany({
      where: {
        retailerId: retailerSession.id,
      },
      select: {
        shopifyProductId: true,
        prismaProduct: {
          select: {
            shopifyProductId: true,
            priceList: {
              select: {
                supplierId: true,
              },
            },
          },
        },
      },
    });

    const importedProductDetailsFmt = importedProductDetails.map(
      (importedProduct) => {
        return {
          supplierId: importedProduct.prismaProduct.priceList.supplierId,
          supplierShopifyProductId:
            importedProduct.prismaProduct.shopifyProductId,
          retailerShopifyProductId: importedProduct.shopifyProductId,
        };
      },
    );

    return importedProductDetailsFmt;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get all retailer imported products',
      fetchAllRetailerImportedProducts,
      {
        sessionId: retailerSession.id,
      },
    );
  }
}

function groupBySupplier(
  retailerImportedProductDetails: RetailerImportedProductDetail[],
) {
  const supplierToProductDetails = new Map<
    string,
    RetailerImportedProductDetail[]
  >();
  retailerImportedProductDetails.forEach((detail) => {
    const supplierId = detail.supplierId;
    const prev = supplierToProductDetails.get(supplierId);
    if (!prev) {
      supplierToProductDetails.set(supplierId, [detail]);
    } else {
      supplierToProductDetails.set(supplierId, [...prev, detail]);
    }
  });
  return supplierToProductDetails;
}

async function handleReinstateImportedProductsForRetailer(
  retailerSession: Session,
) {
  try {
    const retailerImportedProductDetails =
      await fetchAllRetailerImportedProducts(retailerSession);
    const importedProductDetailsBySupplier = groupBySupplier(
      retailerImportedProductDetails,
    );
    const supplierIds = Array.from(importedProductDetailsBySupplier.keys());
    await Promise.all(
      supplierIds.map(async (supplierId) => {
        const supplierSession = await getSession(supplierId);
        const productDetails =
          importedProductDetailsBySupplier.get(supplierId) ?? [];
        const importedProductDetailWithStatus =
          await addSupplierShopifyProductStatus(
            productDetails,
            supplierSession,
          );

        const updateStatusPromises = importedProductDetailWithStatus.map(
          (detail) =>
            updateRetailerProductStatus(
              retailerSession.id,
              detail.retailerShopifyProductId,
              detail.supplierProductStatus,
            ),
        );
        await Promise.all(updateStatusPromises);
      }),
    );
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to reinstate all imported products for the retailer.',
      handleReinstateImportedProductsForRetailer,
      {
        retailerId: retailerSession.id,
      },
    );
  }
}

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
      await handleReinstateImportedProductsForRetailer(session);
    }
    if (isSupplier) {
      await handleReinstateAllRetailerProductsForSupplier(session);
    }
    // handle this last
    await updateStoreStatus(sessionId, true);
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to reinstate the imported products for retailer/supplier.',
      handleAppReinstalled,
      {
        sessionId,
      },
    );
  }
}
