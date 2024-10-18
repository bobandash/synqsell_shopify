# SynqSell Application

This section stores the code for the embedded iFrame on Shopify.

To reference how to set up the project, please click <a href="https://github.com/bobandash/synqsell_shopify">here</a>.

## Common Commands

Here are a list of common commands used for development.

- To run the application
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
