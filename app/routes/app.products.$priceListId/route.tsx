// there's a few things that need to be done
// fetching the generic products and fetching the actual products

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Page } from '@shopify/polaris';
import { StatusCodes } from 'http-status-codes';
import { authenticate } from '~/shopify.server';
import { getJSONError } from '~/util';
import hasAccessToViewPriceList from './loader/hasAccessToViewPriceList';
import { hasAccessToImportPriceList } from './loader';
import { isValidPriceList } from '~/services/models/priceList';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { priceListId } = params;
    const admin = await authenticate.admin(request);
    const {
      session: { id: sessionId },
    } = admin;
    // TODO: implement fetch all product data
    if (!priceListId) {
      return json({ products: [] }, StatusCodes.NOT_IMPLEMENTED);
    }

    // case: searching for products in a specific price list
    const priceListExists = isValidPriceList(priceListId);
    if (!priceListExists) {
      throw json(
        { error: 'Price list could not be found' },
        StatusCodes.NOT_FOUND,
      );
    }

    const [hasAccessToView, hasAccessToImport] = await Promise.all([
      hasAccessToViewPriceList(priceListId, sessionId),
      hasAccessToImportPriceList(priceListId, sessionId),
    ]);

    if (!hasAccessToImport && !hasAccessToView) {
      throw json(
        { error: 'User is unauthorized to view products with this price list' },
        StatusCodes.UNAUTHORIZED,
      );
    }

    const products = [];

    return json(products, StatusCodes.OK);
  } catch (error) {
    throw getJSONError(error, 'products');
  }
};

const PriceListProducts = () => {
  return (
    <Page
      title="Products"
      subtitle="Discover products that may interest your customers and boost your AOV!"
    ></Page>
  );
};

export default PriceListProducts;
