import {
  type PartnershipRequestStatusOptions,
  type PartnershipRequestTypeOptions,
} from '~/constants';
import db from '~/db.server';
import type { Prisma } from '@prisma/client';

type CreatePartnershipRequestProps = {
  priceListIds: string[];
  recipientId: string;
  senderId: string;
  message: string;
  type: PartnershipRequestTypeOptions;
  status: PartnershipRequestStatusOptions;
};

type CreatePartnershipRequestTxProps = CreatePartnershipRequestProps & {
  tx: Prisma.TransactionClient;
};

export async function hasPartnershipRequestMultiplePriceLists(
  priceListIds: string[],
  senderId: string,
  type: PartnershipRequestTypeOptions,
) {
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
}

export async function createOrUpdatePartnershipRequest(
  props: CreatePartnershipRequestProps,
) {
  const { priceListIds, recipientId, senderId, message, type, status } = props;
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
}

export async function createOrUpdatePartnershipRequestTx(
  props: CreatePartnershipRequestTxProps,
) {
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
}

export async function getPartnershipRequestMultiplePriceLists(
  priceListIds: string[],
  senderId: string,
  type: PartnershipRequestTypeOptions,
) {
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
}

export async function hasPartnershipRequest(
  priceListId: string,
  senderId: string,
  type: PartnershipRequestTypeOptions,
) {
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
}

export async function isValidPartnershipRequest(id: string) {
  const partnershipRequest = await db.partnershipRequest.findFirst({
    where: {
      id,
    },
  });

  if (partnershipRequest) {
    return true;
  }
  return false;
}

export async function getPartnershipRequest(
  priceListId: string,
  senderId: string,
  type: PartnershipRequestTypeOptions,
) {
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
}

export async function getAllPartnershipRequests(
  recipientId: string,
  type: PartnershipRequestTypeOptions,
) {
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
}

export async function deletePartnershipRequestTx(
  tx: Prisma.TransactionClient,
  partnershipRequestId: string,
) {
  const deletedPartnershipRequest = await tx.partnershipRequest.delete({
    where: {
      id: partnershipRequestId,
    },
  });
  return deletedPartnershipRequest;
}

export async function deletePartnershipRequestsTx(
  tx: Prisma.TransactionClient,
  partnershipRequestIds: string[],
) {
  const deletedPartnershipRequests = await tx.partnershipRequest.deleteMany({
    where: {
      id: {
        in: partnershipRequestIds,
      },
    },
  });
  return deletedPartnershipRequests;
}
