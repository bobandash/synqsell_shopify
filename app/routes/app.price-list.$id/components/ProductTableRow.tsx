import type { PriceListPricingStrategyProps } from "~/formData/pricelist";
import type { ProductPropsWithPositions, VariantWithPosition } from "../types";
import { getAllVariantSelectedStatus } from "../util";
import { round } from "~/routes/util";
import {
  BlockStack,
  IndexTable,
  InlineStack,
  Text,
  Thumbnail,
} from "@shopify/polaris";
import { Fragment } from "react/jsx-runtime";
import { type FC } from "react";
import { ImageIcon } from "@shopify/polaris-icons";

type ProductTableRowProps = {
  product: ProductPropsWithPositions;
  margin: string;
  pricingStrategy: PriceListPricingStrategyProps;
  selectedResources: string[];
  tableRows: VariantWithPosition[];
};

// !!! TODO: figure out how to tell the currency
const ProductTableRow: FC<ProductTableRowProps> = (props) => {
  const { product, margin, pricingStrategy, selectedResources, tableRows } =
    props;
  const { images, title, variants, totalVariants } = product;
  const primaryImage = images && images[0] ? images[0].originalSrc : ImageIcon;
  const isSingleVariant =
    variants.length === 1 && variants.length === totalVariants;

  const allVariantsSelected = getAllVariantSelectedStatus(
    variants,
    selectedResources,
  );

  const selectionRange = [
    tableRows.findIndex(({ id }) => variants[0].id === id),
    tableRows.findIndex(({ id }) => variants[variants.length - 1].id === id),
  ] as [number, number];

  if (isSingleVariant) {
    const firstVariant = variants[0];
    const retailerPayment =
      pricingStrategy === "MARGIN"
        ? round(Number(firstVariant.price) * (Number(margin) / 100), 2)
        : Number(firstVariant.price) - 0;
    const profit = round(Number(firstVariant.price) - retailerPayment, 2);

    return (
      <IndexTable.Row
        rowType="data"
        id={firstVariant.id}
        position={firstVariant.position}
        selected={selectedResources.includes(firstVariant.id)}
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
              {firstVariant.sku && (
                <Text as="span" variant="headingSm">
                  Sku: {firstVariant.sku}
                </Text>
              )}
            </BlockStack>
          </InlineStack>
        </IndexTable.Cell>
        <IndexTable.Cell>${firstVariant.price}</IndexTable.Cell>
        <IndexTable.Cell>${retailerPayment}</IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="p" variant="headingSm" tone="success">
            ${profit}
          </Text>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  }

  // case: multiple variants
  return (
    <Fragment key={product.id}>
      <IndexTable.Row
        rowType="data"
        selectionRange={selectionRange}
        id={product.id}
        position={product.position}
        selected={allVariantsSelected}
      >
        <IndexTable.Cell scope="col">
          <InlineStack gap="200" blockAlign="center" wrap={false}>
            <Thumbnail
              source={primaryImage}
              alt={`${title} image`}
              size={"small"}
            />

            <Text as="span" variant="headingSm">
              {title}
            </Text>
          </InlineStack>
        </IndexTable.Cell>
        <IndexTable.Cell />
        <IndexTable.Cell />
        <IndexTable.Cell />
      </IndexTable.Row>
      {variants.map(({ id, title, sku, price, position }) => {
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
      })}
    </Fragment>
  );
};

export default ProductTableRow;
