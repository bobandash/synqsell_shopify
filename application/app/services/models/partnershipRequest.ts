import {
  type PartnershipRequestStatusProps,
  type PartnershipRequestTypeProps,
} from '~/constants';
import { errorHandler } from '../util';
import db from '~/db.server';
import type { Prisma } from '@prisma/client';

type CreatePartnershipRequestProps = {
  priceListIds: string[];
  recipientId: string;
  senderId: string;
  message: string;
  type: PartnershipRequestTypeProps;
  status: PartnershipRequestStatusProps;
};

type CreatePartnershipRequestTxProps = CreatePartnershipRequestProps & {
  tx: Prisma.TransactionClient;
};

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

export async function createOrUpdatePartnershipRequestTx(
  props: CreatePartnershipRequestTxProps,
) {
  try {
    const { priceListIds, recipientId, senderId, message, type, status, tx } =
      props;
    const priceListExists = await hasPartnershipRequestMultiplePriceLists(
      priceListIds,
      senderId,
      type,
    );

    let partnershipRequest;
    if (!priceListExists) {
      partnershipRequest = await tx.partnershipRequest.create({
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
      partnershipRequest = await tx.partnershipRequest.update({
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

export async function isValidPartnershipRequest(id: string) {
  try {
    const partnershipRequest = await db.partnershipRequest.findFirst({
      where: {
        id,
      },
    });

    if (partnershipRequest) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if partnership request id is valid.',
      isValidPartnershipRequest,
      { id },
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
      getAllPartnershipRequests,
      { recipientId, type },
    );
  }
}

export async function deletePartnershipRequestTx(
  tx: Prisma.TransactionClient,
  partnershipRequestId: string,
) {
  try {
    const deletedPartnershipRequest = await tx.partnershipRequest.delete({
      where: {
        id: partnershipRequestId,
      },
    });
    return deletedPartnershipRequest;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to delete partnership request in transaction',
      deletePartnershipRequestTx,
      { partnershipRequestId },
    );
  }
}

export async function deletePartnershipRequestsTx(
  tx: Prisma.TransactionClient,
  partnershipRequestIds: string[],
) {
  try {
    const deletedPartnershipRequests = await tx.partnershipRequest.deleteMany({
      where: {
        id: {
          in: partnershipRequestIds,
        },
      },
    });
    return deletedPartnershipRequests;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to delete partnership requests in transaction',
      deletePartnershipRequestsTx,
      { partnershipRequestIds },
    );
  }
}
