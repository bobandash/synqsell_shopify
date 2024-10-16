export type ShopifyEvent = {
  shop_id: number;
  shop_domain: string;
  orders_to_redact: number[];
  customer: {
    id: number;
    email: string;
    phone: string;
  };
};
