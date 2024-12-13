import { ShopifyEvent } from "./types";

export const lambdaHandler = async (
  event: ShopifyEvent
) => {
  console.warn("Compliance event",  event);
  return;
};
