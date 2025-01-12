import db from '~/db.server';
import { v4 as uuidv4 } from 'uuid';
import { createTestCarrierService } from '@db/factories/carrierService.factories';
import {
  createCarrierService,
  deleteCarrierService,
  userGetCarrierService,
  userHasCarrierService,
} from '../../carrierService.server';
import { createTestSession } from '@db/factories/session.factories';

describe('Carrier Service', () => {
  const nonExistentRetailerId = uuidv4();
  describe('userHasCarrierService', () => {
    it('should return true when carrier service is added to retailer', async () => {
      const { retailer } = await createTestCarrierService();
      const hasCarrierService = await userHasCarrierService(retailer.id);
      expect(hasCarrierService).toBe(true);
    });

    it('should return false if carrier service is not added to retailer', async () => {
      const session = await createTestSession();
      const hasCarrierService = await userHasCarrierService(session.id);
      expect(hasCarrierService).toBe(false);
    });

    it('should return false if retailerId input is incorrect', async () => {
      await createTestCarrierService();
      const hasCarrierService = await userHasCarrierService(
        nonExistentRetailerId,
      );
      expect(hasCarrierService).toBe(false);
    });
  });

  describe('userGetCarrierService', () => {
    it('should throw if carrier service is not found', async () => {
      const session = await createTestSession();
      await expect(userGetCarrierService(session.id)).rejects.toThrow();
    });

    it('should throw if random retailer id is inputted', async () => {
      await expect(
        userGetCarrierService(nonExistentRetailerId),
      ).rejects.toThrow();
    });

    it('should return carrier service if found', async () => {
      const { retailer, carrierService: newCarrierService } =
        await createTestCarrierService();
      const carrierService = await userGetCarrierService(retailer.id);
      expect(carrierService).toEqual(newCarrierService);
    });
  });

  describe('createCarrierService', () => {
    it('should successfully add carrier service to retailerId', async () => {
      const shopifyCarrierServiceId = 'test-carrier-service-id';
      const session = await createTestSession();
      await createCarrierService(session.id, shopifyCarrierServiceId);
      const hasCarrierService =
        (await db.carrierService.count({
          where: {
            retailerId: session.id,
          },
        })) > 0;
      expect(hasCarrierService).toBe(true);
    });

    it(`should fail when retailer doesn't exist`, async () => {
      await expect(
        createCarrierService(nonExistentRetailerId, 'test-carrier-service-id'),
      ).rejects.toThrow();
    });

    it(`should only be able to add a single carrier service at a time`, async () => {
      const session = await createTestSession();
      await createCarrierService(session.id, 'carrier-service-1');
      await expect(
        createCarrierService(session.id, 'carrier-service-2'),
      ).rejects.toThrow();
    });

    it(`should store carrier service properly`, async () => {
      const shopifyCarrierServiceId = 'test-carrier-service-id';
      const session = await createTestSession();
      await createCarrierService(session.id, shopifyCarrierServiceId);
      const carrierService = await db.carrierService.findFirst({
        where: { retailerId: session.id },
      });
      expect(carrierService).toMatchObject({
        retailerId: session.id,
        shopifyCarrierServiceId,
      });
    });
  });

  describe('deleteCarrierService', () => {
    it('should delete carrier service properly', async () => {
      const { retailer } = await createTestCarrierService();
      await deleteCarrierService(retailer.id);
      const carrierServiceCount = await db.carrierService.count({
        where: {
          retailerId: retailer.id,
        },
      });
      expect(carrierServiceCount).toBe(0);
    });

    it('should throw error if no carrier service can be deleted', async () => {
      await expect(
        deleteCarrierService(nonExistentRetailerId),
      ).rejects.toThrow();
    });
  });
});
