export type Variant = {
  id: string;
  title: string | null;
  sku: string | null;
  price: string | null;
  wholesalePrice: number | null;
};

export type VariantWithPosition = Variant & {
  position: number;
};

export type ProductProps = {
  id: string;
  title: string;
  images: {
    id: string;
    altText?: string;
    originalSrc: string;
  }[];
  storeUrl: string;
  totalVariants: number;
  variants: Variant[];
};

export type ProductPropsWithPositions = Omit<ProductProps, 'variants'> & {
  position: number;
  variants: VariantWithPosition[];
};

export type UpdateProductWholesalePrice = (
  productId: string,
  variantId: string,
  wholesalePrice: number,
) => void;
