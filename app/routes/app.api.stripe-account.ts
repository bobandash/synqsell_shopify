import { type ActionFunctionArgs, json } from '@remix-run/node';
import { stripe } from './singletons';
import { StatusCodes } from 'http-status-codes';

// eslint-disable-next-line no-empty-pattern
export const action = async ({}: ActionFunctionArgs) => {
  try {
    // TODO: research all potential options to manage their payment and account details
    const account = await stripe.accounts.create({});
    return json({ account: account.id }, { status: StatusCodes.OK });
  } catch (error) {
    console.error(
      'An error occurred when calling the Stripe API to create an account:',
      error,
    );
    return json(
      {
        error:
          "'An error occurred when calling the Stripe API to create an account.",
      },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
};
