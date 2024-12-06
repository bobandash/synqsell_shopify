import db from '~/db.server';
import { v4 as uuidv4 } from 'uuid';
import { createSampleCarrierService } from '@factories/carrierService.factories';
import { sampleSession } from '@fixtures/session.fixture';
import {
  createCarrierService,
  deleteCarrierService,
  userGetCarrierService,
  userHasCarrierService,
} from '../../carrierService.server';
import { createSampleSession } from '@factories/session.factories';

describe('Carrier Service', () => {
  const nonExistentRetailerId = uuidv4();
  describe('userHasCarrierService', () => {
    it('should return true when carrier service is added to retailer', async () => {
      await createSampleCarrierService();
      const hasCarrierService = await userHasCarrierService(sampleSession.id);
      expect(hasCarrierService).toBe(true);
    });

    it('should return false if carrier service is not added to retailer', async () => {
      const hasCarrierService = await userHasCarrierService(sampleSession.id);
      expect(hasCarrierService).toBe(false);
    });

    it('should return false if retailerId input is incorrect', async () => {
      await createSampleCarrierService();
      const hasCarrierService = await userHasCarrierService(
        nonExistentRetailerId,
      );
      expect(hasCarrierService).toBe(false);
    });
  });

  describe('userGetCarrierService', () => {
    it('should throw if carrier service is not found', async () => {
      await expect(userGetCarrierService(sampleSession.id)).rejects.toThrow();
    });

    it('should throw if random retailer id is inputted', async () => {
      await createSampleCarrierService();
      await expect(
        userGetCarrierService(nonExistentRetailerId),
      ).rejects.toThrow();
    });

    it('should return carrier service if found', async () => {
      const newCarrierService = await createSampleCarrierService();
      const carrierService = await userGetCarrierService(sampleSession.id);
      expect(carrierService).toEqual(newCarrierService);
    });
  });

  describe('createCarrierService', () => {
    it('should successfully add carrier service to retailerId', async () => {
      const shopifyCarrierServiceId = 'test-carrier-service-id';
      await createSampleSession();
      await createCarrierService(sampleSession.id, shopifyCarrierServiceId);
      const hasCarrierService =
        (await db.carrierService.count({
          where: {
            retailerId: sampleSession.id,
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
      await createSampleSession();
      await createCarrierService(sampleSession.id, 'carrier-service-1');
      await expect(
        createCarrierService(sampleSession.id, 'carrier-service-2'),
      ).rejects.toThrow();
    });

    it(`should store carrier service properly`, async () => {
      const shopifyCarrierServiceId = 'test-carrier-service-id';
      await createSampleSession();
      await createCarrierService(sampleSession.id, shopifyCarrierServiceId);
      const carrierService = await db.carrierService.findFirst({
        where: { retailerId: sampleSession.id },
      });
      expect(carrierService).toMatchObject({
        retailerId: sampleSession.id,
        shopifyCarrierServiceId,
      });
    });
  });

  describe('deleteCarrierService', () => {
    it('should delete carrier service properly', async () => {
      await createSampleCarrierService();
      await deleteCarrierService(sampleSession.id);
      const carrierServiceCount = await db.carrierService.count({
        where: {
          retailerId: sampleSession.id,
        },
      });
      expect(carrierServiceCount).toBe(0);
    });

    it('should throw error if no carrier service can be deleted', async () => {
      await expect(deleteCarrierService(sampleSession.id)).rejects.toThrow();
    });
  });
});
