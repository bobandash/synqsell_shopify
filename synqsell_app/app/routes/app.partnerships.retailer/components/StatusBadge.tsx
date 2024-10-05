import { Badge } from '@shopify/polaris';
import {
  RETAILER_ACCESS_REQUEST_STATUS,
  type SupplierAccessRequestStatusProps,
} from '../constants';

const StatusBadge = ({
  status,
}: {
  status: SupplierAccessRequestStatusProps;
}) => {
  if (status === RETAILER_ACCESS_REQUEST_STATUS.APPROVED) {
    return <Badge tone={'success'}>Approved</Badge>;
  } else if (status === RETAILER_ACCESS_REQUEST_STATUS.PENDING) {
    return <Badge tone={'attention'}>Pending</Badge>;
  }
  return null;
};

export default StatusBadge;