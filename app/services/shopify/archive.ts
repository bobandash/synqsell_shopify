// // helper graphql queries for product information
// const ProductsQuery = (productIds: string[]) => {
//   const queryStr = getQueryStr(productIds);
//   return gql(
//     `
//     ${MODEL_3D_FIELDS_FRAGMENT},
//     ${VIDEO_FIELDS_FRAGMENT},
//     ${IMAGE_FIELDS_FRAGMENT}
//       query ProductUrlsQuery($query: String) {
//         products(query: $query) {
//           edges {
//             node {
//               id
//               category {
//                 id
//               }
//               productType
//               description
//               descriptionHtml
//               seo {
//                 description
//                 title
//               }
//               status
//               vendor
//               images(first: 20){
//                 edges{
//                   node{
//                     ...ImageFields
//                   }
//                 }
//               }
//               media(first: 20){
//                 edges {
//                   node {
//                     ...Model3dFields,
//                     ...VideoFields
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     `,
//     {
//       variables: {
//         query: queryStr,
//       },
//     },
//   );
// };

// function testQuery() {
//   return `
//     {
//       products {
//         edges {
//           node {
//             id
//             title
//           }
//         }
//       }
//     }
//     `;
// }

// // gets all required fields to mutate / create products on shopify
// export async function getProductCreationData(
//   products: CoreProductProps[],
//   sessionId: string,
//   graphql: GraphQL,
// ) {
//   try {
//     const productIds = products.map((product) => product.id);
//     const response = await graphql(
//       `
//         mutation bulkOperationGetProductDetailsQuery($query: String!) {
//           bulkOperationRunQuery(query: $query) {
//             bulkOperation {
//               id
//               status
//             }
//             userErrors {
//               field
//               message
//             }
//           }
//         }
//       `,
//       {
//         variables: {
//           query: testQuery(),
//         },
//       },
//     );

//     const data = await response.json();
//     console.log(data);
//   } catch (error) {
//     logger.error(error);
//     throw errorHandler(
//       error,
//       'Failed to make webhook to shopify with product data.',
//       getProductCreationData,
//       { sessionId },
//     );
//   }
// }
