import {
  createTestFulfillmentService,
  TestFulfillmentService,
} from "@db/factories/fulfillmentService.factories";
import { simpleFaker } from "@faker-js/faker/.";
import {
  DatabaseSetup,
  disconnectClient,
  setupDatabase,
  teardownPool,
} from "./setup/db-setup";
import {
  getFulfillmentService,
  hasFulfillmentService,
} from "../../fulfillmentService";
import db from "@db/test-db";

describe("FulfillmentService", () => {
  let fulfillmentServiceDetails: TestFulfillmentService;
  let database: DatabaseSetup;
  const nonExistentId = simpleFaker.string.uuid();
  beforeEach(async () => {
    database = await setupDatabase();
    fulfillmentServiceDetails = await createTestFulfillmentService();
  });

  afterEach(() => {
    disconnectClient(database.client);
  });

  afterAll(async () => {
    teardownPool(database.pool);
  });

  describe("getFulfillmentService", () => {
    it("should return fulfillment service with valid session id", async () => {
      const { client } = database;
      const { session, fulfillmentService } = fulfillmentServiceDetails;
      const res = await getFulfillmentService(session.id, client);
      expect(res).toMatchObject(fulfillmentService);
    });

    it("should throw error if session id is not valid", async () => {
      const { client } = database;
      await expect(
        getFulfillmentService(nonExistentId, client)
      ).rejects.toThrow("No fulfillment service exists.");
    });
  });

  describe("hasFulfillmentService", () => {
    it("should return true if fulfillment service exists", async () => {
      const { client } = database;
      const { session } = fulfillmentServiceDetails;
      const res = await hasFulfillmentService(session.id, client);
      expect(res).toBe(true);
    });

    it("should return false if fulfillment service does not exists", async () => {
      const { client } = database;
      const { session } = fulfillmentServiceDetails;
      await db.fulfillmentService.delete({
        where: {
          sessionId: session.id,
        },
      });
      const res = await hasFulfillmentService(session.id, client);
      expect(res).toBe(false);
    });

    it("should return false if invalid session id is passed in", async () => {
      const { client } = database;
      const res = await hasFulfillmentService(nonExistentId, client);
      expect(res).toBe(false);
    });
  });
});
