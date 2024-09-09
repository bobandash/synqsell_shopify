import { object } from 'yup';
import { priceListIdSchema, sessionIdSchema } from '~/schemas/models';
import {
  getSupplierRetailerPartnership,
  isSupplierRetailerPartnered,
} from '~/services/models/partnership';
import {
  getGeneralPriceList,
  getPriceList,
  hasGeneralPriceList,
} from '~/services/models/priceList';
import { errorHandler } from '~/services/util';
import db from '~/db.server';

const getPriceListsWithAccessSchema = object({
  priceListId: priceListIdSchema,
  retailerId: sessionIdSchema,
});

// just need price list id and price list name for ui
export type PriceListWithAccess = {
  id: string;
  name: string;
};

async function getGeneralPriceListFormatted(supplierId: string) {
  const generalPriceListExists = hasGeneralPriceList(supplierId);
  if (!generalPriceListExists) {
    return null;
  }
  const generalPriceList = await getGeneralPriceList(supplierId);
  const generalPriceListToAppend = {
    id: generalPriceList.id,
    name: generalPriceList.name,
  };
  return generalPriceListToAppend;
}

async function getPrivatePriceListsWithAccessFormatted(
  retailerId: string,
  supplierId: string,
): Promise<PriceListWithAccess[]> {
  let privatePriceListsWithAccess: PriceListWithAccess[] = [];
  const isPartnered = await isSupplierRetailerPartnered(retailerId, supplierId);
  if (!isPartnered) {
    return privatePriceListsWithAccess;
  }
  const partnership = await getSupplierRetailerPartnership(
    retailerId,
    supplierId,
  );
  privatePriceListsWithAccess = await db.priceList.findMany({
    where: {
      partnerships: {
        some: {
          id: partnership.id,
        },
      },
      isGeneral: false,
    },
    select: {
      id: true,
      name: true,
    },
  });
  return privatePriceListsWithAccess;
}

// obtains the price lists for the specific supplier we're on in the ui on that the retailer has access to
export async function getPriceListsWithAccessForSpecificSupplier(
  priceListId: string,
  retailerId: string,
) {
  try {
    await getPriceListsWithAccessSchema.validate({ priceListId, retailerId });
    const supplierId = (await getPriceList(priceListId)).supplierId;
    const priceListsWithAccess: PriceListWithAccess[] = [];

    const [generalPriceList, privatePriceLists] = await Promise.all([
      getGeneralPriceListFormatted(supplierId),
      getPrivatePriceListsWithAccessFormatted(retailerId, supplierId),
    ]);

    if (generalPriceList) {
      priceListsWithAccess.push(generalPriceList);
    }

    return priceListsWithAccess.concat(privatePriceLists);
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get price lists with access for specific supplier.',
      getPriceListsWithAccessForSpecificSupplier,
      { priceListId, retailerId },
    );
  }
}
