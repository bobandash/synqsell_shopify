import {
  generateBillingTransactionData,
  generateFulfillmentData,
  generateOrderData,
  generateOrderLineItemData,
  generatePaymentData,
} from "@db/fixtures";
import db from "@db/test-db";
import { createTestSession } from "./session.factories";
import {
  generateImportedInventoryItem,
  generateImportedProduct,
  generateImportedVariant,
  generateInventoryItem,
  generatePriceList,
  generateProduct,
  generateVariant,
} from "./pricelist.factories";
import { PRICE_LIST_PRICING_STRATEGY, ROLES } from "@db/constants";
import {
  Session,
  PriceList,
  Product,
  Variant,
  InventoryItem,
  ImportedProduct,
  ImportedVariant,
  ImportedInventoryItem,
  Order,
  OrderLineItem,
  Fulfillment,
  Payment,
  BillingTransaction,
  Billing,
  Role,
  FulfillmentService,
} from "@prisma/client";
import { generateRole } from "./role.factories";
import { generateBilling } from "./billing.factories";
import { Prisma, PrismaClient } from "@prisma/client";
import { generateFulfillmentService } from "./fulfillmentService.factories";
type DbClient = PrismaClient | Prisma.TransactionClient;

export type TestOrderEntireFlow = {
  supplier: Session;
  retailer: Session;
  priceList: PriceList;
  product: Product;
  variant: Variant;
  inventoryItem: InventoryItem;
  importedProduct: ImportedProduct;
  importedVariant: ImportedVariant;
  importedInventoryItem: ImportedInventoryItem;
  order: Order;
  orderLineItem: OrderLineItem;
  fulfillment: Fulfillment;
  payment: Payment;
  supplierBilling: Billing;
  retailerBilling: Billing;
  billingTransactionRetailer: BillingTransaction;
  billingTransactionSupplier: BillingTransaction;
  supplierRole: Role;
  retailerRole: Role;
  retailerFulfillmentService: FulfillmentService;
};

export const generateOrder = async (
  retailerId: string,
  supplierId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateOrderData(retailerId, supplierId);
  return await ctx.order.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateOrderLineItem = async (
  orderId: string,
  priceListId?: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateOrderLineItemData(orderId, priceListId);
  return await ctx.orderLineItem.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateFulfillment = async (
  orderId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateFulfillmentData(orderId);
  return await ctx.fulfillment.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generatePayment = async (
  orderId: string,
  fulfillmentId: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generatePaymentData(orderId, fulfillmentId);
  return await ctx.payment.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateBillingTransaction = async (
  paymentId: string,
  sessionId?: string,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateBillingTransactionData(paymentId, sessionId);
  return await ctx.billingTransaction.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

// creates everything from price list to ordered item
export async function createTestOrderWithEntireFlow(): Promise<TestOrderEntireFlow> {
  const res = await db.$transaction(async (tx) => {
    const [supplier, retailer] = await Promise.all([
      createTestSession({}, tx),
      createTestSession({}, tx),
    ]);
    const retailerFulfillmentService = await generateFulfillmentService(
      retailer.id,
      {},
      tx
    );

    const [supplierRole, retailerRole, supplierBilling, retailerBilling] =
      await Promise.all([
        generateRole(supplier.id, ROLES.SUPPLIER, true, {}, tx),
        generateRole(retailer.id, ROLES.RETAILER, true, {}, tx),
        generateBilling(supplier.id, {}, tx),
        generateBilling(retailer.id, {}, tx),
      ]);

    const priceList = await generatePriceList(
      supplier.id,
      true,
      PRICE_LIST_PRICING_STRATEGY.MARGIN,
      {},
      tx
    );

    const product = await generateProduct(priceList.id, {}, tx);
    const variant = await generateVariant(product.id, {}, tx);
    const inventoryItem = await generateInventoryItem(variant.id, {}, tx);

    const importedProduct = await generateImportedProduct(
      product.id,
      retailer.id,
      {},
      tx
    );
    const importedVariant = await generateImportedVariant(
      variant.id,
      importedProduct.id,
      {},
      tx
    );
    const importedInventoryItem = await generateImportedInventoryItem(
      inventoryItem.id,
      importedVariant.id,
      {},
      tx
    );

    const order = await generateOrder(retailer.id, supplier.id, {}, tx);
    const orderLineItem = await generateOrderLineItem(
      order.id,
      priceList.id,
      {},
      tx
    );
    const fulfillment = await generateFulfillment(order.id, {}, tx);
    const payment = await generatePayment(order.id, fulfillment.id, {}, tx);

    const [billingTransactionRetailer, billingTransactionSupplier] =
      await Promise.all([
        generateBillingTransaction(payment.id, retailer.id, {}, tx),
        generateBillingTransaction(payment.id, supplier.id, {}, tx),
      ]);

    return {
      supplier,
      retailer,
      priceList,
      product,
      variant,
      inventoryItem,
      importedProduct,
      importedVariant,
      importedInventoryItem,
      order,
      orderLineItem,
      fulfillment,
      payment,
      billingTransactionRetailer,
      billingTransactionSupplier,
      supplierBilling,
      retailerBilling,
      supplierRole,
      retailerRole,
      retailerFulfillmentService,
    };
  });

  return res;
}

export async function createNewVariantAndImportedVariant(
  dbProductId: string,
  dbImportedProductId: string
) {
  const newVariant = await generateVariant(dbProductId);
  const newInventoryItem = await generateInventoryItem(newVariant.id);
  const newImportedVariant = await generateImportedVariant(
    newVariant.id,
    dbImportedProductId
  );
  const newImportedInventoryItem = await generateImportedInventoryItem(
    newInventoryItem.id,
    newImportedVariant.id
  );

  return {
    newVariant,
    newInventoryItem,
    newImportedVariant,
    newImportedInventoryItem,
  };
}
