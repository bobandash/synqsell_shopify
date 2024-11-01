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
import { getRoleBatch } from '~/services/models/roles';
import { updateChecklistStatusBatchTx } from '~/services/models/checklistStatus';
import { createJSONSuccess, errorHandler } from '~/lib/utils/server';

export type SupplierAccessRequestInfo = {
  supplierAccessRequestId: string;
  sessionId: string;
};

async function updateSupplierAccessRequestBatchTx(
  tx: Prisma.TransactionClient,
  supplierAccessRequestIds: string[],
  status: string,
) {
  try {
    const newSupplierAccessRequests = await tx.supplierAccessRequest.updateMany(
      {
        where: {
          id: {
            in: supplierAccessRequestIds,
          },
        },
        data: {
          status: status,
          updatedAt: new Date(),
        },
      },
    );
    return newSupplierAccessRequests;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update supplier access requests in bulk.',
      updateSupplierAccessRequestBatchTx,
      { supplierAccessRequestIds, status },
    );
  }
}

// helper functions to approve / reject supplier access
async function createSupplierRolesTx(
  tx: Prisma.TransactionClient,
  sessionIds: string[],
) {
  try {
    const newRoleData = sessionIds.map((sessionId) => ({
      name: ROLES.SUPPLIER,
      sessionId,
      isVisibleInNetwork: true,
    }));
    const newRoles = await tx.role.createMany({
      data: newRoleData,
    });
    return newRoles;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create supplier roles in bulk.',
      createSupplierRolesTx,
      { sessionIds },
    );
  }
}

async function deleteSupplierRolesBatchTx(
  tx: Prisma.TransactionClient,
  sessionIds: string[],
) {
  try {
    const rolesDeleted = await tx.role.deleteMany({
      where: {
        sessionId: {
          in: sessionIds,
        },
        name: {
          equals: ROLES.SUPPLIER,
        },
      },
    });
    return rolesDeleted;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to delete supplier roles in bulk.',
      deleteSupplierRolesBatchTx,
      { sessionIds },
    );
  }
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
  supplierAccessRequestInfo: SupplierAccessRequestInfo[],
) {
  try {
    const supplierAccessRequestIds = supplierAccessRequestInfo.map(
      (info) => info.supplierAccessRequestId,
    );
    const sessionIds = supplierAccessRequestInfo.map((info) => info.sessionId);

    // Do not want to add another supplier roles to users who already have a supplier role
    const sessionIdsWithoutSupplierRole = await getSessionIdsWithoutRole(
      sessionIds,
      ROLES.SUPPLIER,
    );

    await db.$transaction(async (tx) => {
      await Promise.all([
        updateSupplierAccessRequestBatchTx(
          tx,
          supplierAccessRequestIds,
          ACCESS_REQUEST_STATUS.APPROVED,
        ),
        createSupplierRolesTx(tx, sessionIdsWithoutSupplierRole),
        updateChecklistStatusBatchTx(
          tx,
          sessionIds,
          CHECKLIST_ITEM_KEYS.SUPPLIER_GET_STARTED,
          true,
        ),
      ]);
    });

    return createJSONSuccess(
      'Suppliers were successfully approved.',
      StatusCodes.OK,
    );
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to approve all suppliers in bulk.',
      approveSuppliers,
      { supplierAccessRequestInfo },
    );
  }
}

async function rejectSuppliers(
  supplierAccessRequestInfo: SupplierAccessRequestInfo[],
) {
  try {
    const supplierAccessRequestIds = supplierAccessRequestInfo.map(
      (info) => info.supplierAccessRequestId,
    );
    const sessionIds = supplierAccessRequestInfo.map((info) => info.sessionId);
    await db.$transaction(async (tx) => {
      await Promise.all([
        updateSupplierAccessRequestBatchTx(
          tx,
          supplierAccessRequestIds,
          ACCESS_REQUEST_STATUS.REJECTED,
        ),
        deleteSupplierRolesBatchTx(tx, sessionIds),
        updateChecklistStatusBatchTx(
          tx,
          sessionIds,
          CHECKLIST_ITEM_KEYS.SUPPLIER_GET_STARTED,
          false,
        ),
      ]);
    });

    return createJSONSuccess(
      'Suppliers were successfully rejected.',
      StatusCodes.OK,
    );
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to reject all suppliers in bulk.',
      rejectSuppliers,
      { supplierAccessRequestInfo },
    );
  }
}

// TODO: add Yup Validation
export async function updateSupplierAccessAction(
  supplierAccessRequestInfo: SupplierAccessRequestInfo[],
  status: AccessRequestStatusOptions,
) {
  if (status === ACCESS_REQUEST_STATUS.REJECTED) {
    return await rejectSuppliers(supplierAccessRequestInfo);
  } else if (status === ACCESS_REQUEST_STATUS.APPROVED) {
    return await approveSuppliers(supplierAccessRequestInfo);
  }
}
