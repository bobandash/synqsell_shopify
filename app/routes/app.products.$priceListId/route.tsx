import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Button, InlineGrid, InlineStack, Page } from '@shopify/polaris';
import { StatusCodes } from 'http-status-codes';
import { authenticate } from '~/shopify.server';
import { getJSONError } from '~/util';
import hasAccessToViewPriceList from './loader/hasAccessToViewPriceList';
import { hasAccessToImportPriceList } from './loader';
import { isValidPriceList } from '~/services/models/priceList';
import {
  getPaginatedProductCardsInfo,
  type ProductCardData,
} from './loader/getProductCardInfo';
import {
  useLoaderData,
  useSearchParams,
  useRevalidator,
} from '@remix-run/react';
import { useCallback, useEffect, useState } from 'react';
import ProductCard from './components/ProductCard';
import { ChevronLeftIcon, ChevronRightIcon } from '@shopify/polaris-icons';
import { PaddedBox } from '~/components';

type LoaderDataProps = {
  products: ProductCardData[];
  nextCursor: string | null;
  prevCursor: string | null;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { priceListId } = params;
    const admin = await authenticate.admin(request);
    const {
      session: { id: sessionId },
    } = admin;
    const { searchParams } = new URL(request.url);
    const next = searchParams.get('next');
    const prev = searchParams.get('prev');
    const isReverseDirection = prev ? true : false;
    let cursor = null;
    if (next) {
      cursor = next;
    } else if (prev) {
      cursor = prev;
    }

    // TODO: implement fetch all product data
    if (!priceListId) {
      return json({ products: [] }, StatusCodes.NOT_IMPLEMENTED);
    }
    // case: searching for products in a specific price list
    const priceListExists = isValidPriceList(priceListId);
    if (!priceListExists) {
      throw json(
        { error: 'Price list could not be found.' },
        StatusCodes.NOT_FOUND,
      );
    }
    const [hasAccessToView, hasAccessToImport] = await Promise.all([
      hasAccessToViewPriceList(priceListId, sessionId),
      hasAccessToImportPriceList(priceListId, sessionId),
    ]);

    if (!hasAccessToImport && !hasAccessToView) {
      throw json(
        {
          error: 'User is unauthorized to view products with this price list.',
        },
        StatusCodes.UNAUTHORIZED,
      );
    }

    const paginatedInfo = await getPaginatedProductCardsInfo({
      priceListId,
      isReverseDirection,
      sessionId,
      ...(cursor && { cursor }),
    });
    return json(paginatedInfo, StatusCodes.OK);
  } catch (error) {
    throw getJSONError(error, 'products');
  }
};

const PriceListProducts = () => {
  const {
    products: initialProducts,
    nextCursor: initialNextCursor,
    prevCursor: initialPrevCursor,
  } = useLoaderData<typeof loader>() as LoaderDataProps;

  const [products, setProducts] = useState(initialProducts);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [prevCursor, setPrevCursor] = useState(initialPrevCursor);
  const [, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();

  useEffect(() => {
    setProducts(initialProducts);
    setNextCursor(initialNextCursor);
    setPrevCursor(initialPrevCursor);
  }, [initialProducts, initialNextCursor, initialPrevCursor]);

  const navigateNextCursor = useCallback(() => {
    if (nextCursor) {
      setSearchParams({ next: nextCursor });
      revalidator.revalidate();
    }
  }, [nextCursor, setSearchParams, revalidator]);

  const navigatePrevCursor = useCallback(() => {
    if (prevCursor) {
      setSearchParams({ prev: prevCursor });
      revalidator.revalidate();
    }
  }, [prevCursor, setSearchParams, revalidator]);

  return (
    <Page
      title="Products"
      subtitle="Discover products that may interest your customers and boost your AOV!"
    >
      <InlineGrid columns={{ xs: 2, sm: 2, md: 3, lg: 4 }} gap="300">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </InlineGrid>
      <PaddedBox />
      <InlineStack gap={'200'} align={'center'}>
        <Button
          icon={ChevronLeftIcon}
          disabled={!prevCursor}
          onClick={navigatePrevCursor}
        />
        <Button
          icon={ChevronRightIcon}
          disabled={!nextCursor}
          onClick={navigateNextCursor}
        />
      </InlineStack>
      <PaddedBox />
    </Page>
  );
};

export default PriceListProducts;
