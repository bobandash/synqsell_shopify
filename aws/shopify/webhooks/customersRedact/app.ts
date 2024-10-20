import { APIGatewayProxyResult } from "aws-lambda";
import { ShopifyEvent } from "./types";

export const lambdaHandler = async (
  event: ShopifyEvent
): Promise<APIGatewayProxyResult> => {
  console.warn("Compliance event", {
    type: "customers/redact",
    shopId: event.shop_id,
    shop_domain: event.shop_domain,
    customerId: event.customer.id,
    orders: event.orders_to_redact,
  });
  return {
    statusCode: 200,
    body: JSON.stringify({
      message:
        "SynqSell currently does not store any customer data in its database, so no data needs to be redacted.",
    }),
  };
};
