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
  getRetailerSessionFromOrderId,
  getSessionFromId,
  getSessionFromShop,
  updateUninstalledStatus,
} from "../../session";
import {
  createTestOrderWithEntireFlow,
  TestOrderEntireFlow,
} from "@db/factories/order.factories";

describe("Session Functions", () => {
  let database: DatabaseSetup;
  const nonExistentId = simpleFaker.string.uuid();
  beforeEach(async () => {
    database = await setupDatabase();
  });

  afterEach(() => {
    disconnectClient(database.client);
  });

  afterAll(async () => {
    teardownPool(database.pool);
  });

  describe("Session w/out order setup", () => {
    let session: Session;
    beforeEach(async () => {
      session = await createTestSession();
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
        await expect(
          getSessionFromShop(nonExistentId, client)
        ).rejects.toThrow();
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

  describe("Session with order", () => {
    let orderEntireFlowDetails: TestOrderEntireFlow;
    const nonExistentId = simpleFaker.string.uuid();
    beforeEach(async () => {
      orderEntireFlowDetails = await createTestOrderWithEntireFlow();
    });

    describe("getRetailerSessionFromSupplierOrder", () => {
      it("should return retailer session from order", async () => {
        const { client } = database;
        const { order, retailer } = orderEntireFlowDetails;
        const res = await getRetailerSessionFromOrderId(order.id, client);
        expect(res).toMatchObject({ ...retailer });
      });

      it("should throw error if order id is invalid", async () => {
        const { client } = database;
        await expect(
          getRetailerSessionFromOrderId(nonExistentId, client)
        ).rejects.toThrow("No retailer session exists.");
      });
    });

    describe("getRetailerSessionFromOrderId", () => {
      it("should return retailer session from order", async () => {
        const { client } = database;
        const { order, retailer } = orderEntireFlowDetails;
        const res = await getRetailerSessionFromOrderId(order.id, client);
        expect(res).toMatchObject({ ...retailer });
      });

      it("should throw error if order id is not valid", async () => {
        const { client } = database;
        await expect(
          getRetailerSessionFromOrderId(nonExistentId, client)
        ).rejects.toThrow("No retailer session exists.");
      });
    });
  });
});
