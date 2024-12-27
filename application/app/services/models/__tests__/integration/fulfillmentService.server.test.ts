// import db from '~/db.server';
import { createTestFulfillmentService } from '@factories/fulfillmentService.factories';
import {
  deleteFulfillmentService,
  getFulfillmentService,
  getOrCreateFulfillmentService,
  hasFulfillmentService,
  userGetFulfillmentService,
  userHasFulfillmentService,
} from '../../fulfillmentService.server';
import { simpleFaker } from '@faker-js/faker';
import db from '~/db.server';
import type { AllFulfillmentServicesQuery } from '~/types/admin.generated';
import type { FulfillmentService } from '@prisma/client';
import { createTestSession } from '@factories/session.factories';

describe('FulfillmentService', () => {
  const nonExistentId = simpleFaker.string.uuid();
  let fulfillmentService: FulfillmentService;
  let sessionId: string;

  beforeEach(async () => {
    const { session, fulfillmentService: newFulfillmentService } =
      await createTestFulfillmentService();
    sessionId = session.id;
    fulfillmentService = newFulfillmentService;
  });

  describe('hasFulfillmentService', () => {
    it('should return true when fulfillment service id is valid', async () => {
      const fulfillmentServiceExists = await hasFulfillmentService(
        fulfillmentService.id,
      );
      expect(fulfillmentServiceExists).toBe(true);
    });

    it('should return false when fulfillment service id is not valid', async () => {
      const fulfillmentServiceExists =
        await hasFulfillmentService(nonExistentId);
      expect(fulfillmentServiceExists).toBe(false);
    });
  });

  describe('getFulfillmentService', () => {
    it('should return fulfillment service when valid id is inputted', async () => {
      const res = await getFulfillmentService(fulfillmentService.id);
      expect(res).toMatchObject({
        id: fulfillmentService.id,
        sessionId: fulfillmentService.sessionId,
        shopifyFulfillmentServiceId:
          fulfillmentService.shopifyFulfillmentServiceId,
        shopifyLocationId: fulfillmentService.shopifyLocationId,
      });
    });

    it('should throw error when failed to find fulfillment service', async () => {
      await expect(getFulfillmentService(nonExistentId)).rejects.toThrow();
    });
  });

  describe('userHasFulfillmentService', () => {
    it('should return true when user has fulfillment service', async () => {
      const hasFulfillmentService = await userHasFulfillmentService(sessionId);
      expect(hasFulfillmentService).toBe(true);
    });

    it('should return false when user does not have fulfillment service', async () => {
      const hasFulfillmentService =
        await userHasFulfillmentService(nonExistentId);
      expect(hasFulfillmentService).toBe(false);
    });
  });

  describe('userGetFulfillmentService', () => {
    it('should return fulfillment service when valid session id is provided', async () => {
      const res = await userGetFulfillmentService(sessionId);
      expect(res).toMatchObject({
        id: fulfillmentService.id,
        sessionId: sessionId,
        shopifyFulfillmentServiceId:
          fulfillmentService.shopifyFulfillmentServiceId,
        shopifyLocationId: fulfillmentService.shopifyLocationId,
      });
    });

    it('should throw error when session id is invalid', async () => {
      await expect(userGetFulfillmentService(nonExistentId)).rejects.toThrow();
    });
  });

  describe('deleteFulfillmentService', () => {
    it('should delete fulfillment service when id is provided.', async () => {
      await deleteFulfillmentService(fulfillmentService.id);
      const numFulfillmentServices = await db.fulfillmentService.count({});
      expect(numFulfillmentServices).toBe(0);
    });

    it('should throw error when fulfillment service attempting to delete is invalid', async () => {
      await expect(deleteFulfillmentService(nonExistentId)).rejects.toThrow();
    });
  });

  describe('getOrCreateFulfillmentService', () => {
    const mockShopifyFulfillmentService = {
      id: simpleFaker.string.alphanumeric(10),
      location: {
        id: simpleFaker.string.alphanumeric(10),
      },
    } as AllFulfillmentServicesQuery['shop']['fulfillmentServices'][0];

    it('should get fulfillment service if exists, instead of creating new one', async () => {
      const res = await getOrCreateFulfillmentService(
        sessionId,
        mockShopifyFulfillmentService,
      );
      expect(res).toMatchObject({
        id: fulfillmentService.id,
        sessionId: sessionId,
        shopifyFulfillmentServiceId:
          fulfillmentService.shopifyFulfillmentServiceId,
        shopifyLocationId: fulfillmentService.shopifyLocationId,
      });
    });

    it(`should create fulfillment service if doesn't exist`, async () => {
      await db.fulfillmentService.deleteMany({});
      const newSession = await createTestSession();
      const res = await getOrCreateFulfillmentService(
        newSession.id,
        mockShopifyFulfillmentService,
      );
      expect(res).toMatchObject({
        sessionId: newSession.id,
        shopifyFulfillmentServiceId: mockShopifyFulfillmentService.id,
        shopifyLocationId: mockShopifyFulfillmentService.location?.id,
      });
    });
  });
});
