// import db from '~/db.server';

// export async function userHasStripeCustomerAccount(retailerId: string) {
//   const stripeAccount = await db.stripeCustomerAccount.findFirst({
//     where: {
//       retailerId,
//     },
//   });
//   return stripeAccount !== null;
// }

// export async function addInitialStripeCustomerAccount(
//   retailerId: string,
//   stripeCustomerId: string,
// ) {
//   const newStripeCustomerAccount = db.stripeCustomerAccount.create({
//     data: {
//       retailerId,
//       stripeCustomerId,
//     },
//   });
//   return newStripeCustomerAccount;
// }

// export async function getStripeCustomerAccount(retailerId: string) {
//   const stripeCustomerAccount = db.stripeCustomerAccount.findFirstOrThrow({
//     where: {
//       retailerId,
//     },
//   });
//   return stripeCustomerAccount;
// }

// export async function userHasStripePaymentMethod(retailerId: string) {
//   const hasStripeCustomerAccount =
//     await userHasStripeCustomerAccount(retailerId);

//   if (!hasStripeCustomerAccount) {
//     return false;
//   }
//   const stripeCustomerAccount = await getStripeCustomerAccount(retailerId);
//   return stripeCustomerAccount.hasPaymentMethod;
// }

// export async function changePaymentMethodStatus(
//   retailerId: string,
//   hasPaymentMethod: boolean,
// ) {
//   await db.stripeCustomerAccount.update({
//     where: {
//       retailerId,
//     },
//     data: {
//       hasPaymentMethod,
//     },
//   });
// }
