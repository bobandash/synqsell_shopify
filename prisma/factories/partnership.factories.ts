import {
  generatePartnershipData,
  generatePartnershipRequestData,
} from "@db/fixtures";
import type {
  PartnershipRequestStatusOptions,
  PartnershipRequestTypeOptions,
} from "@db/constants";
import db from "@db/test-db";

export const generatePartnershipRequest = (
  senderId: string,
  recipientId: string,
  status: PartnershipRequestStatusOptions,
  type: PartnershipRequestTypeOptions,
  overrides = {}
) => {
  const data = generatePartnershipRequestData(
    senderId,
    recipientId,
    status,
    type
  );
  return db.partnershipRequest.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generatePartnership = (
  retailerId: string,
  supplierId: string,
  overrides = {}
) => {
  const data = generatePartnershipData(retailerId, supplierId);
  return db.partnership.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};
