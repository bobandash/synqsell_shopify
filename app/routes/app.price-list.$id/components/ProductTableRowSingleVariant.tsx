import { useMemo, type FC } from "react";
import type { VariantWithPosition } from "../types";
import {
  BlockStack,
  IndexTable,
  InlineStack,
  Text,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import {
  calculatePriceDifference,
  calculateRetailerPaymentGivenMargin,
} from "../util";
import { useField } from "@shopify/react-form";

type Props = {
  variant: VariantWithPosition;
  isWholesalePricing: boolean;
  margin: string;
  selectedResources: string[];
  title: string;
  primaryImage: string | React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
};

const ProductTableRowSingleVariant: FC<Props> = ({
  variant,
  isWholesalePricing,
  selectedResources,
  margin,
  primaryImage,
  title,
}) => {
  const { id, position, price, sku, wholesalePrice } = variant;
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

  return (
    <IndexTable.Row
      rowType="data"
      id={id}
      position={position}
      selected={selectedResources.includes(id)}
    >
      <IndexTable.Cell scope={"row"}>
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <Thumbnail
            source={primaryImage}
            alt={`${title} image`}
            size={"small"}
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
            />
          </div>
        )}
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default ProductTableRowSingleVariant;
