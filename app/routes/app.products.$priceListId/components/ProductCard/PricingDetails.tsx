import { useCallback } from 'react';
import { BlockStack, Divider, Icon, InlineStack, Text } from '@shopify/polaris';
import type { ProductCardData } from '../../loader/getProductCardInfo';
import type { FC } from 'react';
import sharedStyles from '~/shared.module.css';
import {
  calculatePriceDifference,
  calculateRetailerPaymentGivenMargin,
} from '~/routes/util';
import { LockIcon } from '@shopify/polaris-icons';
import { useLocation, useSubmit as useRemixSubmit } from '@remix-run/react';
import { INTENTS } from '../../constants';
import type { FulfillmentService } from '../../types';

type Props = {
  product: ProductCardData;
  fulfillmentService: FulfillmentService;
};

const PricingDetails: FC<Props> = ({ product, fulfillmentService }) => {
  const { priceList, variants } = product;
  const isPrivate =
    (priceList.isGeneral && priceList.requiresApprovalToImport) ||
    !priceList.isGeneral;
  const firstVariant = variants[0];
  const { margin } = priceList;
  const { price, wholesalePrice } = firstVariant;
  const hasAccessToImport = priceList.margin || firstVariant.wholesalePrice;

  // calculations for cost and profit
  let cost = null;
  let profit = null;
  if (margin) {
    profit = calculateRetailerPaymentGivenMargin(price, margin);
    cost = calculatePriceDifference(price, profit);
  } else if (wholesalePrice) {
    cost = calculatePriceDifference(price, wholesalePrice);
    profit = wholesalePrice;
  }

  const { pathname } = useLocation();
  const remixSubmit = useRemixSubmit();

  const handleImportProduct = useCallback(() => {
    remixSubmit(
      {
        productId: product.id,
        intent: INTENTS.IMPORT_PRODUCT,
        fulfillmentServiceId: fulfillmentService.fulfillmentServiceId,
      },
      {
        method: 'post',
        action: pathname,
      },
    );
  }, [product, pathname, remixSubmit, fulfillmentService]);

  if (isPrivate && !hasAccessToImport) {
    return (
      <>
        <BlockStack gap="025">
          <Text as="p" fontWeight="medium">
            Retail: ${price}
          </Text>
          <InlineStack>
            <Text as="p" fontWeight="medium">
              Cost:
            </Text>
            <div>
              <Icon source={LockIcon} tone="base" />
            </div>
          </InlineStack>
        </BlockStack>
        <Divider />
        <div className={`${sharedStyles['orange-container']}`}>
          <InlineStack>
            <Text as="p" fontWeight="medium">
              Your Profit:
            </Text>
            <div>
              <Icon source={LockIcon} tone="base" />
            </div>
          </InlineStack>
        </div>
        <button className={`${sharedStyles['orange']} ${sharedStyles['btn']}`}>
          <Text as="p" variant="bodySm" fontWeight="medium">
            Request Price List
          </Text>
        </button>
      </>
    );
  }

  return (
    <>
      <BlockStack gap="025">
        <Text as="p" fontWeight="medium">
          Retail: ${price}
        </Text>
        <Text as="p" fontWeight="medium">
          Cost: ${cost}
        </Text>
      </BlockStack>
      <Divider />
      <div className={`${sharedStyles['green-container']}`}>
        <Text as="p" fontWeight="medium">
          Your Profit: ${profit}
        </Text>
      </div>
      <button
        className={`${sharedStyles['green']} ${sharedStyles['btn']}`}
        onClick={handleImportProduct}
      >
        <Text as="p" variant="bodySm" fontWeight="medium">
          Import Product
        </Text>
      </button>
    </>
  );
};

export default PricingDetails;
