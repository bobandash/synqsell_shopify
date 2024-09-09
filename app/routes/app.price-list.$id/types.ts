import type { PriceListPricingStrategyProps } from './formData/pricelist';

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

export type Settings = {
  id: string;
  createdAt: string;
  name: string;
  isGeneral: boolean;
  requiresApprovalToImport: boolean;
  pricingStrategy: PriceListPricingStrategyProps;
  supplierId: string;
  margin: number;
};

export type ProductCoreData = {
  shopifyProductId: string;
  variants: {
    shopifyVariantId: string;
    retailPrice: string;
    retailerPayment: string;
    supplierProfit: string;
  }[];
};

export type PriceListSettings = {
  margin?: number | undefined;
  requiresApprovalToImport?: boolean | undefined;
  name: string;
  isGeneral: boolean;
  pricingStrategy: string;
};

export type PriceListActionData = {
  settings: PriceListSettings;
  products: ProductCoreData[];
  partnerships: string[]; // string of ids
};

// for loader data
export type VariantData = {
  sku: string;
  title: string;
  id: string;
  shopifyVariantId: string;
  productId: string;
  retailPrice: string;
  retailerPayment: string;
  supplierProfit: string;
};

export type ProductData = {
  shopifyProductId: string;
  title: string;
  mediaId: string;
  mediaAlt: string;
  mediaImageUrl: string;
  variantsCount: number;
  onlineStoreUrl: string | null;
  id: string;
  priceListId: string;
  createdAt: Date;
  variants: VariantData[];
};

export type ProductDataJSON = Omit<ProductData, 'createdAt'> & {
  createdAt: string;
};
