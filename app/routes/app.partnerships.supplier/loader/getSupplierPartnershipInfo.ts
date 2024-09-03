import { PARTNERSHIP_REQUEST_TYPE } from '~/constants';
import { getAllSupplierPartnerships } from '~/services/models/partnership';
import { getAllPartnershipRequests } from '~/services/models/partnershipRequest';
import { errorHandler } from '~/services/util';
import { SUPPLIER_ACCESS_REQUEST_STATUS } from '../constants';

async function getSupplierPartnershipInfo(sessionId: string) {
  try {
    const [partnershipRequests, partnerships] = await Promise.all([
      getAllPartnershipRequests(sessionId, PARTNERSHIP_REQUEST_TYPE.RETAILER),
      // this may be confusing, suppliers initiate a retailer request (they want you to be a retailer)
      getAllSupplierPartnerships(sessionId),
    ]);

    const formattedPartnershipRequests = partnershipRequests.map((request) => {
      const { id, createdAt, priceLists } = request;
      const { sender: supplier } = request;
      return {
        id,
        createdAt,
        name: supplier.userProfile?.name,
        websiteUrl: supplier.userProfile?.website,
        priceLists: priceLists.map((priceList) => ({
          id: priceList.id,
          name: priceList.name,
        })),
        status: request.status,
      };
    });

    const formattedSupplierPartnerships = partnerships.map((request) => {
      const { id, createdAt, priceLists, supplier } = request;
      return {
        id,
        createdAt,
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
    console.log(allSupplierPartnershipsAndRequests);
    return allSupplierPartnershipsAndRequests;
  } catch (error) {
    throw errorHandler(
      error,
      'Could not get supplier partnership info',
      getSupplierPartnershipInfo,
      { sessionId },
    );
  }
}

export default getSupplierPartnershipInfo;
