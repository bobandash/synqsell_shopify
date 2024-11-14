import db from '~/db.server';
import { hasRole, updateRoleVisibilityTx } from '../models/roles.server';
import { CHECKLIST_ITEM_KEYS, ROLES } from '~/constants';
import type { ChecklistItemKeysOptions } from '~/constants';
import { updateUserProfileTx } from '../models/userProfile.server';
import { updateChecklistStatusTx } from '../models/checklistStatus.server';
import type { Prisma } from '@prisma/client';
type ProfileDataProps = {
  name: string;
  email: string;
  biography: string;
  desiredProducts: string;
  logoUrl: string | null;
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
  checklistItemKey: ChecklistItemKeysOptions,
) {
  await Promise.all([
    updateRoleVisibilityTx(tx, sessionId, role, isVisibleInNetwork),
    updateChecklistStatusTx(tx, sessionId, checklistItemKey, true),
  ]);
}

export default async function updateSettings(
  sessionId: string,
  profileData: ProfileDataProps,
  socialMediaData: SocialMediaDataProps,
  visibilityData: VisibilityDataProps,
) {
  const { isVisibleRetailerNetwork, isVisibleSupplierNetwork } = visibilityData;

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
}
