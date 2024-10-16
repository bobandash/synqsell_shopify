export type ShopifyEvent = {
  shop_id: number;
  shop_domain: string;
  orders_requested: number[];
  customer: {
    id: number;
    email: string;
    phone: string;
  };
  data_request: {
    id: number;
  };
};
