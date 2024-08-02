import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

// npx prisma db seed - to run seed for database

async function main() {
  await Promise.all([
    // Create checklist 1
    db.checklistTable.create({
      data: {
        position: 1,
        header: "Retailer Setup Guide",
        subheader:
          "Follow the steps below to import products from suppliers on our platform.",
        checklistItems: {
          create: [
            {
              key: "retailer_get_started",
              position: 1,
              header: "Become a retailer",
              subheader:
                "Click get access to add Synqsell's functionality onto your store and start importing products from our supplier network.",
              buttonText: "Get Access",
            },
            {
              key: "retailer_customize_profile",
              position: 2,
              header: "Customize your brand profile",
              subheader:
                "Showcase the information you would like to display in the retailer network for suppliers to see.",
              buttonText: "Edit brand profile",
            },
            {
              key: "retailer_request_partnership",
              position: 3,
              header: "Request a partnership with a supplier",
              subheader:
                "Partner with a supplier and get access to their price lists.",
              buttonText: "Explore suppliers",
            },
            {
              key: "retailer_import_product",
              position: 4,
              header: "Import a product to your store",
              subheader:
                "Easily import products from our partnered suppliers with just a few clicks. Inventory levels are automatically synchronized with your store, ensuring accurate stock information at all times.",
              buttonText: "Import products",
            },
          ]
        }
      },
    }),
    db.checklistTable.create({
      data: {
        position: 2,
        header: "Supplier Setup Guide",
        subheader:
          "Follow the steps below to become a supplier on our platform.",
        checklistItems: {
          create: [
            {
              key: "supplier_get_started",
              position: 1,
              header: "Request access to become a supplier",
              subheader:
                "Generate at least $5,000 USD in annual sales and request approval to become a supplier.",
              buttonText: "Request approval",
            },
            {
              key: "supplier_customize_profile",
              position: 2,
              header: "Customize your brand profile",
              subheader:
                "Showcase the information you would like to display in the supplier network for retailers to see.",
              buttonText: "Edit brand profile",
            },
            {
              key: "supplier_manage_zones",
              position: 3,
              header: "Manage your shipping zones and rates",
              subheader:
                "Determine the shipping costs you want to charge for your products.",
              buttonText: "Edit shipping rates",
            },
            {
              key: "supplier_create_price_list",
              position: 4,
              header: "Create a price list",
              subheader:
                "Create a price list, which will be shown in your brand profile. A private price list will only be shown to retailers you invite.",
              buttonText: "Create price list",
            },
            {
              key: "supplier_explore_network",
              position: 5,
              header: "Request a partnership with a retailer",
              subheader:
                "Connect with interested retailers or reach out to those in our network to explore partnership opportunities.",
              buttonText: "Explore retailer network",
            },
          ]
        }
      },
    }),
  ]);
}

main()
  .then(async () => {
    await db.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })