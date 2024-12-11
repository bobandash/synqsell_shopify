import { simpleFaker } from '@faker-js/faker';
import type { Session } from '../../session.server';
import { createSampleSession } from '@factories/session.factories';
import { createSampleRole } from '@factories/role.factories';
import { ROLES } from '~/constants';
import {
  addRole,
  deleteRole,
  getRole,
  getRoleBatch,
  getRoles,
  hasRole,
  updateRoleVisibilityTx,
} from '../../roles.server';
import db from '~/db.server';

describe('Roles', () => {
  const nonExistentId = simpleFaker.string.uuid();
  let adminSession: Session;
  let supplierAndRetailer: Session;
  beforeEach(async () => {
    adminSession = await createSampleSession({
      id: simpleFaker.string.uuid(),
    });
    supplierAndRetailer = await createSampleSession({
      id: simpleFaker.string.uuid(),
    });
    await Promise.all([
      createSampleRole(supplierAndRetailer.id, ROLES.RETAILER),
      createSampleRole(supplierAndRetailer.id, ROLES.SUPPLIER),
      createSampleRole(adminSession.id, ROLES.ADMIN),
    ]);
  });

  describe('getRoles', () => {
    it('should return multiple roles if have two roles', async () => {
      const roles = await getRoles(supplierAndRetailer.id);
      const roleNames = roles.map(({ name }) => name);
      roleNames.sort();
      expect(roleNames).toEqual([ROLES.RETAILER, ROLES.SUPPLIER]);
      expect(roles).toHaveLength(2);
    });

    it('should return a single role if has one roles', async () => {
      const roles = await getRoles(adminSession.id);
      const roleNames = roles.map(({ name }) => name);
      expect(roleNames).toEqual([ROLES.ADMIN]);
      expect(roles).toHaveLength(1);
    });

    it(`should return no roles if session id doesn't exist`, async () => {
      const roles = await getRoles(nonExistentId);
      expect(roles).toHaveLength(0);
    });
  });

  describe('hasRole', () => {
    it('should return true if has role for multiple options', async () => {
      const [isRetailer, isSupplier] = await Promise.all([
        hasRole(supplierAndRetailer.id, ROLES.RETAILER),
        hasRole(supplierAndRetailer.id, ROLES.SUPPLIER),
      ]);
      expect(isRetailer).toBe(true);
      expect(isSupplier).toBe(true);
    });

    it('should return false if user does not have role', async () => {
      const isRetailer = await hasRole(adminSession.id, ROLES.RETAILER);
      expect(isRetailer).toBe(false);
    });

    it(`should return false if session id doesn't exist`, async () => {
      const isAdmin = await hasRole(nonExistentId, ROLES.ADMIN);
      expect(isAdmin).toBe(false);
    });
  });

  describe('getRole', () => {
    it('should return role if user has role', async () => {
      const role = await getRole(adminSession.id, ROLES.ADMIN);
      expect(role.sessionId).toBe(adminSession.id);
      expect(role.name).toBe(ROLES.ADMIN);
    });

    it('should throw error if user does not have role', async () => {
      await expect(
        getRole(supplierAndRetailer.id, ROLES.ADMIN),
      ).rejects.toThrow();
    });

    it('should throw error if session id is invalid', async () => {
      await expect(getRole(nonExistentId, ROLES.ADMIN)).rejects.toThrow();
    });
  });

  describe('getRoleBatch', () => {
    it('should return roles matching the specified name for given session IDs', async () => {
      const roles = await getRoleBatch(
        [adminSession.id, supplierAndRetailer.id],
        ROLES.RETAILER,
      );
      expect(roles.length).toBe(1);
      expect(roles[0].sessionId).toBe(supplierAndRetailer.id);
    });

    it('should return empty array if no role name is in given session IDs', async () => {
      const roles = await getRoleBatch(
        [supplierAndRetailer.id, nonExistentId],
        ROLES.ADMIN,
      );
      expect(roles.length).toBe(0);
    });
  });

  describe('addRole', () => {
    it(`should add role if user doesn't have the role.`, async () => {
      const initialCheck = await db.role.findFirst({
        where: {
          name: ROLES.ADMIN,
          sessionId: supplierAndRetailer.id,
        },
      });
      const adminRole = await addRole(supplierAndRetailer.id, ROLES.ADMIN);
      expect(initialCheck).toBe(null);
      expect(adminRole.name).toBe(ROLES.ADMIN);
      expect(adminRole.sessionId).toBe(supplierAndRetailer.id);
    });

    it('should throw error if attempting to create role for nonexistent session id', async () => {
      await expect(addRole(nonExistentId, ROLES.ADMIN)).rejects.toThrow();
    });
  });

  describe('deleteRole', () => {
    it(`should delete role from session.`, async () => {
      const adminRole = await db.role.create({
        data: {
          name: ROLES.ADMIN,
          sessionId: supplierAndRetailer.id,
        },
      });
      await deleteRole(adminRole.id);
      const deletedRole = await db.role.findFirst({
        where: { id: adminRole.id },
      });
      expect(deletedRole).toBeNull();
    });

    it('should throw error if deleting nonexistent role.', async () => {
      await expect(deleteRole(nonExistentId)).rejects.toThrow();
    });
  });

  describe('updateRoleVisibilityTx', () => {
    it(`should update role visibility.`, async () => {
      const role = await db.role.findFirstOrThrow({
        where: {
          sessionId: adminSession.id,
          name: ROLES.ADMIN,
        },
      });
      const initialVisibility = role.isVisibleInNetwork;
      await db.$transaction(async (tx) => {
        await updateRoleVisibilityTx(
          tx,
          adminSession.id,
          ROLES.ADMIN,
          !role.isVisibleInNetwork,
        );
      });
      const updatedRole = await db.role.findFirstOrThrow({
        where: {
          id: role.id,
        },
      });
      expect(updatedRole.isVisibleInNetwork).toBe(!initialVisibility);
    });

    it('should throw error if passing in nonexistent sessionId.', async () => {
      await expect(
        db.$transaction(async (tx) => {
          await updateRoleVisibilityTx(tx, nonExistentId, ROLES.ADMIN, false);
        }),
      ).rejects.toThrow();
    });

    it('should throw error if passing in nonexistent role.', async () => {
      await expect(
        db.$transaction(async (tx) => {
          await updateRoleVisibilityTx(
            tx,
            adminSession.id,
            ROLES.RETAILER,
            false,
          );
        }),
      ).rejects.toThrow();
    });
  });
});

// // should not update if role doesn't exist
// export async function updateRoleVisibilityTx(
//   tx: Prisma.TransactionClient,
//   sessionId: string,
//   role: string,
//   isVisibleInNetwork: boolean,
// ) {
//   const currentRole = await getRole(sessionId, role);
//   const { id } = currentRole;
//   await tx.role.update({
//     where: {
//       id,
//     },
//     data: {
//       isVisibleInNetwork,
//     },
//   });
// }
