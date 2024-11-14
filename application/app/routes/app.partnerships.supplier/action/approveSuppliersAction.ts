import { object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import { approvePartnershipRequestBulk } from '~/services/transactions';
import { PARTNERSHIP_REQUEST_TYPE } from '~/constants';
import { StatusCodes } from 'http-status-codes';
import { partnershipRequestIdListSchema } from '~/schemas/models';
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';

export type ApproveSuppliersActionProps = {
  intent: IntentsProps;
  partnershipRequestIds: string[];
};

const approveSuppliersActionSchema = object({
  intent: string().required().oneOf([INTENTS.APPROVE_SUPPLIERS]),
  partnershipRequestIds: partnershipRequestIdListSchema,
});

export async function approveSuppliersAction(
  data: ApproveSuppliersActionProps,
) {
  try {
    await approveSuppliersActionSchema.validate(data);
    const { partnershipRequestIds } = data;
    await approvePartnershipRequestBulk(
      partnershipRequestIds,
      PARTNERSHIP_REQUEST_TYPE.RETAILER,
    );

    return createJSONSuccess(
      'Successfully approved partnerships.',
      StatusCodes.CREATED,
    );
  } catch (error) {
    logError(error, 'Action: approve suppliers');
    return getRouteError('Failed to approve suppliers.', error);
  }
}
