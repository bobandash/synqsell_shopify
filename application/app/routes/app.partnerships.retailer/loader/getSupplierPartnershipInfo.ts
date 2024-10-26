import { PARTNERSHIP_REQUEST_TYPE, ROLES } from '~/constants';
import { getAllPartnerships } from '~/services/models/partnership';
import { getAllPartnershipRequests } from '~/services/models/partnershipRequest';
import { errorHandler } from '~/lib/utils/server';
import { RETAILER_ACCESS_REQUEST_STATUS } from '../constants';

async function getSupplierPartnershipInfo(sessionId: string) {
  try {
    const [partnershipRequests, partnerships] = await Promise.all([
      getAllPartnershipRequests(sessionId, PARTNERSHIP_REQUEST_TYPE.RETAILER), // when they request to be a retailer for your products
      getAllPartnerships(sessionId, ROLES.SUPPLIER), // when you are the supplier
    ]);

    const formattedPartnershipRequests = partnershipRequests.map((request) => {
      const { id, createdAt, priceLists, message, sender: retailer } = request;
      return {
        id,
        createdAt,
        name: retailer.userProfile?.name,
        websiteUrl: retailer.userProfile?.website,
        priceLists: priceLists.map((priceList) => ({
          id: priceList.id,
          name: priceList.name,
        })),
        message,
        status: request.status,
      };
    });

    const formattedPartnerships = partnerships.map((request) => {
      const { id, createdAt, priceLists, retailer, message } = request;
      return {
        id,
        createdAt,
        message,
        name: retailer.userProfile?.name,
        websiteUrl: retailer.userProfile?.website,
        priceLists: priceLists.map((priceList) => ({
          id: priceList.id,
          name: priceList.name,
        })),
        status: RETAILER_ACCESS_REQUEST_STATUS.APPROVED,
      };
    });
    const allRetailerPartnershipsAndRequests = formattedPartnershipRequests
      .concat(formattedPartnerships)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return allRetailerPartnershipsAndRequests;
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
