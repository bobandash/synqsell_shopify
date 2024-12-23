import { object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import { approvePartnershipRequestBulk } from '~/services/transactions';
import { PARTNERSHIP_REQUEST_TYPE } from '~/constants';
import { StatusCodes } from 'http-status-codes';
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';
import { partnershipRequestIdListSchema } from '~/schemas/models';

export type ApproveRetailersActionProps = {
  intent: IntentsProps;
  partnershipRequestIds: string[];
};

const approveSuppliersActionSchema = object({
  intent: string().required().oneOf([INTENTS.APPROVE_RETAILERS]),
  partnershipRequestIds: partnershipRequestIdListSchema,
});

export async function approveRetailersAction(
  data: ApproveRetailersActionProps,
) {
  try {
    await approveSuppliersActionSchema.validate(data);
    const { partnershipRequestIds } = data;
    await approvePartnershipRequestBulk(
      partnershipRequestIds,
      PARTNERSHIP_REQUEST_TYPE.SUPPLIER,
    );
    return createJSONSuccess(
      'Successfully approved partnerships.',
      StatusCodes.CREATED,
    );
  } catch (error) {
    logError(error);
    return getRouteError(
      error,
      'Failed to approve retailers. Please try again later.',
    );
  }
}
