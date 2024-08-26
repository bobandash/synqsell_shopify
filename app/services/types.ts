// Core product props required to query product data from shopify
export type CoreProductProps = {
  id: string;
  variants: {
    wholesalePrice: number | null;
    id: string;
  }[];
};