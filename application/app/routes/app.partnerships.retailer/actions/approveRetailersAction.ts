import { array, object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import { isValidPartnershipRequest } from '~/services/models/partnershipRequest';
import { approvePartnershipRequestBulk } from '~/services/transactions';
import { PARTNERSHIP_REQUEST_TYPE } from '~/constants';
import { StatusCodes } from 'http-status-codes';
import { createJSONMessage } from '~/util';

export type ApproveRetailersActionProps = {
  intent: IntentsProps;
  partnershipRequestIds: string[];
};

const approveSuppliersActionSchema = object({
  intent: string().required().oneOf([INTENTS.APPROVE_RETAILERS]),
  partnershipRequestIds: array()
    .of(string().required())
    .required()
    .test(
      'is-valid-partnership-request-ids',
      'Partnership request ids have to be valid',
      async (partnershipRequestIds) => {
        const isValidArr = await Promise.all(
          partnershipRequestIds.map((id) => isValidPartnershipRequest(id)),
        );
        const isAllIdsValid =
          isValidArr.filter((valid) => valid === false).length === 0;
        return isAllIdsValid;
      },
    ),
});

export async function approveRetailersAction(
  data: ApproveRetailersActionProps,
) {
  await approveSuppliersActionSchema.validate(data);
  const { partnershipRequestIds } = data;
  await approvePartnershipRequestBulk(
    partnershipRequestIds,
    PARTNERSHIP_REQUEST_TYPE.SUPPLIER,
  );

  return createJSONMessage(
    'Successfully approved partnerships.',
    StatusCodes.CREATED,
  );
}
