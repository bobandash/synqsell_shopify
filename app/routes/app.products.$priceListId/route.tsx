import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Button, InlineGrid, InlineStack, Page } from '@shopify/polaris';
import { StatusCodes } from 'http-status-codes';
import { authenticate } from '~/shopify.server';
import { getJSONError } from '~/util';
import hasAccessToViewPriceList from './loader/util/hasAccessToViewPriceList';
import { isValidPriceList } from '~/services/models/priceList';
import {
  useLoaderData,
  useSearchParams,
  useRevalidator,
  useNavigate,
  useParams,
} from '@remix-run/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ProductCard from './components/ProductCard';
import { ChevronLeftIcon, ChevronRightIcon } from '@shopify/polaris-icons';
import { PaddedBox } from '~/components';
import {
  getPaginatedProductCardsInfo,
  getPriceListsWithAccess,
  type PriceListWithAccess,
  type ProductCardData,
} from './loader';
import { hasAccessToImportPriceList } from './loader/util';

type LoaderDataProps = {
  productCardInfo: {
    products: ProductCardData[];
    nextCursor: string | null;
    prevCursor: string | null;
  };
  priceListsWithAccess: PriceListWithAccess[];
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
      return json(
        { productCardInfo: [], priceListsWithAccess: [] },
        StatusCodes.NOT_IMPLEMENTED,
      );
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

    const [productCardInfo, priceListsWithAccess] = await Promise.all([
      getPaginatedProductCardsInfo({
        priceListId,
        isReverseDirection,
        sessionId,
        ...(cursor && { cursor }),
      }),
      getPriceListsWithAccess(priceListId, sessionId),
    ]);

    return json({ productCardInfo, priceListsWithAccess }, StatusCodes.OK);
  } catch (error) {
    throw getJSONError(error, 'products');
  }
};

const PriceListProducts = () => {
  const {
    productCardInfo: {
      products: initialProducts,
      nextCursor: initialNextCursor,
      prevCursor: initialPrevCursor,
    },
    priceListsWithAccess,
  } = useLoaderData<typeof loader>() as LoaderDataProps;

  const [products, setProducts] = useState(initialProducts);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [prevCursor, setPrevCursor] = useState(initialPrevCursor);
  const [, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const { priceListId } = useParams();
  const headerName = useMemo(() => {
    const priceList = priceListsWithAccess.filter(
      ({ id }) => id === priceListId,
    );
    if (priceListId && priceList.length === 1) {
      return `${priceList[0].name}'s Products`;
    }
    return `Products`;
  }, [priceListId, priceListsWithAccess]);

  // when data changes, update
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

  const actionGroups = useMemo(() => {
    return priceListsWithAccess.length > 0
      ? [
          {
            title: 'Price List',
            onClick: (openActions: () => void) => {
              openActions();
            },
            actions: priceListsWithAccess.map((priceList) => {
              return {
                content: priceList.name,
                onAction: () => {
                  navigate(`/app/products/${priceList.id}`);
                },
              };
            }),
          },
        ]
      : undefined;
  }, [priceListsWithAccess, navigate]);

  return (
    <Page
      title={headerName}
      subtitle="Discover products and boost your AOV!"
      actionGroups={actionGroups}
    >
      <InlineGrid columns={{ xs: 2, sm: 2, md: 3, lg: 4 }} gap="300">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </InlineGrid>
      <PaddedBox />
      {(prevCursor || nextCursor) && (
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
      )}
      <PaddedBox />
    </Page>
  );
};

export default PriceListProducts;
