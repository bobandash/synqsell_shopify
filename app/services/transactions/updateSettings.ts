import db from '~/db.server';
import { hasRole, updateRoleVisibilityTx } from '../models/roles';
import { CHECKLIST_ITEM_KEYS, ROLES } from '~/constants';
import type { ChecklistItemKeysOptionsProps } from '~/constants';
import { updateUserProfileTx } from '../models/userProfile';
import { updateChecklistStatusTx } from '../models/checklistStatus';
import type { Prisma } from '@prisma/client';
import { errorHandler } from '../util';

type ProfileDataProps = {
  name: string;
  email: string;
  biography: string;
  desiredProducts: string;
};

type SocialMediaDataProps = {
  facebook: string;
  twitter: string;
  instagram: string;
  youtube: string;
  tiktok: string;
};

type VisibilityDataProps = {
  isVisibleRetailerNetwork: boolean;
  isVisibleSupplierNetwork: boolean;
};

async function updateRoleAndChecklistItemTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  role: string,
  isVisibleInNetwork: boolean,
  checklistItemKey: ChecklistItemKeysOptionsProps,
) {
  try {
    await updateRoleVisibilityTx(tx, sessionId, role, isVisibleInNetwork);
    await updateChecklistStatusTx(tx, sessionId, checklistItemKey, true);
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update user settings.',
      updateRoleAndChecklistItemTx,
      { sessionId, role, isVisibleInNetwork, checklistItemKey },
    );
  }
}

export default async function updateSettings(
  sessionId: string,
  profileData: ProfileDataProps,
  socialMediaData: SocialMediaDataProps,
  visibilityData: VisibilityDataProps,
) {
  const { isVisibleRetailerNetwork, isVisibleSupplierNetwork } = visibilityData;

  try {
    const isRetailer = await hasRole(sessionId, ROLES.RETAILER);
    const isSupplier = await hasRole(sessionId, ROLES.SUPPLIER);

    await db.$transaction(async (tx) => {
      if (isRetailer) {
        await updateRoleAndChecklistItemTx(
          tx,
          sessionId,
          ROLES.RETAILER,
          isVisibleRetailerNetwork,
          CHECKLIST_ITEM_KEYS.RETAILER_CUSTOMIZE_PROFILE,
        );
      }
      if (isSupplier) {
        await updateRoleAndChecklistItemTx(
          tx,
          sessionId,
          ROLES.SUPPLIER,
          isVisibleSupplierNetwork,
          CHECKLIST_ITEM_KEYS.SUPPLIER_CUSTOMIZE_PROFILE,
        );
      }
      await updateUserProfileTx(tx, sessionId, profileData, socialMediaData);
    });
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update user settings.',
      updateSettings,
      { sessionId, profileData, socialMediaData, visibilityData },
    );
  }
}
