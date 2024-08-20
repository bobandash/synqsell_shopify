export type Variant = {
  id: string;
  title: string;
  sku: string;
  inventoryQuantity: number;
  price: string;
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
  status: string;
  totalInventory: number;
  totalVariants: number;
  storeUrl: string | null;
  variants: Variant[];
};

export type ProductPropsWithPositions = Omit<ProductProps, "variants"> & {
  position: number;
  variants: VariantWithPosition[];
};
