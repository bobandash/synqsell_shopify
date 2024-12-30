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
import { PRICE_LIST_PRICING_STRATEGY } from "@db/constants";
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
} from "@prisma/client";

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
  billingTransactionRetailer: BillingTransaction;
  billingTransactionSupplier: BillingTransaction;
};

export const generateOrder = async (
  retailerId: string,
  supplierId: string,
  overrides = {}
) => {
  const data = generateOrderData(retailerId, supplierId);
  return db.order.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateOrderLineItem = async (
  orderId: string,
  priceListId?: string,
  overrides = {}
) => {
  const data = generateOrderLineItemData(orderId, priceListId);
  return db.orderLineItem.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateFulfillment = async (orderId: string, overrides = {}) => {
  const data = generateFulfillmentData(orderId);
  return db.fulfillment.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generatePayment = async (
  orderId: string,
  fulfillmentId: string,
  overrides = {}
) => {
  const data = generatePaymentData(orderId, fulfillmentId);
  return db.payment.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateBillingTransaction = async (
  paymentId: string,
  sessionId?: string,
  overrides = {}
) => {
  const data = generateBillingTransactionData(paymentId, sessionId);
  return db.billingTransaction.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

// creates everything from price list to ordered item
export async function createTestOrderWithEntireFlow(): Promise<TestOrderEntireFlow> {
  const supplier = await createTestSession();
  const retailer = await createTestSession();
  const priceList = await generatePriceList(
    supplier.id,
    true,
    PRICE_LIST_PRICING_STRATEGY.MARGIN
  );
  const product = await generateProduct(priceList.id);
  const variant = await generateVariant(product.id);
  const inventoryItem = await generateInventoryItem(variant.id);
  const importedProduct = await generateImportedProduct(
    product.id,
    retailer.id
  );
  const importedVariant = await generateImportedVariant(
    variant.id,
    importedProduct.id
  );
  const importedInventoryItem = await generateImportedInventoryItem(
    inventoryItem.id,
    importedVariant.id
  );
  const order = await generateOrder(retailer.id, supplier.id);
  const orderLineItem = await generateOrderLineItem(order.id, priceList.id);
  const fulfillment = await generateFulfillment(order.id);
  const payment = await generatePayment(order.id, fulfillment.id);
  const billingTransactionRetailer = await generateBillingTransaction(
    payment.id,
    retailer.id
  );
  const billingTransactionSupplier = await generateBillingTransaction(
    payment.id,
    supplier.id
  );

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
  };
}
