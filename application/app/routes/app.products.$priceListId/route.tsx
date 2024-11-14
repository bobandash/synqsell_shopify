import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { Button, InlineGrid, InlineStack, Page } from '@shopify/polaris';
import { StatusCodes } from 'http-status-codes';
import { authenticate } from '~/shopify.server';
import { convertFormDataToObject, isActionDataError } from '~/lib/utils';
import { createJSONError, getRouteError, logError } from '~/lib/utils/server';
import {
  isValidPriceList,
  userHasPriceList,
} from '~/services/models/priceList.server';
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
import type { PriceListWithAccess } from './loader';
import {
  getPriceListsWithAccessForSpecificSupplier,
  hasAccessToViewPriceList,
} from './loader';
import { importProductAction, type ImportProductFormData } from './actions';
import { INTENTS } from './constants';
import { getProductCardInfoFromPriceList } from './loader/getProductCardInfoForSpecificPriceList';
import type { ProductCardJSON } from './types';
import ProductCard from './components/ProductCard';
import { userHasStripePaymentMethod } from '~/services/models/stripeCustomerAccount.server';
import createHttpError from 'http-errors';

type ProductCardInfo = {
  products: ProductCardJSON[];
  nextCursor: string | null;
  prevCursor: string | null;
};

type LoaderData = {
  productCardInfo: ProductCardInfo;
  priceListsWithAccess: PriceListWithAccess[];
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
    const {
      session: { id: sessionId },
    } = await authenticate.admin(request);
    const priceListId = params.priceListId ?? '';
    const { searchParams } = new URL(request.url);
    const next = searchParams.get('next');
    const prev = searchParams.get('prev');
    const isReverseDirection = prev ? true : false;
    let cursor = next || prev || null;

    const [
      isValidPriceListId,
      hasAccessToPriceList,
      isUserPriceListOwner,
      userHasStripePayments,
    ] = await Promise.all([
      isValidPriceList(priceListId),
      hasAccessToViewPriceList(priceListId, sessionId),
      userHasPriceList(sessionId, priceListId),
      userHasStripePaymentMethod(sessionId),
    ]);

    if (isUserPriceListOwner) {
      throw new createHttpError.Unauthorized(
        "User cannot view and import products in the user's own price list.",
      );
    } else if (!userHasStripePayments) {
      throw new createHttpError.Unauthorized(
        'User does not have stripe payments set up to begin importing products.',
      );
    } else if (!isValidPriceListId) {
      throw new createHttpError.NotFound('Price list could not be found.');
    } else if (!hasAccessToPriceList) {
      throw new createHttpError.Unauthorized('Price list could not be found.');
    }

    const productCardInfo = await getProductCardInfoFromPriceList({
      priceListId,
      isReverseDirection,
      sessionId,
      ...(cursor && { cursor }),
    });
    const priceListsWithAccess =
      await getPriceListsWithAccessForSpecificSupplier(priceListId, sessionId);
    return json({ productCardInfo, priceListsWithAccess }, StatusCodes.OK);
  } catch (error) {
    logError(error, 'Loader: Products in Price List');
    throw getRouteError('Failed to load products in price list.', error);
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
      default:
        return createJSONError(
          `Intent ${intent} is not valid`,
          StatusCodes.NOT_IMPLEMENTED,
        );
    }
  } catch (error) {
    logError(error, 'Action: Admin Route');
    return getRouteError('Failed to process request.', error);
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

  useEffect(() => {
    if (!actionData) {
      return;
    }
    if (isActionDataError(actionData)) {
      shopify.toast.show(actionData.error.message, { isError: true });
    }
  }, [actionData]);

  // to render between different price lists in the ui
  const actionGroups = useMemo(() => {
    if (priceListsWithAccess.length === 0) {
      return undefined;
    }
    return [
      {
        title: 'Price List',
        onClick: (openActions: () => void) => {
          openActions();
        },
        actions: priceListsWithAccess.map((priceList) => ({
          content: priceList.name,
          onAction: () => {
            navigate(`/app/products/${priceList.id}`);
          },
        })),
      },
    ];
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
