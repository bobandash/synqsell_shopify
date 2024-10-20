// In order to use, must pass custom logic to handle shopify product resource picker
// e.g. const onQueryFocus =
// async () => {
//     const products = await shopify.resourcePicker({
//       type: "product",
//       multiple: true,
//       action: "select",
//     }
//     do something with products
// }

import { Filters } from "@shopify/polaris";

const ProductFilterControl = ({
  onQueryFocus,
}: {
  onQueryFocus: () => void;
}) => {
  return (
    <Filters
      queryValue={""}
      filters={[]}
      appliedFilters={[]}
      onQueryChange={() => {}}
      onQueryClear={() => {}}
      onClearAll={() => {}}
      hideFilters={true}
      queryPlaceholder="Add Products"
      onQueryFocus={onQueryFocus}
    />
  );
};

export default ProductFilterControl;
