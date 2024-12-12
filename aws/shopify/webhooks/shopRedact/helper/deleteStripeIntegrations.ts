import { PoolClient } from 'pg';
import { getStripe } from '../singletons/stripe';
import { getStripeAccountId, hasStripeConnectAccount } from '/opt/nodejs/models/stripeConnectAccount';
import { hasStripeCustomerAccount, getStripeCustomerId } from '/opt/nodejs/models/stripeCustomerAccount';

// ==============================================================================================================
// START: FUNCTIONS FOR REMOVING INTEGRATION RELATED TO STRIPE CONNECT
// ==============================================================================================================

async function deleteStripeConnectAccount(supplierId: string, client: PoolClient) {
    const stripe = await getStripe();
    const stripeConnectAccountId = await getStripeAccountId(supplierId, client);
    // deleting stripe connect accounts is not possible for negative balances, but it shouldn't be possible to have negative balances for a supplier
    // because the current flow is for suppliers to only receive money
    stripe.accounts.del(stripeConnectAccountId);
}

// ==============================================================================================================
// START: FUNCTIONS FOR REMOVING INTEGRATION RELATED TO STRIPE CUSTOMER
// ==============================================================================================================

async function deleteStripeCustomerAccount(retailerId: string, client: PoolClient) {
    const stripe = await getStripe();
    const stripeCustomerId = await getStripeCustomerId(retailerId, client);
    stripe.customers.del(stripeCustomerId);
}

// ==============================================================================================================
// START: MAIN FUNCTION
// ==============================================================================================================
async function deleteStripeIntegrations(sessionId: string, client: PoolClient) {
    const [stripeCustomerAccountExists, stripeConnectAccountExists] = await Promise.all([
        hasStripeCustomerAccount(sessionId, client),
        hasStripeConnectAccount(sessionId, client),
    ]);

    if (stripeCustomerAccountExists) {
        await deleteStripeConnectAccount(sessionId, client);
    }

    if (stripeConnectAccountExists) {
        await deleteStripeCustomerAccount(sessionId, client);
    }
}

export default deleteStripeIntegrations;
