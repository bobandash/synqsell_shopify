import { BlockStack, Divider, Icon, InlineStack, Text } from '@shopify/polaris';
import type { FC } from 'react';
import sharedStyles from '~/shared.module.css';
import { LockIcon } from '@shopify/polaris-icons';
import type { VariantProductCard } from '../../types';

type Props = {
  variant: VariantProductCard;
};

const PricingDetails: FC<Props> = ({ variant }) => {
  const { retailPrice, retailerPayment, supplierProfit } = variant;

  if (!retailerPayment && !supplierProfit) {
    return (
      <>
        <BlockStack gap="025">
          <Text as="p" fontWeight="medium">
            Retail: ${retailPrice}
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
            <Text as="p" fontWeight="bold">
              Your Profit
            </Text>
            <div>
              <Icon source={LockIcon} tone="base" />
            </div>
          </InlineStack>
        </div>
      </>
    );
  }

  return (
    <>
      <BlockStack gap="025">
        <Text as="p" fontWeight="medium">
          Retail: ${retailPrice}
        </Text>
        <Text as="p" fontWeight="medium">
          Cost: ${supplierProfit}
        </Text>
      </BlockStack>
      <Divider />
      <div className={`${sharedStyles['green-container']}`}>
        <Text as="p" fontWeight="bold">
          Your Profit: ${retailerPayment}
        </Text>
      </div>
    </>
  );
};

export default PricingDetails;
