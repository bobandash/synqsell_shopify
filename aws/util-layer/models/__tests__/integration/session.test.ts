import { createTestSession } from "@db/factories/session.factories";
import { simpleFaker } from "@faker-js/faker/.";
import {
  DatabaseSetup,
  disconnectClient,
  setupDatabase,
  teardownPool,
} from "./setup/db-setup";
import db from "@db/test-db";
import { Session } from "@prisma/client";
import {
  deleteSession,
  getSessionFromId,
  getSessionFromShop,
  updateUninstalledStatus,
} from "../../session";

describe("Session", () => {
  let session: Session;
  let database: DatabaseSetup;
  const nonExistentId = simpleFaker.string.uuid();
  beforeEach(async () => {
    database = await setupDatabase();
    session = await createTestSession();
  });

  afterEach(() => {
    disconnectClient(database.client);
  });

  afterAll(async () => {
    teardownPool(database.pool);
  });

  describe("getSessionFromShop", () => {
    it("should return session from shop", async () => {
      const { shop } = session;
      const { client } = database;
      const res = await getSessionFromShop(shop, client);
      expect(res).toMatchObject({ ...session });
    });

    it("should throw error when shop does not exist", async () => {
      const { client } = database;
      await expect(getSessionFromShop(nonExistentId, client)).rejects.toThrow();
    });
  });

  describe("getSessionFromId", () => {
    it("should return session from id", async () => {
      const { id } = session;
      const { client } = database;
      const res = await getSessionFromId(id, client);
      expect(res).toMatchObject({ ...session });
    });

    it("should throw error when id does not exist", async () => {
      const { client } = database;
      await expect(getSessionFromId(nonExistentId, client)).rejects.toThrow();
    });
  });

  describe("updateUninstalledStatus", () => {
    it("should update app uninstalled status", async () => {
      const { id, isAppUninstalled } = session;
      const { client } = database;
      await updateUninstalledStatus(id, !isAppUninstalled, client);
      const newSession = await db.session.findFirst({
        where: { id },
      });
      expect(newSession?.isAppUninstalled).toBe(!isAppUninstalled);
    });

    it("should not throw error if session id does not exist", async () => {
      const { client } = database;
      await updateUninstalledStatus(nonExistentId, false, client);
    });
  });

  describe("deleteSession", () => {
    it("should properly delete session", async () => {
      const { id } = session;
      const { client } = database;
      await deleteSession(id, client);
      const sessionExists =
        (await db.session.count({
          where: { id },
        })) > 0;
      expect(sessionExists).toBe(false);
    });

    it("should not throw error if session id does not exist", async () => {
      const { client } = database;
      await deleteSession(nonExistentId, client);
    });
  });
});

// // get session from order props
// export async function getRetailerSessionFromSupplierOrder(
//   supplierShopifyOrderId: string,
//   client: PoolClient
// ) {
//   const query = `
//       SELECT "Session".* FROM "Order"
//       INNER JOIN "Session" ON "Session"."id" = "Order"."retailerId"
//       WHERE "supplierShopifyOrderId" = $1
//       LIMIT 1
//   `;
//   const res = await client.query(query, [supplierShopifyOrderId]);
//   if (res.rows.length === 0) {
//     throw new Error("No retailer session exists for " + supplierShopifyOrderId);
//   }
//   return res.rows[0] as Session;
// }

// export async function getRetailerSessionFromOrderId(
//   orderId: string,
//   client: PoolClient
// ) {
//   const query = `
//       SELECT "Session".* FROM "Order"
//       INNER JOIN "Session" ON "Order"."retailerId" = "Session"."id"
//       WHERE "Order"."id" = $1
//   `;
//   const res = await client.query(query, [orderId]);
//   if (res.rows.length === 0) {
//     throw new Error(`No retailer session exists for dbOrderId ${orderId}.`);
//   }
//   return res.rows[0] as Session;
// }
