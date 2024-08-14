import db from "~/db.server";
import { hasRole, updateRoleVisibilityTx } from "../roles";
import { CHECKLIST_ITEM_KEYS, ROLES } from "~/constants";
import { updateUserProfileTx } from "../userProfile";
import { errorHandler, getLogContext } from "~/util";
import { updateChecklistStatusTx } from "../checklistStatus";
import type { Prisma } from "@prisma/client";

type ProfileDataProps = {
  name: string;
  email: string;
  biography: string;
  desiredProducts: string;
};

type VisibilityDataProps = {
  isVisibleRetailerNetwork: boolean;
  isVisibleSupplierNetwork: boolean;
};

async function updateRoleAndChecklist(
  tx: Prisma.TransactionClient,
  sessionId: string,
  role: string,
  isVisibleInNetwork: boolean,
  checklistItemKey: string,
) {
  try {
    await updateRoleVisibilityTx(tx, sessionId, role, isVisibleInNetwork);
    await updateChecklistStatusTx(tx, sessionId, checklistItemKey, true);
  } catch (error) {
    const context = getLogContext(
      updateRoleAndChecklist,
      tx,
      sessionId,
      role,
      isVisibleInNetwork,
      checklistItemKey,
    );
    throw errorHandler(error, context, "Failed to update user settings.");
  }
}

export default async function updateSettings(
  sessionId: string,
  profileData: ProfileDataProps,
  visibilityData: VisibilityDataProps,
) {
  const { isVisibleRetailerNetwork, isVisibleSupplierNetwork } = visibilityData;

  try {
    const isRetailer = await hasRole(sessionId, ROLES.RETAILER);
    const isSupplier = await hasRole(sessionId, ROLES.SUPPLIER);

    await db.$transaction(async (tx) => {
      if (isRetailer) {
        await updateRoleAndChecklist(
          tx,
          sessionId,
          ROLES.RETAILER,
          isVisibleRetailerNetwork,
          CHECKLIST_ITEM_KEYS.RETAILER_CUSTOMIZE_PROFILE,
        );
      }
      if (isSupplier) {
        await updateRoleAndChecklist(
          tx,
          sessionId,
          ROLES.SUPPLIER,
          isVisibleSupplierNetwork,
          CHECKLIST_ITEM_KEYS.SUPPLIER_CUSTOMIZE_PROFILE,
        );
      }
      await updateUserProfileTx(tx, sessionId, profileData);
    });
  } catch (error) {
    const context = getLogContext(
      updateSettings,
      sessionId,
      profileData,
      visibilityData,
    );
    throw errorHandler(error, context, "Failed to update user settings.");
  }
}