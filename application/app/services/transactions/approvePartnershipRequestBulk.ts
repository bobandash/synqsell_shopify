import db from '~/db.server';
import { deletePartnershipRequestsTx } from '../models/partnershipRequest.server';
import {
  PARTNERSHIP_REQUEST_TYPE,
  type PartnershipRequestTypeOptions,
} from '~/constants';
import { createPartnershipsTx } from '../models/partnership.server';
import type { Prisma } from '@prisma/client';

type PartnershipRequest = Prisma.PartnershipRequestGetPayload<{
  include: {
    priceLists: true;
  };
}>;

async function getOppositeSidePartnershipRequestIds(
  partnershipRequests: PartnershipRequest[],
  type: PartnershipRequestTypeOptions,
) {
  // An edge case occurs when both a retailer and a supplier submit partnership requests simultaneously.
  // In this situation, both requests appear in the partnership tab by default. To handle this, you should
  // delete the request from the side that did not approve the partnership. For now, the default behavior is
  // to remove the request from the opposite side if one request has been approved. This approach is used
  // because we don't have a strategy for cases where the requested or granted permissions differ.
  const oppositeSidePartnershipRequestData = partnershipRequests.map(
    (request) => {
      return {
        recipientId: request.senderId,
        senderId: request.recipientId,
        type:
          type === PARTNERSHIP_REQUEST_TYPE.RETAILER
            ? PARTNERSHIP_REQUEST_TYPE.SUPPLIER
            : PARTNERSHIP_REQUEST_TYPE.RETAILER,
      };
    },
  );
  const oppositeSidePartnershipRequestIdsToDelete = (
    await Promise.all(
      oppositeSidePartnershipRequestData.map((request) =>
        db.partnershipRequest.findFirst({
          where: {
            ...request,
          },
        }),
      ),
    )
  )
    .filter((value) => value !== null)
    .map(({ id }) => id);

  return oppositeSidePartnershipRequestIdsToDelete;
}

async function approvePartnershipRequestBulk(
  partnershipRequestIds: string[],
  type: PartnershipRequestTypeOptions,
) {
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
  const oppositeSidePartnershipRequestIds =
    await getOppositeSidePartnershipRequestIds(partnershipRequests, type);

  const data = partnershipRequests.map((request) => {
    // partnership request type === retailer means that the retailer (sender) sent a request to partner with a supplier (recipient)
    const retailerId =
      type === PARTNERSHIP_REQUEST_TYPE.RETAILER
        ? request.recipientId
        : request.senderId;
    const supplierId =
      type === PARTNERSHIP_REQUEST_TYPE.RETAILER
        ? request.senderId
        : request.recipientId;

    return {
      retailerId,
      supplierId,
      message: request.message,
      priceListIds: request.priceLists.map(({ id }) => id),
    };
  });

  const newPartnerships = await db.$transaction(async (tx) => {
    await deletePartnershipRequestsTx(tx, partnershipRequestIds);
    await deletePartnershipRequestsTx(tx, oppositeSidePartnershipRequestIds);
    const newPartnerships = await createPartnershipsTx(tx, data);
    return newPartnerships;
  });
  return newPartnerships;
}

export default approvePartnershipRequestBulk;
