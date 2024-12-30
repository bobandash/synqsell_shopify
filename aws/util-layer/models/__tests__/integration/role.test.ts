import { createTestRole, TestRole } from "@db/factories/role.factories";
import { simpleFaker } from "@faker-js/faker/.";
import {
  DatabaseSetup,
  disconnectClient,
  setupDatabase,
  teardownPool,
} from "~/test-db-setup";
import { ROLES } from "../../../constants";
import { hasRole } from "../../role";
import { RolesOptions } from "@db/constants";

describe("Role", () => {
  let roleDetails: TestRole;
  let database: DatabaseSetup;
  const nonExistentId = simpleFaker.string.uuid();

  beforeEach(async () => {
    database = await setupDatabase();
    roleDetails = await createTestRole(ROLES.RETAILER, false);
  });

  afterEach(() => {
    disconnectClient(database.client);
  });

  afterAll(async () => {
    teardownPool(database.pool);
  });

  describe("hasRole", () => {
    it("should return true if session has role", async () => {
      const { session, role } = roleDetails;
      const { client } = database;
      const res = await hasRole(session.id, role.name as RolesOptions, client);
      expect(res).toBe(true);
    });

    it("should return false if role name is invalid", async () => {
      const { session } = roleDetails;
      const { client } = database;
      const res = await hasRole(
        session.id,
        nonExistentId as RolesOptions,
        client
      );
      expect(res).toBe(false);
    });

    it("should return false if session id is invalid", async () => {
      const { role } = roleDetails;
      const { client } = database;
      const res = await hasRole(
        nonExistentId,
        role.name as RolesOptions,
        client
      );
      expect(res).toBe(false);
    });
  });
});
