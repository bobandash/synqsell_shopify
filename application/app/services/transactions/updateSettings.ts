import db from '~/db.server';
import { hasRole, updateRoleVisibility } from '../models/roles.server';
import { CHECKLIST_ITEM_KEYS, ROLES } from '~/constants';
import type { ChecklistItemKeysOptions, RolesOptions } from '~/constants';
import { updateChecklistStatus } from '../models/checklistStatus.server';
import type { Prisma } from '@prisma/client';
import { updateUserProfile } from '../models/userProfile.server';
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

async function updateRoleAndChecklistItem(
  sessionId: string,
  role: RolesOptions,
  isVisibleInNetwork: boolean,
  checklistItemKey: ChecklistItemKeysOptions,
  tx: Prisma.TransactionClient,
) {
  await Promise.all([
    updateRoleVisibility(sessionId, role, isVisibleInNetwork, tx),
    updateChecklistStatus(sessionId, checklistItemKey, true, tx),
  ]);
}

export default async function updateSettings(
  sessionId: string,
  profileData: ProfileDataProps,
  socialMediaData: SocialMediaDataProps,
  visibilityData: VisibilityDataProps,
) {
  const { isVisibleRetailerNetwork, isVisibleSupplierNetwork } = visibilityData;
  const [isRetailer, isSupplier] = await Promise.all([
    hasRole(sessionId, ROLES.RETAILER),
    hasRole(sessionId, ROLES.SUPPLIER),
  ]);

  await db.$transaction(async (tx) => {
    if (isRetailer) {
      await updateRoleAndChecklistItem(
        sessionId,
        ROLES.RETAILER,
        isVisibleRetailerNetwork,
        CHECKLIST_ITEM_KEYS.RETAILER_CUSTOMIZE_PROFILE,
        tx,
      );
    }
    if (isSupplier) {
      await updateRoleAndChecklistItem(
        sessionId,
        ROLES.SUPPLIER,
        isVisibleSupplierNetwork,
        CHECKLIST_ITEM_KEYS.SUPPLIER_CUSTOMIZE_PROFILE,
        tx,
      );
    }
    await updateUserProfile(sessionId, profileData, socialMediaData, tx);
  });
}
