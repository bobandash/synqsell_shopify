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

export async function hasPartnershipRequestMultiplePriceLists(
  priceListIds: string[],
  senderId: string,
  type: PartnershipRequestTypeOptions,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.partnershipRequest.count({
    where: {
      senderId,
      type,
      priceLists: {
        some: {
          id: { in: priceListIds },
        },
      },
    },
  });
  return count > 0;
}

export async function createOrUpdatePartnershipRequest(
  data: CreatePartnershipRequestProps,
  tx: Prisma.TransactionClient = db,
) {
  const { priceListIds, recipientId, senderId, message, type, status } = data;
  const priceListExists = await hasPartnershipRequestMultiplePriceLists(
    priceListIds,
    senderId,
    type,
    tx,
  );

  if (!priceListExists) {
    return tx.partnershipRequest.create({
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
  }

  const existingPartnershipRequest =
    await getPartnershipRequestMultiplePriceLists(
      priceListIds,
      senderId,
      type,
      tx,
    );

  return tx.partnershipRequest.update({
    where: { id: existingPartnershipRequest.id },
    data: { message, status },
  });
}

export async function getPartnershipRequestMultiplePriceLists(
  priceListIds: string[],
  senderId: string,
  type: PartnershipRequestTypeOptions,
  tx: Prisma.TransactionClient = db,
) {
  return tx.partnershipRequest.findFirstOrThrow({
    where: {
      senderId,
      type,
      priceLists: {
        some: {
          id: { in: priceListIds },
        },
      },
    },
  });
}

export async function hasPartnershipRequest(
  priceListId: string,
  senderId: string,
  type: PartnershipRequestTypeOptions,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.partnershipRequest.count({
    where: {
      senderId,
      type,
      priceLists: {
        some: { id: priceListId },
      },
    },
  });
  return count > 0;
}

export async function isValidPartnershipRequest(
  id: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.partnershipRequest.count({
    where: { id },
  });
  return count > 0;
}

export async function getPartnershipRequest(
  priceListId: string,
  senderId: string,
  type: PartnershipRequestTypeOptions,
  tx: Prisma.TransactionClient = db,
) {
  return tx.partnershipRequest.findFirstOrThrow({
    where: {
      senderId,
      type,
      priceLists: {
        some: { id: priceListId },
      },
    },
  });
}

export async function getAllPartnershipRequests(
  recipientId: string,
  type: PartnershipRequestTypeOptions,
  tx: Prisma.TransactionClient = db,
) {
  return tx.partnershipRequest.findMany({
    where: { recipientId, type },
    include: {
      priceLists: true,
      sender: {
        select: { userProfile: true },
      },
      recipient: {
        select: { userProfile: true },
      },
    },
  });
}

export async function deletePartnershipRequest(
  partnershipRequestId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.partnershipRequest.delete({
    where: { id: partnershipRequestId },
  });
}

export async function deletePartnershipRequests(
  partnershipRequestIds: string[],
  tx: Prisma.TransactionClient = db,
) {
  return tx.partnershipRequest.deleteMany({
    where: {
      id: { in: partnershipRequestIds },
    },
  });
}
