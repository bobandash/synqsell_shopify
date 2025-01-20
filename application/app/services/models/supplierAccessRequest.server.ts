import db from '~/db.server';
import { ACCESS_REQUEST_STATUS } from '~/constants';
import { Prisma } from '@prisma/client';

export type GetSupplierAccessRequestProps = {
  name: string;
  website: string;
  email: string;
  id: string;
  num: number;
  checklistStatusId: string;
  hasMetSalesThreshold: boolean;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  sessionId: string;
  notes: string | null;
  isEligibleForNewRequest: boolean;
};

export type GetSupplierAccessRequestJSONProps = {
  name: string;
  website: string;
  email: string;
  id: string;
  num: number;
  checklistStatusId: string;
  hasMetSalesThreshold: boolean;
  createdAt: string;
  updatedAt: string;
  status: string;
  sessionId: string;
  notes: string | null;
  isEligibleForNewRequest: boolean;
};

export async function hasSupplierAccessRequest(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.supplierAccessRequest.count({
    where: { sessionId },
  });
  return count > 0;
}

export async function getSupplierAccessRequest(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.supplierAccessRequest.findFirstOrThrow({
    where: { sessionId },
  });
}

// TODO: to get more than 60 days of orders, it requires asking Shopify for permission (> 14 days) and Shopify can reject request
// if app scales, then decide whether or not to request orders as a app permission scope
async function createSupplierAccessRequest(
  sessionId: string,
  checklistStatusId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.supplierAccessRequest.create({
    data: {
      status: ACCESS_REQUEST_STATUS.PENDING,
      sessionId,
      checklistStatusId,
      hasMetSalesThreshold: true,
    },
  });
}

export async function getOrCreateSupplierAccessRequest(
  sessionId: string,
  checklistStatusId: string,
  tx: Prisma.TransactionClient = db,
) {
  const exists = await hasSupplierAccessRequest(sessionId, tx);

  if (!exists) {
    return createSupplierAccessRequest(sessionId, checklistStatusId, tx);
  }

  return getSupplierAccessRequest(sessionId, tx);
}

export async function getAllSupplierAccessRequests(
  tx: Prisma.TransactionClient = db,
) {
  const requests = await tx.supplierAccessRequest.findMany({
    include: {
      session: {
        select: {
          userProfile: true,
        },
      },
    },
  });

  return requests.map(({ session: { userProfile }, ...rest }) => ({
    ...rest,
    name: userProfile?.name || '',
    website: userProfile?.website || '',
    email: userProfile?.email || '',
  }));
}

export async function updateSupplierAccessRequest(
  sessionId: string,
  status: string,
  notes: string,
  isEligibleForNewRequest: boolean,
  tx: Prisma.TransactionClient = db,
) {
  return tx.supplierAccessRequest.update({
    where: { sessionId },
    data: {
      status,
      notes,
      isEligibleForNewRequest,
    },
  });
}
