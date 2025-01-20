import { StatusCodes } from 'http-status-codes';
import {
  ACCESS_REQUEST_STATUS,
  CHECKLIST_ITEM_KEYS,
  ROLES,
  type RolesOptions,
  type AccessRequestStatusOptions,
} from '~/constants';
import db from '~/db.server';
import { type Prisma } from '@prisma/client';
import { getRoleBatch } from '~/services/models/roles.server';
import { updateChecklistStatusBatch } from '~/services/models/checklistStatus.server';
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';

export type SupplierAccessRequestInfo = {
  supplierAccessRequestId: string;
  sessionId: string;
};

async function updateSupplierAccessRequestBatch(
  supplierAccessRequestIds: string[],
  status: string,
  tx: Prisma.TransactionClient = db,
) {
  const newSupplierAccessRequests = await tx.supplierAccessRequest.updateMany({
    where: {
      id: {
        in: supplierAccessRequestIds,
      },
    },
    data: {
      status: status,
    },
  });
  return newSupplierAccessRequests;
}

// helper functions to approve / reject supplier access
async function createSupplierRoles(
  sessionIds: string[],
  tx: Prisma.TransactionClient = db,
) {
  const newRoleData = sessionIds.map((sessionId) => ({
    name: ROLES.SUPPLIER,
    sessionId,
    isVisibleInNetwork: true,
  }));

  return tx.role.createMany({
    data: newRoleData,
  });
}

async function deleteSupplierRolesBatch(
  sessionIds: string[],
  tx: Prisma.TransactionClient = db,
) {
  return tx.role.deleteMany({
    where: {
      sessionId: {
        in: sessionIds,
      },
      name: ROLES.SUPPLIER,
    },
  });
}
async function getSessionIdsWithoutRole(
  sessionIds: string[],
  role: RolesOptions,
) {
  const sessionsWithRoleData = await getRoleBatch(sessionIds, role);
  const sessionIdsWithRoleSet = new Set(
    sessionsWithRoleData.map((role) => role.id),
  );
  const sessionIdsWithoutSupplierRole = sessionIds.filter(
    (id) => !sessionIdsWithRoleSet.has(id),
  );
  return sessionIdsWithoutSupplierRole;
}

// updates the status of the StatusAccessRequest and creates supplier roles for these suppliers
export async function approveSuppliers(
  supplierAccessRequestIds: string[],
  sessionIds: string[],
) {
  try {
    // Do not want to add another supplier roles to users who already have a supplier role
    const sessionIdsWithoutSupplierRole = await getSessionIdsWithoutRole(
      sessionIds,
      ROLES.SUPPLIER,
    );
    await db.$transaction(async (tx) => {
      await Promise.all([
        updateSupplierAccessRequestBatch(
          supplierAccessRequestIds,
          ACCESS_REQUEST_STATUS.APPROVED,
          tx,
        ),
        createSupplierRoles(sessionIdsWithoutSupplierRole, tx),
        updateChecklistStatusBatch(
          sessionIds,
          CHECKLIST_ITEM_KEYS.SUPPLIER_GET_STARTED,
          true,
          tx,
        ),
      ]);
    });
    return createJSONSuccess(
      'Suppliers were successfully approved.',
      StatusCodes.OK,
    );
  } catch (error) {
    logError(error, { sessionIds, supplierAccessRequestIds });
    return getRouteError(
      error,
      'Failed to approve supplier requests. Please try again later.',
    );
  }
}

async function rejectSuppliers(
  supplierAccessRequestIds: string[],
  sessionIds: string[],
) {
  try {
    await db.$transaction(async (tx) => {
      await Promise.all([
        updateSupplierAccessRequestBatch(
          supplierAccessRequestIds,
          ACCESS_REQUEST_STATUS.REJECTED,
          tx,
        ),
        deleteSupplierRolesBatch(sessionIds, tx),
        updateChecklistStatusBatch(
          sessionIds,
          CHECKLIST_ITEM_KEYS.SUPPLIER_GET_STARTED,
          false,
          tx,
        ),
      ]);
    });
    return createJSONSuccess(
      'Suppliers were successfully rejected.',
      StatusCodes.OK,
    );
  } catch (error) {
    logError(error, { sessionIds, supplierAccessRequestIds });
    return getRouteError(
      error,
      'Failed to reject supplier requests. Please try again later.',
    );
  }
}

export async function updateSupplierAccessAction(
  supplierAccessRequestIds: string[],
  sessionIds: string[],
  status: AccessRequestStatusOptions,
) {
  if (status === ACCESS_REQUEST_STATUS.REJECTED) {
    return await rejectSuppliers(supplierAccessRequestIds, sessionIds);
  } else if (status === ACCESS_REQUEST_STATUS.APPROVED) {
    return await approveSuppliers(supplierAccessRequestIds, sessionIds);
  }
}
