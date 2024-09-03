import { errorHandler } from '../util';
import db from '../../db.server';
import { deletePartnershipRequestsTx } from '../models/partnershipRequest';
import {
  PARTNERSHIP_REQUEST_TYPE,
  type PartnershipRequestTypeProps,
} from '~/constants';
import { createPartnershipsTx } from '../models/partnership';

async function approvePartnershipRequestBulk(
  partnershipRequestIds: string[],
  type: PartnershipRequestTypeProps,
) {
  try {
    const partnershipRequests = await db.partnershipRequest.findMany({
      where: {
        id: {
          in: partnershipRequestIds,
        },
      },
      include: {
        priceLists: true,
      },
    });

    const data = partnershipRequests.map((request) => {
      // partnership request type === retailer means that the retailer (sender) sent a request to partner with a supplier (recipient)
      const retailerId =
        type === PARTNERSHIP_REQUEST_TYPE.RETAILER
          ? request.senderId
          : request.recipientId;
      const supplierId =
        type === PARTNERSHIP_REQUEST_TYPE.RETAILER
          ? request.recipientId
          : request.senderId;

      return {
        retailerId,
        supplierId,
        message: request.message,
        priceListIds: request.priceLists.map(({ id }) => id),
      };
    });

    const newPartnerships = await db.$transaction(async (tx) => {
      // TODO: there is an edge case if both requests are submitted, like say a supplier submits a request and a retailer submits a request at the same time
      await deletePartnershipRequestsTx(tx, partnershipRequestIds);
      const newPartnerships = await createPartnershipsTx(tx, data);
      return newPartnerships;
    });
    return newPartnerships;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to approve partnership requests in bulk.',
      approvePartnershipRequestBulk,
      { partnershipRequestIds },
    );
  }
}

export default approvePartnershipRequestBulk;
