import { object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import { approvePartnershipRequestBulk } from '~/services/transactions';
import { PARTNERSHIP_REQUEST_TYPE } from '~/constants';
import { StatusCodes } from 'http-status-codes';
import { partnershipRequestIdListSchema } from '~/schemas/models';
import { createJSONMessage } from '~/lib/utils/server';

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
  console.log(partnershipRequestIds);
  await approvePartnershipRequestBulk(
    partnershipRequestIds,
    PARTNERSHIP_REQUEST_TYPE.RETAILER,
  );

  return createJSONMessage(
    'Successfully approved partnerships.',
    StatusCodes.CREATED,
  );
}
