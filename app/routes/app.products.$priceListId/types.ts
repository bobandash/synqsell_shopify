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
  priceListId: string;
};

export type ProductCardJSON = Omit<ProductCard, 'createdAt'> & {
  createdAt: string;
};

type VariantProductCard = {
  id: string;
  shopifyVariantId: string;
  productId: string;
  shopifyProductId: string;
  retailPrice: string | null;
  retailerPayment: string | null;
  supplierProfit: string | null;
};
