import { PoolClient } from "pg";

type ImportedVariantDetail = {
  retailerShopifyVariantId: string;
  supplierShopifyVariantId: string;
  supplierId: string;
};

export async function getAllImportedVariants(
  retailerId: string,
  client: PoolClient
): Promise<ImportedVariantDetail[]> {
  const query = `
      SELECT 
      "ImportedVariant"."shopifyVariantId" as "retailerShopifyVariantId",
      "Variant"."shopifyVariantId" as "supplierShopifyVariantId",
      "PriceList"."supplierId" as "supplierId"
      FROM "ImportedVariant"
      INNER JOIN "ImportedProduct" ON "ImportedProduct"."id" = "ImportedVariant"."importedProductId"
      INNER JOIN "Product" ON "Product"."id" = "ImportedProduct"."prismaProductId"
      INNER JOIN "PriceList" ON "PriceList"."id" = "Product"."priceListId"
      INNER JOIN "Variant" ON "Variant"."id" = "ImportedVariant"."prismaVariantId"
      WHERE "ImportedProduct"."retailerId" = $1    
  `;
  const res = await client.query(query, [retailerId]);
  return res.rows as ImportedVariantDetail[];
}
