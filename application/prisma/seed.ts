import { PrismaClient } from '@prisma/client';
import { CHECKLIST_ITEM_KEYS, ROLES } from '~/constants';
import { addRole } from '~/services/models/roles.server';
import { hasSession } from '~/services/models/session.server';
import * as dotenv from 'dotenv';

dotenv.config();

const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// npx prisma db push
// npx prisma db seed - to run seed for database

async function main() {
  // create checklist tables
  const checklistTables = await db.checklistTable.findMany();
  const adminSessionExists = await hasSession(
    process.env.ADMIN_SESSION_ID ?? '',
  );
  const hasAdmin = await db.role.findFirst({
    where: {
      name: ROLES.ADMIN,
    },
  });
  if (adminSessionExists && !hasAdmin && process.env.ADMIN_SESSION_ID) {
    addRole(process.env.ADMIN_SESSION_ID, ROLES.ADMIN);
  }

  if (checklistTables.length === 0) {
    await Promise.all([
      // Create checklist 1
      db.checklistTable.create({
        data: {
          position: 1,
          header: 'Retailer Setup Guide',
          subheader:
            'Follow the steps below to import products from suppliers on our platform.',
          checklistItems: {
            create: [
              {
                key: CHECKLIST_ITEM_KEYS.RETAILER_GET_STARTED,
                position: 1,
                header: 'Become a retailer',
                subheader:
                  "Click get access to add SynqSell's functionality onto your store and start importing products from our supplier network.",
                buttonText: 'Get Access',
              },
              {
                key: CHECKLIST_ITEM_KEYS.RETAILER_CUSTOMIZE_PROFILE,
                position: 2,
                header: 'Customize your brand profile',
                subheader:
                  'Showcase the information you would like to display in the retailer network for suppliers to see.',
                buttonText: 'Edit Brand Profile',
              },
              {
                key: CHECKLIST_ITEM_KEYS.RETAILER_ADD_PAYMENT_METHOD,
                position: 3,
                header: 'Add Payment Method',
                subheader:
                  'Add a card integrated with Stripe to reliably pay suppliers when the shipment is marked delivered.',
                buttonText: 'Add Payment',
              },
              {
                key: CHECKLIST_ITEM_KEYS.RETAILER_REQUEST_PARTNERSHIP,
                position: 4,
                header: 'Request a partnership with a supplier',
                subheader:
                  'Partner with a supplier and get access to their price lists.',
                buttonText: 'Explore suppliers',
              },
              {
                key: CHECKLIST_ITEM_KEYS.RETAILER_IMPORT_PRODUCT,
                position: 5,
                header: 'Import a product to your store',
                subheader:
                  'Easily import products from our partnered suppliers with just a few clicks. Inventory levels are automatically synchronized with your store, ensuring accurate stock information at all times.',
                buttonText: 'Import products',
              },
            ],
          },
        },
      }),
      db.checklistTable.create({
        data: {
          position: 2,
          header: 'Supplier Setup Guide',
          subheader:
            'Follow the steps below to become a supplier on our platform.',
          checklistItems: {
            create: [
              {
                key: CHECKLIST_ITEM_KEYS.SUPPLIER_GET_STARTED,
                position: 1,
                header: 'Request access to become a supplier',
                subheader:
                  'Have a proven sales record and sell products that are allowed to be distributed.',
                buttonText: 'Request Approval',
              },
              {
                key: CHECKLIST_ITEM_KEYS.SUPPLIER_CUSTOMIZE_PROFILE,
                position: 2,
                header: 'Customize your brand profile',
                subheader:
                  'Showcase the information you would like to display in the supplier network for retailers to see.',
                buttonText: 'Edit Brand Profile',
              },
              {
                key: CHECKLIST_ITEM_KEYS.SUPPLIER_ADD_PAYMENT_METHOD,
                position: 3,
                header: 'Create a Stripe Connect Account',
                subheader:
                  'Securely integrate your bank account to automatically receive payments from retailers when an order is fulfilled.',
                buttonText: 'Integrate with Stripe',
              },
              {
                key: CHECKLIST_ITEM_KEYS.SUPPLIER_CREATE_PRICE_LIST,
                position: 4,
                header: 'Create a price list',
                subheader:
                  'Create a price list, which will be shown in your brand profile. A private price list will only be shown to retailers you invite.',
                buttonText: 'Create Price List',
              },
              {
                key: CHECKLIST_ITEM_KEYS.SUPPLIER_EXPLORE_NETWORK,
                position: 5,
                header: 'Request a partnership with a retailer',
                subheader:
                  'Connect with interested retailers or reach out to those in our network to explore partnership opportunities.',
                buttonText: 'Explore Retailer Network',
              },
            ],
          },
        },
      }),
    ]);
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
