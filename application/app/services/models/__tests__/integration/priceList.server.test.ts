import {
  createTestGeneralPriceListWithProducts,
  generatePriceList,
} from '@db/factories/pricelist.factories';
import { simpleFaker } from '@faker-js/faker';
import type { PriceList, Session } from '@prisma/client';
import {
  deletePriceListBatch,
  getAllPriceLists,
  getGeneralPriceList,
  getPriceList,
  getRetailerIds,
  hasGeneralPriceList,
  isValidPriceList,
  userHasPriceList,
} from '../../priceList.server';
import db from '~/db.server';
import { PRICE_LIST_PRICING_STRATEGY } from '~/constants';
import { createTestSession } from '@db/factories/session.factories';
import { generatePartnership } from '@db/factories/partnership.factories';

describe('Price List', () => {
  let generalPriceList: PriceList;
  let session: Session;
  const nonexistentId = simpleFaker.string.uuid();

  beforeEach(async () => {
    const res = await createTestGeneralPriceListWithProducts();
    session = res.session;
    generalPriceList = res.priceList;
  });

  describe('isValidPriceList', () => {
    it('should return true if price list exists', async () => {
      const res = await isValidPriceList(generalPriceList.id);
      expect(res).toBe(true);
    });

    it('should return false if nonexistent price list is passed', async () => {
      const res = await isValidPriceList(nonexistentId);
      expect(res).toBe(false);
    });
  });

  describe('getPriceList', () => {
    it('should return price list if valid', async () => {
      const res = await getPriceList(generalPriceList.id);
      expect(res).toEqual(generalPriceList);
    });

    it('should throw error if price list does not exist', async () => {
      await expect(getPriceList(nonexistentId)).rejects.toThrow();
    });
  });

  describe('hasGeneralPriceList', () => {
    it('should return true if general price list exists', async () => {
      const res = await hasGeneralPriceList(session.id);
      expect(res).toBe(true);
    });

    it('should return false if general price list does not exist', async () => {
      await db.priceList.delete({
        where: {
          id: generalPriceList.id,
        },
      });
      const res = await hasGeneralPriceList(session.id);
      expect(res).toBe(false);
    });

    it('should return false if nonexistent id is passed', async () => {
      const res = await hasGeneralPriceList(nonexistentId);
      expect(res).toBe(false);
    });
  });

  describe('getGeneralPriceList', () => {
    it('should return general price list if exists', async () => {
      const res = await getGeneralPriceList(session.id);
      expect(res).toEqual(generalPriceList);
    });

    it('should throw error if general price list does not exist', async () => {
      await expect(getGeneralPriceList(nonexistentId)).rejects.toThrow();
    });
  });

  describe('userHasPriceList', () => {
    it('should return true if user has price list', async () => {
      const res = await userHasPriceList(session.id, generalPriceList.id);
      expect(res).toBe(true);
    });

    it('should throw false if price list id is invalid', async () => {
      const res = await userHasPriceList(session.id, nonexistentId);
      expect(res).toBe(false);
    });

    it('should throw false if session id is invalid', async () => {
      const res = await userHasPriceList(nonexistentId, generalPriceList.id);
      expect(res).toBe(false);
    });
  });

  describe('deletePriceListBatch', () => {
    it('should not delete any price lists if price list id is invalid', async () => {
      const numPriceListBefore = await db.priceList.count({
        where: { supplierId: session.id },
      });
      await deletePriceListBatch([nonexistentId], session.id);
      const numPriceListAfter = await db.priceList.count({
        where: { supplierId: session.id },
      });
      expect(numPriceListAfter).toBe(numPriceListBefore);
    });

    it('should be able to delete single price list', async () => {
      await deletePriceListBatch([generalPriceList.id], session.id);
      const numPriceList = await db.priceList.count({
        where: { supplierId: session.id },
      });
      expect(numPriceList).toBe(0);
    });

    it('should be able to delete multiple price lists', async () => {
      const newPriceList = await generatePriceList(
        session.id,
        false,
        PRICE_LIST_PRICING_STRATEGY.WHOLESALE,
      );
      const numPriceListBefore = await db.priceList.count({
        where: { supplierId: session.id },
      });
      await deletePriceListBatch(
        [generalPriceList.id, newPriceList.id],
        session.id,
      );
      const numPriceListAfter = await db.priceList.count({
        where: { supplierId: session.id },
      });
      expect(numPriceListBefore).toBe(2);
      expect(numPriceListAfter).toBe(0);
    });
  });
  describe('getAllPriceLists', () => {
    it('should return all price lists supplier has', async () => {
      const newPriceList = await generatePriceList(
        session.id,
        false,
        PRICE_LIST_PRICING_STRATEGY.WHOLESALE,
      );

      const allPriceLists = await getAllPriceLists(session.id);
      const priceListIds = allPriceLists.flatMap(({ id }) => id);
      expect(allPriceLists).toHaveLength(2);
      expect(priceListIds).toEqual([generalPriceList.id, newPriceList.id]);
    });

    it('should return no price lists if supplier id is invalid', async () => {
      const allPriceLists = await getAllPriceLists(nonexistentId);
      expect(allPriceLists).toHaveLength(0);
    });
  });

  describe('getRetailerIds', () => {
    it('should throw error if price list id is invalid', async () => {
      await expect(getRetailerIds(nonexistentId)).rejects.toThrow();
    });

    it('should return all retailers that have partnerships with the price list', async () => {
      const retailerOne = await createTestSession();
      const retailerTwo = await createTestSession();
      await generatePartnership(retailerOne.id, session.id, {
        priceLists: {
          connect: {
            id: generalPriceList.id,
          },
        },
      });
      await generatePartnership(retailerTwo.id, session.id, {
        priceLists: {
          connect: {
            id: generalPriceList.id,
          },
        },
      });
      const retailerIds = await getRetailerIds(generalPriceList.id);
      expect(retailerIds).toHaveLength(2);
      expect(retailerIds).toEqual([retailerOne.id, retailerTwo.id]);
    });
  });
});
