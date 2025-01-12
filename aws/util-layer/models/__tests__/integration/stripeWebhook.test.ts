import { generateStripeWebhook } from "@db/factories/stripeWebhook.factories";
import { simpleFaker } from "@faker-js/faker/.";
import {
  DatabaseSetup,
  disconnectClient,
  setupDatabase,
  teardownPool,
} from "~/test-db-setup";
import db from "@db/test-db";
import type { StripeWebhook } from "@prisma/client";
import { hasProcessed, processWebhook } from "../../stripeWebhook";

describe("stripeWebhook", () => {
  let stripeWebhook: StripeWebhook;
  let database: DatabaseSetup;
  const nonExistentId = simpleFaker.string.uuid();
  beforeEach(async () => {
    database = await setupDatabase();
    stripeWebhook = await generateStripeWebhook();
  });

  afterEach(() => {
    disconnectClient(database.client);
  });

  afterAll(async () => {
    teardownPool(database.pool);
  });

  describe("hasProcessed", () => {
    it("should return false if webhook has not been processed", async () => {
      const { client } = database;
      const res = await hasProcessed(nonExistentId, client);
      expect(res).toBe(false);
    });

    it("should return true if webhook has been processed before", async () => {
      const { client } = database;
      const res = await hasProcessed(stripeWebhook.id, client);
      expect(res).toBe(true);
    });
  });

  describe("processWebhook", () => {
    it("should add id to processed webhooks", async () => {
      const { client } = database;
      const id = simpleFaker.string.uuid();
      await processWebhook(id, client);
      const numWebhook = await db.stripeWebhook.count({
        where: {
          id,
        },
      });
      expect(numWebhook).toBe(1);
    });

    it("should throw error if webhook id already is added before", async () => {
      const { client } = database;
      await expect(processWebhook(stripeWebhook.id, client)).rejects.toThrow();
    });
  });
});
