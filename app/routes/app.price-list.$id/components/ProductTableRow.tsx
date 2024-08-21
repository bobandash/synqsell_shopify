import type { ProductPropsWithPositions, VariantWithPosition } from "../types";
import { getAllVariantSelectedStatus } from "../util";
import { IndexTable, InlineStack, Text, Thumbnail } from "@shopify/polaris";
import { Fragment } from "react/jsx-runtime";
import { type FC } from "react";
import { ImageIcon } from "@shopify/polaris-icons";
import ProductTableNestedRow from "./ProductTableNestedRow";
import ProductTableRowSingleVariant from "./ProductTableRowSingleVariant";

type ProductTableRowProps = {
  product: ProductPropsWithPositions;
  margin: string;
  isWholesalePricing: boolean;
  selectedResources: string[];
  tableRows: VariantWithPosition[];
};

// !!! TODO: figure out how to tell the currency
const ProductTableRow: FC<ProductTableRowProps> = (props) => {
  const { product, margin, isWholesalePricing, selectedResources, tableRows } =
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
    return (
      <ProductTableRowSingleVariant
        variant={variants[0]}
        isWholesalePricing={isWholesalePricing}
        margin={margin}
        selectedResources={selectedResources}
        primaryImage={primaryImage}
        title={title}
      />
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
      {variants.map((variant) => (
        <ProductTableNestedRow
          isWholesalePricing={isWholesalePricing}
          variant={variant}
          product={product}
          key={variant.id}
          selectedResources={selectedResources}
          margin={margin}
        />
      ))}
    </Fragment>
  );
};

export default ProductTableRow;
