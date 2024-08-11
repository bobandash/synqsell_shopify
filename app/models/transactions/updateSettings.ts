import db from "~/db.server";
import { updateRoleVisibilityTx } from "../roles";
import { ROLES } from "~/constants";
import { updateUserProfileTx } from "../userProfile";
import { errorHandler, getLogContext } from "~/util";

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

export default async function updateSettings(
  sessionId: string,
  profileData: ProfileDataProps,
  visibilityData: VisibilityDataProps,
) {
  const { isVisibleRetailerNetwork, isVisibleSupplierNetwork } = visibilityData;

  // Transaction will roll-back if any of these fail
  try {
    await db.$transaction(async (tx) => {
      await Promise.all([
        updateRoleVisibilityTx(
          tx,
          sessionId,
          ROLES.RETAILER,
          isVisibleRetailerNetwork,
        ),
        updateRoleVisibilityTx(
          tx,
          sessionId,
          ROLES.RETAILER,
          isVisibleSupplierNetwork,
        ),
        updateUserProfileTx(tx, sessionId, profileData),
      ]);
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
