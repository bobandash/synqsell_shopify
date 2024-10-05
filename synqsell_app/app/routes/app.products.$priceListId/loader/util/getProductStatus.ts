import { PRODUCT_STATUS } from '../../constants';

function getProductStatus(
  isImported: boolean,
  hasPartnershipRequest: boolean,
  hasAccessToImport: boolean,
) {
  if (isImported) {
    return PRODUCT_STATUS.IMPORTED;
  } else if (hasPartnershipRequest) {
    return PRODUCT_STATUS.REQUESTED_ACCESS;
  } else if (!hasAccessToImport) {
    return PRODUCT_STATUS.NO_ACCESS_REQUEST;
  }
  return PRODUCT_STATUS.ACCESS_NOT_IMPORTED;
}

export default getProductStatus;
