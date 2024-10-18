import { APIGatewayProxyResult } from "aws-lambda";
import { ShopifyEvent } from "./types";

export const lambdaHandler = async (
  event: ShopifyEvent
): Promise<APIGatewayProxyResult> => {
  console.warn("Compliance event", {
    type: "customers/data_request",
    shopId: event.shop_id,
    requestId: event.data_request,
    shop_domain: event.shop_domain,
    customerId: event.customer.id,
    orders: event.orders_requested,
  });
  return {
    statusCode: 200,
    body: JSON.stringify({
      message:
        "SynqSell currently does not store any customer data in its database.",
    }),
  };
};
