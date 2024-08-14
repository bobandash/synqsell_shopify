import db from "~/db.server";
import { ACCESS_REQUEST_STATUS, ROLES } from "~/constants";
import logger from "~/logger";
import { errorHandler, getLogCombinedMessage, getLogContext } from "~/util";
import createHttpError from "http-errors";
import { getRoleBatch } from "../roles";

export type supplierAccessRequestInformationProps = {
  supplierAccessRequestId: string;
  sessionId: string;
};

export async function updateSupplierAccess(
  supplierAccessRequestInfo: supplierAccessRequestInformationProps[],
  status: string,
) {
  try {
    if (
      !(
        status === ACCESS_REQUEST_STATUS.REJECTED ||
        status === ACCESS_REQUEST_STATUS.APPROVED
      )
    ) {
      const logMessage = getLogCombinedMessage(
        updateSupplierAccess,
        `Status to update suppliers was invalid.`,
        supplierAccessRequestInfo,
        status,
      );
      logger.error(logMessage);
      throw new createHttpError.BadRequest(
        `Status to update was not valid. Please contact support.`,
      );
    }

    if (status === ACCESS_REQUEST_STATUS.REJECTED) {
      await rejectSuppliers(supplierAccessRequestInfo);
    } else if (status === ACCESS_REQUEST_STATUS.APPROVED) {
      await approveSuppliers(supplierAccessRequestInfo);
    }
    return;
  } catch (error) {
    const context = getLogContext(
      updateSupplierAccess,
      supplierAccessRequestInfo,
      status,
    );
    throw errorHandler(error, context, "Failed to update supplier access.");
  }
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
      await tx.supplierAccessRequest.updateMany({
        where: {
          id: {
            in: supplierAccessRequestIds,
          },
        },
        data: {
          status: ACCESS_REQUEST_STATUS.APPROVED,
          updatedAt: new Date(),
        },
      });
      if (newRoleData) {
        await db.role.createMany({
          data: newRoleData,
        });
      }
    });
  } catch (error) {
    const context = getLogContext(approveSuppliers, supplierAccessRequestInfo);
    throw errorHandler(
      error,
      context,
      "Failed to approve all suppliers in bulk.",
    );
  }
}

// TODO: in the future, decide whether or not to just hide the visibility or make admin permissions
// !!! TODO: add price list deletion
// marks supplier access request as rejected and deletes the role and any price lists that exist
async function rejectSuppliers(
  supplierAccessRequestInfo: supplierAccessRequestInformationProps[],
) {
  try {
    const supplierAccessRequestIds = supplierAccessRequestInfo.map(
      (info) => info.supplierAccessRequestId,
    );
    const sessionIds = supplierAccessRequestInfo.map((info) => info.sessionId);
    await db.$transaction([
      db.supplierAccessRequest.updateMany({
        where: {
          id: {
            in: supplierAccessRequestIds,
          },
        },
        data: {
          status: ACCESS_REQUEST_STATUS.REJECTED,
          updatedAt: new Date(),
        },
      }),
      db.role.deleteMany({
        where: {
          sessionId: {
            in: sessionIds,
          },
          name: {
            equals: ROLES.SUPPLIER,
          },
        },
      }),
    ]);
  } catch (error) {
    const context = getLogContext(rejectSuppliers, supplierAccessRequestInfo);
    throw errorHandler(
      error,
      context,
      "Failed to reject all suppliers in bulk.",
    );
  }
}
