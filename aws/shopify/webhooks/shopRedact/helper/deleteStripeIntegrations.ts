import { PoolClient } from 'pg';
import { getStripe } from '../singletons/stripe';

// ==============================================================================================================
// START: FUNCTIONS FOR REMOVING INTEGRATION RELATED TO STRIPE CONNECT
// ==============================================================================================================
async function hasStripeConnectAccount(sessionId: string, client: PoolClient) {
    try {
        const query = `
          SELECT id FROM "StripeConnectAccount"
          WHERE "supplierId" = $1
        `;
        const res = await client.query(query, [sessionId]);
        return res.rows.length > 0;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to check if sessionId ${sessionId} has stripe connect account.`);
    }
}

async function getStripeConnectAccount(sessionId: string, client: PoolClient) {
    try {
        const query = `
          SELECT "stripeAccountId" FROM "StripeConnectAccount"
          WHERE "supplierId" = $1
        `;
        const res = await client.query(query, [sessionId]);
        if (res.rows.length === 0) {
            throw new Error(`No stripe connect account found for session ${sessionId}.`);
        }
        return res.rows[0].stripeAccountId as string;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to retrieve stripe connect account id from session ${sessionId}.`);
    }
}

async function deleteStripeConnectAccount(sessionId: string, client: PoolClient) {
    try {
        const stripe = await getStripe();
        const stripeConnectAccountId = await getStripeConnectAccount(sessionId, client);
        // deleting stripe connect accounts is not possible for negative balances, but it shouldn't be possible to have negative balances for a supplier
        // because the current flow is for suppliers to only receive money
        stripe.accounts.del(stripeConnectAccountId);
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to delete stripe connect account for session ${sessionId}.`);
    }
}

// ==============================================================================================================
// START: FUNCTIONS FOR REMOVING INTEGRATION RELATED TO STRIPE CUSTOMER
// ==============================================================================================================
async function hasStripeCustomerAccount(sessionId: string, client: PoolClient) {
    try {
        const query = `
          SELECT id FROM "StripeCustomerAccount"
          WHERE "retailerId" = $1
        `;
        const res = await client.query(query, [sessionId]);
        return res.rows.length > 0;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to check if sessionId ${sessionId} has stripe customer account.`);
    }
}

async function getStripeCustomerAccount(sessionId: string, client: PoolClient) {
    try {
        const query = `
          SELECT "stripeCustomerId" FROM "StripeCustomerAccount"
          WHERE "retailerId" = $1
        `;
        const res = await client.query(query, [sessionId]);
        if (res.rows.length === 0) {
            throw new Error(`No stripe customer account found for session ${sessionId}.`);
        }
        return res.rows[0].stripeCustomerId as string;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to retrieve stripe customer account for session ${sessionId}.`);
    }
}

async function deleteStripeCustomerAccount(sessionId: string, client: PoolClient) {
    try {
        const stripe = await getStripe();
        const stripeCustomerId = await getStripeCustomerAccount(sessionId, client);
        stripe.customers.del(stripeCustomerId);
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to delete stripe customer account for session ${sessionId}.`);
    }
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
