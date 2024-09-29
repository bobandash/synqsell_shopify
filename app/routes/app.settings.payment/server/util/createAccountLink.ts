import { stripe } from '~/routes/singletons';

async function createAccountLink(accountId: string, appPaymentUrl: string) {
  try {
    // refresh url should be the endpoint to generate a new account link with the same account id parameter
    // we're going to make the refresh url into the appPaymentUrl with the accountId as a parameter
    // if the accountId exists as a parameter, the loader is going to generate a new account link and pass it
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appPaymentUrl}?accountId=${accountId}`,
      return_url: appPaymentUrl,
      type: 'account_onboarding',
    });
    return accountLink;
  } catch (error) {
    throw new Error(
      'An error occurred when calling the Stripe API to create an account link:',
      error as Error,
    );
  }
}

export default createAccountLink;
