import { parseGid } from '@shopify/admin-graphql-api-utilities';

function getQueryStr(shopifyIdList: string[]) {
  const productIdsQueryFmt = shopifyIdList.map((id) => `id:${parseGid(id)}`);
  const queryStr = `${productIdsQueryFmt.join(' OR ')}`;
  return queryStr;
}

export default getQueryStr;
