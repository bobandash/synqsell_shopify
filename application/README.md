# SynqSell Application

This section stores the code for the embedded iFrame on Shopify, where the users actually interact with the application.

To reference how to set up the project, please click <a href="https://github.com/bobandash/synqsell_shopify">here</a>.

A few things to note on how Shopify applications work and how SynqSell works in general:

- When the user signs up for the first time and authorizes the billing charges, the server automatically stores an offline access token for the user. This offline access token does not expire until the user uninstalls the application (which Shopify automatically revokes permissions for the offline access token).
- With the offline access token, the application can make calls to the GraphQL Admin API, which can do sensitive operations with the merchants store (e.g. create orders, mutate products, etc)

This application's code is designed to

1. Create a UI that allows:

   - Merchants to take on certain roles in the application (such as a supplier or a retailer)
   - Suppliers to list products from their store on SynqSell in price lists;
   - Retailers to view and import those products onto their store;
   - Merchants to partner with one another through customized price lists
   - Handle the app reinstallation flow (after the merchant uninstalled the app and reinstalled it)

2. Create tokens / other information necessary for the webhook processing in the AWS Lambda functions, such as:

   - Storefront access token and Carrier Service (which allows the app to call public data on the store, such as the Cart API, which fetches shipping rates)
   - Stripe Payments / Connect authorization, which allows merchants to automatically disburse funds to other merchants based on the agreed imported product margins

## Common Commands

Here are a list of common commands used for development (please view the package.json for a list of all commands).

- To run the application in development mode
  ```sh
  npm run config:use dev
  ```
  ```sh
  npm run dev
  ```
- To migrate any database changes
  ```sh
  npx prisma migrate dev
  ```
- To get types for Shopify GraphQL queries and mutations
  ```sh
  npm run graphql-codegen -- --watch
  ```
