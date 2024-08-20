import { type IndexTableRowProps } from "@shopify/polaris";
import { type Variant } from "../types";

// checks whether or not all variants inside a specific product are selected
function getAllVariantSelectedStatus(
  variants: Variant[],
  selectedResources: string[],
) {
  let allSelected: IndexTableRowProps["selected"] = false;
  const someProductsSelected = variants.some(({ id }) =>
    selectedResources.includes(id),
  );
  const allProductsSelected = variants.every(({ id }) =>
    selectedResources.includes(id),
  );

  if (allProductsSelected) {
    allSelected = true;
  } else if (someProductsSelected) {
    allSelected = "indeterminate";
  }

  return allSelected;
}

export default getAllVariantSelectedStatus;
