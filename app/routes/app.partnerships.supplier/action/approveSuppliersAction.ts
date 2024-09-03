import { array, object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import { isValidPartnershipRequest } from '~/services/models/partnershipRequest';
import { approvePartnershipRequestBulk } from '~/services/transactions';
import { PARTNERSHIP_REQUEST_TYPE } from '~/constants';
import { StatusCodes } from 'http-status-codes';
import { json } from '@remix-run/node';
import { getJSONError } from '~/util';

export type ApproveSuppliersActionProps = {
  intent: IntentsProps;
  partnershipRequestIds: string[];
};

const approveSuppliersActionSchema = object({
  intent: string().required().oneOf([INTENTS.APPROVE_SUPPLIERS]),
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
    return json(
      { message: 'Successfully approved partnerships.' },
      StatusCodes.CREATED,
    );
  } catch (error) {
    throw getJSONError(error, 'supplier partnerships');
  }
}
