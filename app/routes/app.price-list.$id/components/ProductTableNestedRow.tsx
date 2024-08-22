// component for product variants' nested row
import { BlockStack, IndexTable, Text, TextField } from "@shopify/polaris";
import type {
  ProductPropsWithPositions,
  UpdateProductWholesalePrice,
  VariantWithPosition,
} from "../types";
import { useCallback, useMemo, type FC } from "react";
import { useField } from "@shopify/react-form";
import {
  calculatePriceDifference,
  calculateRetailerPaymentGivenMargin,
} from "../util";

type Props = {
  product: ProductPropsWithPositions;
  variant: VariantWithPosition;
  selectedResources: string[];
  isWholesalePricing: boolean;
  margin: string;
  updateProductWholesalePrice: UpdateProductWholesalePrice;
};

const ProductTableNestedRow: FC<Props> = ({
  variant,
  product,
  selectedResources,
  isWholesalePricing,
  margin,
  updateProductWholesalePrice,
}) => {
  const { id, title, sku, price, wholesalePrice } = variant;
  const { position } = product;
  const variantWholesalePrice = useField({
    value: wholesalePrice?.toString() ?? "",
    validates: [
      (value) => {
        const valueFloat = parseFloat(value);
        if (valueFloat < 0) {
          return "Must not be less than 0.";
        } else if (valueFloat > parseFloat(price)) {
          return "Cannot exceed retail price.";
        } else if (!value) {
          return "Not a valid price.";
        }
      },
    ],
  });

  const retailerPayment = useMemo(() => {
    if (!isWholesalePricing) {
      return calculateRetailerPaymentGivenMargin(price, margin);
    }
    if (variantWholesalePrice.error) {
      return "N/A";
    }
    return calculatePriceDifference(price, variantWholesalePrice.value);
  }, [isWholesalePricing, margin, price, variantWholesalePrice]);

  const marginPricingProfit = useMemo(() => {
    if (isWholesalePricing) {
      return "N/A";
    }
    return calculatePriceDifference(price, retailerPayment);
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
      rowType="child"
      key={id}
      id={id}
      position={position}
      selected={selectedResources.includes(id)}
    >
      <IndexTable.Cell scope="row" headers={`${product.id}`}>
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
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" numeric>
          {price}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span">{retailerPayment}</Text>
      </IndexTable.Cell>
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

export default ProductTableNestedRow;
