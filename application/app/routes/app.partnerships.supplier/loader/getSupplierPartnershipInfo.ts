import { PARTNERSHIP_REQUEST_TYPE } from '~/constants';
import { getAllSupplierPartnerships } from '~/services/models/partnership.server';
import { getAllPartnershipRequests } from '~/services/models/partnershipRequest.server';
import { SUPPLIER_ACCESS_REQUEST_STATUS } from '../constants';

async function getSupplierPartnershipInfo(sessionId: string) {
  const [partnershipRequests, partnerships] = await Promise.all([
    getAllPartnershipRequests(sessionId, PARTNERSHIP_REQUEST_TYPE.SUPPLIER),
    getAllSupplierPartnerships(sessionId),
  ]);

  const formattedPartnershipRequests = partnershipRequests.map((request) => {
    const { id, createdAt, priceLists, message, sender: supplier } = request;
    return {
      id,
      createdAt,
      name: supplier.userProfile?.name,
      websiteUrl: supplier.userProfile?.website,
      priceLists: priceLists.map((priceList) => ({
        id: priceList.id,
        name: priceList.name,
      })),
      message,
      status: request.status,
    };
  });

  const formattedSupplierPartnerships = partnerships.map((request) => {
    const { id, createdAt, priceLists, supplier, message } = request;
    return {
      id,
      createdAt,
      message,
      name: supplier.userProfile?.name,
      websiteUrl: supplier.userProfile?.website,
      priceLists: priceLists.map((priceList) => ({
        id: priceList.id,
        name: priceList.name,
      })),
      status: SUPPLIER_ACCESS_REQUEST_STATUS.APPROVED,
    };
  });
  const allSupplierPartnershipsAndRequests = formattedPartnershipRequests
    .concat(formattedSupplierPartnerships)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return allSupplierPartnershipsAndRequests;
}

export default getSupplierPartnershipInfo;
