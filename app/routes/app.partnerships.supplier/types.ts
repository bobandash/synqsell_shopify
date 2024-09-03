import type { SupplierAccessRequestStatusProps } from './constants';

export type RowData = {
  id: string;
  createdAt: string;
  name: string;
  websiteUrl: string;
  priceLists: {
    id: string;
    name: string;
  }[];
  status: SupplierAccessRequestStatusProps;
  message: string;
};
