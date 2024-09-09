export type ProductCard = {
  id: string;
  priceListId: string;
  createdAt: Date;
  title: string;
  mediaId: string | null;
  mediaAlt: string | null;
  mediaImageUrl: string | null;
  variantsCount: number;
  onlineStoreUrl: string | null;
  variants: VariantProductCard[];
  brandName: string;
  currencySign: string;
};

export type ProductCardJSON = Omit<ProductCard, 'createdAt'> & {
  createdAt: string;
};

export type VariantProductCard = {
  id: string;
  shopifyVariantId: string;
  productId: string;
  shopifyProductId: string;
  retailPrice: string;
  retailerPayment: string | null;
  supplierProfit: string | null;
};
