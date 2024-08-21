// component for product variants' nested row
import { BlockStack, IndexTable, Text } from "@shopify/polaris";
import type { ProductPropsWithPositions, Variant } from "../types";
import type { FC } from "react";

type Props = {
  product: ProductPropsWithPositions;
  variant: Variant;
  selectedResources: string[];
};

const ProductTableNestedRow: FC<Props> = ({
  variant,
  product,
  selectedResources,
}) => {
  const { id, title, sku, price } = variant;
  const { position } = product;
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
        <Text as="span">Not Impl</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span">Not Impl</Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default ProductTableNestedRow;
