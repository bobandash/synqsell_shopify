import db from '~/db.server';
import { ACCESS_REQUEST_STATUS, CHECKLIST_ITEM_KEYS, ROLES } from '~/constants';
import type { AccessRequestStatusOptionsProps } from '~/constants';
import { getRoleBatch } from '../models/roles';
import { updateChecklistStatusBatchTx } from '../models/checklistStatus';
import { type Prisma } from '@prisma/client';
import { errorHandler } from '../util';

export type supplierAccessRequestInformationProps = {
  supplierAccessRequestId: string;
  sessionId: string;
};

type NewRoleProps = {
  name: string;
  sessionId: string;
  isVisibleInNetwork: boolean;
};

export async function updateSupplierAccess(
  supplierAccessRequestInfo: supplierAccessRequestInformationProps[],
  status: AccessRequestStatusOptionsProps,
) {
  try {
    if (status === ACCESS_REQUEST_STATUS.REJECTED) {
      await rejectSuppliers(supplierAccessRequestInfo);
    } else if (status === ACCESS_REQUEST_STATUS.APPROVED) {
      await approveSuppliers(supplierAccessRequestInfo);
    }
    return;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update user settings.',
      updateSupplierAccess,
      { supplierAccessRequestInfo, status },
    );
  }
}

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
      updateSupplierAccess,
      { supplierAccessRequestIds, status },
    );
  }
}

// helper functions to approve / reject supplier access
async function createSupplierRolesBatchTx(
  tx: Prisma.TransactionClient,
  newRoleData: NewRoleProps[],
) {
  try {
    const newRoles = await tx.role.createMany({
      data: newRoleData,
    });
    return newRoles;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create supplier roles in bulk.',
      createSupplierRolesBatchTx,
      { newRoleData },
    );
  }
}

async function deleteSupplierRolesBatchTx(
  tx: Prisma.TransactionClient,
  sessionIds: string[],
) {
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
}

// updates the status of the StatusAccessRequest and creates supplier roles for these suppliers
export async function approveSuppliers(
  supplierAccessRequestInfo: supplierAccessRequestInformationProps[],
) {
  try {
    const supplierAccessRequestIds = supplierAccessRequestInfo.map(
      (info) => info.supplierAccessRequestId,
    );
    const sessionIds = supplierAccessRequestInfo.map((info) => info.sessionId);

    // Do not want to add another supplier roles to users who already have a supplier role
    const existingSupplierRoleInSessionIds = await getRoleBatch(
      sessionIds,
      ROLES.SUPPLIER,
    );
    const sessionIdsWithSupplierRole = new Set(
      existingSupplierRoleInSessionIds.map((role) => role.id),
    );
    const sessionIdsWithoutSupplierRole = sessionIds.filter(
      (id) => !sessionIdsWithSupplierRole.has(id),
    );

    const newRoleData = sessionIdsWithoutSupplierRole.map((sessionId) => {
      return {
        name: ROLES.SUPPLIER,
        sessionId,
        isVisibleInNetwork: true,
      };
    });

    await db.$transaction(async (tx) => {
      await Promise.all([
        updateSupplierAccessRequestBatchTx(
          tx,
          supplierAccessRequestIds,
          ACCESS_REQUEST_STATUS.APPROVED,
        ),
        createSupplierRolesBatchTx(tx, newRoleData),
        updateChecklistStatusBatchTx(
          tx,
          sessionIds,
          CHECKLIST_ITEM_KEYS.SUPPLIER_GET_STARTED,
          true,
        ),
      ]);
    });
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to approve all suppliers in bulk.',
      approveSuppliers,
      { supplierAccessRequestInfo },
    );
  }
}

// TODO: in the future, decide whether or not to just hide the visibility or make admin permissions
// !!! TODO: add price list deletion
async function rejectSuppliers(
  supplierAccessRequestInfo: supplierAccessRequestInformationProps[],
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
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to reject all suppliers in bulk.',
      rejectSuppliers,
      { supplierAccessRequestInfo },
    );
  }
}
