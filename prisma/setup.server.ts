import db from "@db/test-db";
import { beforeAll, afterAll, afterEach } from "@jest/globals";

// https://medium.com/@mrk5199/streamlining-prisma-integration-tests-with-jest-a-step-by-step-guide-f6ba53e5030c
// NOTE: For some reason, prisma's recommendation to use raw sql to clear the database is only working some times, so I generated a temp script to delete all data
async function clearDatabase() {
  await db.$transaction(async (tx) => {
    await Promise.all([
      tx.stripeWebhook.deleteMany(),
      tx.billingTransaction.deleteMany(),
      tx.socialMediaLink.deleteMany(),
      tx.role.deleteMany(),
    ]);

    // TODO: change to promise.all for performance optimization in future
    await tx.payment.deleteMany();
    await tx.fulfillment.deleteMany();
    await tx.orderLineItem.deleteMany();
    await tx.order.deleteMany();
    await tx.importedInventoryItem.deleteMany();
    await tx.importedVariant.deleteMany();
    await tx.importedProduct.deleteMany();
    await tx.inventoryItem.deleteMany();
    await tx.variant.deleteMany();
    await tx.product.deleteMany();
    await tx.partnershipRequest.deleteMany();
    await tx.partnership.deleteMany();
    await tx.priceList.deleteMany();
    await tx.userPreference.deleteMany();
    await tx.userProfile.deleteMany();
    await tx.checklistStatus.deleteMany();
    await tx.checklistItem.deleteMany();
    await tx.checklistTable.deleteMany();
    await tx.supplierAccessRequest.deleteMany();
    await tx.carrierService.deleteMany();
    await tx.fulfillmentService.deleteMany();
    await tx.billing.deleteMany();
    await tx.stripeConnectAccount.deleteMany();
    await tx.stripeCustomerAccount.deleteMany();
    await tx.session.deleteMany();
  });
}

beforeAll(async () => {
  await clearDatabase();
}, 120000);

afterEach(async () => {
  await clearDatabase();
}, 120000);

afterAll(async () => {
  await db.$disconnect();
});
