import { Session } from '@prisma/client';
import { mutateAndValidateGraphQLData } from '/opt/nodejs/utils';
import { AppUsageRecordCreateMutation } from '../../types/admin.generated';
import { USAGE_CHARGE_MUTATION } from '../../graphql';
import { logError } from '/opt/nodejs/utils/logger';

async function createUsageChargeShopify(
    shopifySubscriptionLineId: string,
    amtToBill: number,
    shopifyCurrency: string,
    session: Session,
) {
    try {
        // The currently capped usage amount is $100 per month, which means SynqSell as a platform would have to help the retailer/supplier achieve $2k/month (5% commission) after payout
        // for the USAGE_CHARGE_MUTATION, it throws an error if the amount goes over, e.g. retailer paid $99 already; the transaction payable is $1.01 --> mutation fails
        // right now, we're just going to let it fail because currency conversion to USD is not built in our data model yet
        const res = await mutateAndValidateGraphQLData<AppUsageRecordCreateMutation>(
            session.shop,
            session.accessToken,
            USAGE_CHARGE_MUTATION,
            {
                description: 'SynqSell usage charge for commission on delivered orders.',
                price: {
                    amount: amtToBill,
                    currencyCode: shopifyCurrency,
                },
                subscriptionLineItemId: shopifySubscriptionLineId,
            },
            'Failed to create a usage charge to pay SynqSell from retailer.',
        );
        return res.appUsageRecordCreate?.appUsageRecord?.id ?? null;
    } catch (error) {
        // !!! TODO: this will catch all generic errors
        // TODO: Create better error handling for over $100 per month limit in the future;
        // do not have to worry until retailers are close to this limit
        logError(error, {
            sessionId: session.id,
            context: `Failed to create usage charge for ${shopifySubscriptionLineId}`,
        });
        return null;
    }
}

export { createUsageChargeShopify };
