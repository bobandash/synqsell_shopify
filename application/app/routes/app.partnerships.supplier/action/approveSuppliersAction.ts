import { array, object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import { isValidPartnershipRequest } from '~/services/models/partnershipRequest';
import { approvePartnershipRequestBulk } from '~/services/transactions';
import { PARTNERSHIP_REQUEST_TYPE } from '~/constants';
import { StatusCodes } from 'http-status-codes';
import { createJSONMessage } from '~/util';
import { partnershipRequestIdListSchema } from '~/schemas/models';

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
  await approveSuppliersActionSchema.validate(data);
  const { partnershipRequestIds } = data;
  await approvePartnershipRequestBulk(
    partnershipRequestIds,
    PARTNERSHIP_REQUEST_TYPE.RETAILER,
  );

  return createJSONMessage(
    'Successfully approved partnerships.',
    StatusCodes.CREATED,
  );
}
