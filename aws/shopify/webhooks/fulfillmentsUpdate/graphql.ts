export const CANCEL_FULFILLMENT_MUTATION = `#graphql
  mutation fulfillmentCancel($id: ID!) {
    fulfillmentCancel(id: $id) {
      fulfillment {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CREATE_FULFILLMENT_FULFILLMENT_ORDER_MUTATION = `#graphql
  mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
    fulfillmentCreateV2(fulfillment: $fulfillment) {
      fulfillment {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const OPEN_FULFILLMENT_ORDER_MUTATION = `#graphql
  mutation fulfillmentOrderOpen($id: ID!) {
    fulfillmentOrderOpen(id: $id) {
      fulfillmentOrder {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const USAGE_CHARGE_MUTATION = `#graphql
  mutation appUsageRecordCreate($description: String!, $price: MoneyInput!, $subscriptionLineItemId: ID!) {
    appUsageRecordCreate(description: $description, price: $price, subscriptionLineItemId: $subscriptionLineItemId) {
      userErrors {
        field
        message
      }
      appUsageRecord {
        id
      }
    }
  }
`;
