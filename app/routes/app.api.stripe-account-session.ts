import { type ActionFunctionArgs, json } from '@remix-run/node';
import { stripe } from './singletons';
import { StatusCodes } from 'http-status-codes';

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { account } = await request.json();
    const accountSession = await stripe.accountSessions.create({
      account: account,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    return json(
      { client_secret: accountSession.client_secret },
      { status: StatusCodes.OK },
    );
  } catch (error) {
    console.error('Error creating account session:', error);
    return json(
      { error: 'Failed to create account session' },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
};
