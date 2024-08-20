import type { IndexTableHeading } from "@shopify/polaris/build/ts/src/components/IndexTable";
import type { NonEmptyArray } from "@shopify/polaris/build/ts/src/types";

const PriceListTable = () => {
  const columnHeadings: NonEmptyArray<IndexTableHeading> = [
    { title: "Product", id: "column-header--product" },
    {
      id: "column-header--price",
      title: "Price",
    },
    {
      id: "column-header--retailer-payment",
      title: "Retailer Payment",
    },
    {
      id: "column-header--profit-wholesale-price",
      title: "Profit / Wholesale Price",
    },
  ];

  return <div></div>;
};

export default PriceListTable;
