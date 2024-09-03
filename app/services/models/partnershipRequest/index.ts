import {
  type PartnershipRequestStatusProps,
  type PartnershipRequestTypeProps,
} from '~/constants';
import { errorHandler } from '../../util';
import db from '~/db.server';

type CreatePartnershipRequestProps = {
  priceListIds: string[];
  recipientId: string;
  senderId: string;
  message: string;
  type: PartnershipRequestTypeProps;
  status: PartnershipRequestStatusProps;
};

// TODO: For now, if a supplier rejects the partnership request, default behavior is to update the rejected request to pending
export async function createOrUpdatePartnershipRequest(
  props: CreatePartnershipRequestProps,
) {
  try {
    const { priceListIds, recipientId, senderId, message, type, status } =
      props;
    const priceListExists = await hasPartnershipRequestMultiplePriceLists(
      priceListIds,
      senderId,
      type,
    );

    let partnershipRequest;
    if (!priceListExists) {
      partnershipRequest = await db.partnershipRequest.create({
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
    } else {
      const existingPartnershipRequest =
        await getPartnershipRequestMultiplePriceLists(
          priceListIds,
          senderId,
          type,
        );
      partnershipRequest = await db.partnershipRequest.update({
        where: {
          id: existingPartnershipRequest.id,
        },
        data: {
          message,
          status,
        },
      });
    }

    return partnershipRequest;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create or update partnership request.',
      createOrUpdatePartnershipRequest,
      { props },
    );
  }
}

export async function hasPartnershipRequestMultiplePriceLists(
  priceListIds: string[],
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
            id: {
              in: priceListIds,
            },
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
      hasPartnershipRequestMultiplePriceLists,
      { priceListIds, senderId },
    );
  }
}

export async function getPartnershipRequestMultiplePriceLists(
  priceListIds: string[],
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
            id: {
              in: priceListIds,
            },
          },
        },
      },
    });

    return partnershipRequest;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve price list.',
      getPartnershipRequestMultiplePriceLists,
      { priceListIds, senderId },
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

export async function getAllPartnershipRequests(
  recipientId: string,
  type: PartnershipRequestTypeProps,
) {
  try {
    const partnershipRequests = await db.partnershipRequest.findMany({
      where: {
        recipientId: recipientId,
        type,
      },
      include: {
        priceLists: true,
        sender: {
          select: {
            userProfile: true,
          },
        },
        recipient: {
          select: {
            userProfile: true,
          },
        },
      },
    });
    return partnershipRequests;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get all partnership requests for recipient.',
      getPartnershipRequest,
      { recipientId, type },
    );
  }
}

// model PartnershipRequest {
//   id          String      @id @default(uuid())
//   createdAt   DateTime    @default(now())
//   senderId    String
//   recipientId String
//   message     String
//   type        String // two types, retailer request and supplier request
//   status      String // can only be rejected or pending; if it is accepted already, it will just make the user into a price list retailer
//   priceLists  PriceList[]
//   sender      Session     @relation("SenderPartnershipRequest", fields: [senderId], references: [id])
//   recipient   Session     @relation("RecipientPartnershipRequest", fields: [recipientId], references: [id])
// }
