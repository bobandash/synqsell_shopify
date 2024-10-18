import { useCallback, useMemo, type FC } from 'react';
import type {
  ProductPropsWithPositions,
  UpdateProductWholesalePrice,
  VariantWithPosition,
} from '../types';
import {
  BlockStack,
  IndexTable,
  InlineStack,
  Text,
  TextField,
  Thumbnail,
} from '@shopify/polaris';
import { useField } from '@shopify/react-form';
import {
  calculateRetailerPayment,
  calculateSupplierProfitForMarginPricing,
} from '../util';

type Props = {
  variant: VariantWithPosition;
  isWholesalePricing: boolean;
  margin: string;
  selectedResources: string[];
  product: ProductPropsWithPositions;
  primaryImage: string | React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  updateProductWholesalePrice: UpdateProductWholesalePrice;
};

const ProductTableRowSingleVariant: FC<Props> = ({
  variant,
  isWholesalePricing,
  selectedResources,
  margin,
  primaryImage,
  updateProductWholesalePrice,
  product,
}) => {
  const { title } = product;
  const { id, position, price, sku, wholesalePrice } = variant;
  const variantWholesalePrice = useField({
    value: wholesalePrice?.toString() ?? '',
    validates: [
      (value) => {
        const valueFloat = parseFloat(value);
        if (valueFloat < 0) {
          return 'Must not be less than 0.';
        } else if (valueFloat > parseFloat(price ?? '0')) {
          return 'Cannot exceed retail price.';
        } else if (!value) {
          return 'Not a valid price.';
        }
      },
    ],
  });

  const retailerPayment = useMemo(() => {
    const hasError = !!variantWholesalePrice.error;
    return calculateRetailerPayment({
      isWholesalePriceList: isWholesalePricing,
      price,
      margin,
      wholesalePrice: variantWholesalePrice.value,
      hasError,
    });
  }, [isWholesalePricing, margin, price, variantWholesalePrice]);

  const marginPricingProfit = useMemo(() => {
    return calculateSupplierProfitForMarginPricing({
      price,
      retailerPayment,
      isWholesalePriceList: isWholesalePricing,
    });
  }, [isWholesalePricing, price, retailerPayment]);

  const handleBlur = useCallback(() => {
    const error = variantWholesalePrice.runValidation();
    if (!error) {
      updateProductWholesalePrice(
        product.id,
        id,
        parseFloat(variantWholesalePrice.value),
      );
    }
  }, [id, product.id, updateProductWholesalePrice, variantWholesalePrice]);

  return (
    <IndexTable.Row
      rowType="data"
      id={id}
      position={position}
      selected={selectedResources.includes(id)}
    >
      <IndexTable.Cell scope={'row'}>
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <Thumbnail
            source={primaryImage}
            alt={`${title} image`}
            size={'small'}
          />
          <BlockStack>
            <Text as="span" variant="headingSm">
              {title}
            </Text>
            {sku && (
              <Text as="span" variant="headingSm">
                Sku: {sku}
              </Text>
            )}
          </BlockStack>
        </InlineStack>
      </IndexTable.Cell>
      <IndexTable.Cell>{price}</IndexTable.Cell>
      <IndexTable.Cell>{retailerPayment}</IndexTable.Cell>
      <IndexTable.Cell>
        {!isWholesalePricing ? (
          <Text as="p" variant="headingSm" tone="success">
            {marginPricingProfit}
          </Text>
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <TextField
              type="number"
              label="Variant Wholesale Price"
              labelHidden
              autoComplete="off"
              {...variantWholesalePrice}
              onBlur={handleBlur}
            />
          </div>
        )}
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default ProductTableRowSingleVariant;
