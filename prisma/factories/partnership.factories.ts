import {
  generatePartnershipData,
  generatePartnershipRequestData,
} from "@db/fixtures";
import type {
  PartnershipRequestStatusOptions,
  PartnershipRequestTypeOptions,
} from "@db/constants";
import db from "@db/test-db";
import { Prisma, PrismaClient } from "@prisma/client";
type DbClient = PrismaClient | Prisma.TransactionClient;

export const generatePartnershipRequest = async (
  senderId: string,
  recipientId: string,
  status: PartnershipRequestStatusOptions,
  type: PartnershipRequestTypeOptions,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generatePartnershipRequestData(
    senderId,
    recipientId,
    status,
    type
  );
  return await ctx.partnershipRequest.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generatePartnership = async (
  retailerId: string,
  supplierId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generatePartnershipData(retailerId, supplierId);
  return await ctx.partnership.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};
