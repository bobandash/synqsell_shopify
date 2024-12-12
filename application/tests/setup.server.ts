import db from '~/db.server';
import { config } from 'dotenv';
import * as path from 'path';
// https://medium.com/@mrk5199/streamlining-prisma-integration-tests-with-jest-a-step-by-step-guide-f6ba53e5030c
config({ path: path.join(__dirname, '../.env.test') });

// NOTE: For some reason, prisma's recommendation to use raw sql to clear the database is only working some times, so I generated a temp script to delete all data
async function clearDatabase() {
  await db.$transaction([
    // First delete models with no dependencies
    db.stripeWebhook.deleteMany(),
    db.billingTransaction.deleteMany(),
    db.socialMediaLink.deleteMany(),

    // Delete order-related entities
    db.payment.deleteMany(),
    db.fulfillment.deleteMany(),
    db.orderLineItem.deleteMany(),
    db.order.deleteMany(),

    // Delete product-related entities
    db.importedInventoryItem.deleteMany(),
    db.importedVariant.deleteMany(),
    db.importedProduct.deleteMany(),
    db.inventoryItem.deleteMany(),
    db.variant.deleteMany(),
    db.product.deleteMany(),

    // Delete partnership-related entities
    db.partnershipRequest.deleteMany(),
    db.partnership.deleteMany(),
    db.priceList.deleteMany(),

    // Delete user-related entities
    db.userPreference.deleteMany(),
    db.userProfile.deleteMany(),
    db.role.deleteMany(),
    db.checklistStatus.deleteMany(),
    db.checklistItem.deleteMany(),
    db.checklistTable.deleteMany(),
    db.supplierAccessRequest.deleteMany(),
    db.carrierService.deleteMany(),
    db.fulfillmentService.deleteMany(),
    db.billing.deleteMany(),
    db.stripeConnectAccount.deleteMany(),
    db.stripeCustomerAccount.deleteMany(),

    // Finally delete the main session table
    db.session.deleteMany(),
  ]);
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
