import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { Button, InlineGrid, InlineStack, Page } from '@shopify/polaris';
import { StatusCodes } from 'http-status-codes';
import { authenticate } from '~/shopify.server';
import { convertFormDataToObject, getJSONError } from '~/util';
import hasAccessToViewPriceList from './loader/util/hasAccessToViewPriceList';
import { isValidPriceList } from '~/services/models/priceList';
import {
  useLoaderData,
  useSearchParams,
  useRevalidator,
  useNavigate,
  useParams,
  useNavigation,
  useActionData,
} from '@remix-run/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@shopify/polaris-icons';
import { PaddedBox } from '~/components';
import type { PriceListWithAccess, FulfillmentService } from './loader';
import { getPriceListsWithAccessForSpecificSupplier } from './loader';
import { hasAccessToImportPriceList } from './loader/util';
import { userGetFulfillmentService } from '~/services/models/fulfillmentService';
import { importProductAction, type ImportProductFormData } from './actions';
import { INTENTS } from './constants';
import { getProductCardInfoFromPriceList } from './loader/getProductCardInfoForSpecificPriceList';
import type { ProductCardJSON } from './types';
import ProductCard from './components/ProductCard';

type ProductCardInfo = {
  products: ProductCardJSON[];
  nextCursor: string | null;
  prevCursor: string | null;
};

type LoaderData = {
  productCardInfo: ProductCardInfo;
  priceListsWithAccess: PriceListWithAccess[];
  fulfillmentService: FulfillmentService;
};

type ImportProductAction = {
  message: string;
  productId: string;
};

type NotImplementedAction = {
  message: string;
};

type ActionData = ImportProductAction | NotImplementedAction | undefined;

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { priceListId } = params;
    const {
      session: { id: sessionId },
    } = await authenticate.admin(request);

    // cursor logic
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
    const fulfillmentService = await userGetFulfillmentService(sessionId);
    if (!priceListId) {
      return json(
        {
          productCardInfo: {
            products: [],
            nextCursor: null,
            prevCursor: null,
          } as ProductCardInfo,
          priceListsWithAccess: [] as PriceListWithAccess[],
          fulfillmentService: fulfillmentService,
        },
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

    let productCardInfo;
    if (priceListId) {
      productCardInfo = await getProductCardInfoFromPriceList({
        priceListId,
        isReverseDirection,
        sessionId,
        ...(cursor && { cursor }),
      });
    }
    const priceListsWithAccess =
      await getPriceListsWithAccessForSpecificSupplier(priceListId, sessionId);
    return json(
      { productCardInfo, priceListsWithAccess, fulfillmentService },
      StatusCodes.OK,
    );
  } catch (error) {
    throw getJSONError(error, 'products');
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const {
      session: { id: sessionId },
      admin: { graphql },
    } = await authenticate.admin(request);
    let formData = await request.formData();
    const intent = formData.get('intent');
    const formDataObject = convertFormDataToObject(formData);
    switch (intent) {
      case INTENTS.IMPORT_PRODUCT:
        const data = formDataObject as ImportProductFormData;
        return await importProductAction(data, sessionId, graphql);
    }
    return json({ message: 'Not Implemented' }, StatusCodes.NOT_IMPLEMENTED);
  } catch (error) {
    console.error(error);
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
    fulfillmentService,
  } = useLoaderData<typeof loader>() as LoaderData;
  const actionData = useActionData<typeof action>() as ActionData;

  const [products, setProducts] = useState<ProductCardJSON[]>(initialProducts);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [prevCursor, setPrevCursor] = useState(initialPrevCursor);
  const [submittingProductIds, setSubmittingProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const { priceListId } = useParams();
  const navigation = useNavigation();
  const headerName = useMemo(() => {
    const priceList = priceListsWithAccess.filter(
      ({ id }) => id === priceListId,
    );
    if (priceListId && priceList.length === 1) {
      return `${priceList[0].name}'s Price List`;
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

  // optimistically render the submitting status for product import
  useEffect(() => {
    const productId = (navigation?.formData?.get('productId') as string) ?? '';
    if (productId) {
      setSubmittingProductIds((prev) => new Set(prev).add(productId));
    }
  }, [navigation]);

  useEffect(() => {
    if (
      navigation.state === 'idle' &&
      actionData &&
      'productId' in actionData
    ) {
      setSubmittingProductIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(actionData.productId);
        return newSet;
      });
    }
  }, [navigation, actionData]);

  // to render between different price lists in the ui
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
          <ProductCard
            key={product.id}
            product={product}
            fulfillmentService={fulfillmentService}
            isSubmitting={submittingProductIds.has(product.id)}
          />
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
