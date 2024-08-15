import db from "~/db.server";

// return data for price list index table
// export async function getAllPriceLists(sessionId: string) {
// try {
//   const priceLists = await db.priceList.findMany({
//     where: {
//       supplierId: sessionId,
//     },
//     select: {
//       id: true,
//       name: true,
//     },
//   });

// const headings: NonEmptyArray<IndexTableHeading> = [
//   { title: "Name" },
//   { title: "Type" },
//   { title: "Retailers" },
//   { title: "Units Sold" },
//   { title: "Sales Generated" },
//   { title: "Pricing Strategy" },
// ];

// model PriceList {
//   id                String              @id @default(uuid())
//   createdAt         DateTime            @default(now())
//   isGeneric         Boolean
//   pricingStrategy   String
//   Session           Session             @relation(fields: [supplierId], references: [id])
//   supplierId        String
//   Product           Product[]
//   PriceListRetailer PriceListRetailer[]
// }

// // Keeps track of the retailers in the price list
// model PriceListRetailer {
//   id          String    @id @default(uuid())
//   PriceList   PriceList @relation(fields: [priceListId], references: [id])
//   priceListId String
//   Session     Session   @relation(fields: [retailerId], references: [id])
//   retailerId  String
// }
//   } catch {}
// }
