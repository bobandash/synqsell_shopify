import { ShopifyEvent } from "./types";
import {  logInfo } from '/opt/nodejs/utils/logger';


export const lambdaHandler = async (
  event: ShopifyEvent
) => {
  const shop = event.shop_domain
  logInfo("Requested customer data", {shop})
  return;
};
