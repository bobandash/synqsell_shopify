import type {
  PartnershipRequestStatusProps,
  PartnershipRequestTypeProps,
} from '~/constants';
import { errorHandler } from '../util';
import db from '~/db.server';

type CreatePartnershipRequestProps = {
  priceListIds: string[];
  recipientId: string;
  senderId: string;
  message: string;
  type: PartnershipRequestTypeProps;
  status: PartnershipRequestStatusProps;
};

export async function createPartnershipRequest(
  props: CreatePartnershipRequestProps,
) {
  try {
    const { priceListIds, recipientId, senderId, message, type, status } =
      props;
    // TODO: add validation to this, you should not be able to create a request if one already exists
    const partnershipRequest = await db.partnershipRequest.create({
      data: {
        senderId,
        recipientId,
        message,
        type,
        status,
        priceLists: {
          connect: priceListIds.map((id) => ({ id })),
        },
      },
    });
    return partnershipRequest;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create partnership request.',
      createPartnershipRequest,
      { props },
    );
  }
}

export async function hasPartnershipRequest(
  priceListId: string,
  senderId: string,
  type: PartnershipRequestTypeProps,
) {
  try {
    const partnershipRequest = await db.partnershipRequest.findFirst({
      where: {
        senderId,
        type,
        priceLists: {
          some: {
            id: priceListId,
          },
        },
      },
    });

    if (partnershipRequest) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if partnership request exists.',
      hasPartnershipRequest,
      { priceListId, senderId },
    );
  }
}

export async function getPartnershipRequest(
  priceListId: string,
  senderId: string,
  type: PartnershipRequestTypeProps,
) {
  try {
    const partnershipRequest = await db.partnershipRequest.findFirstOrThrow({
      where: {
        senderId,
        type,
        priceLists: {
          some: {
            id: priceListId,
          },
        },
      },
    });

    return partnershipRequest;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve partnership request.',
      getPartnershipRequest,
      { priceListId, senderId },
    );
  }
}
