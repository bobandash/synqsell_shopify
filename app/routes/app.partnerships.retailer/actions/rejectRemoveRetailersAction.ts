import { array, object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import {
  deletePartnershipRequestsTx,
  isValidPartnershipRequest,
} from '~/services/models/partnershipRequest';
import {
  deletePartnershipsTx,
  hasPartnership,
} from '~/services/models/partnership';
import db from '~/db.server';
import { StatusCodes } from 'http-status-codes';
import { createJSONMessage } from '~/util';

export type RejectRemoveRetailersActionProps = {
  intent: IntentsProps;
  partnershipRequestIds: string[];
  partnershipIds: string[];
};

// TODO: simplify these yup schemas
const rejectRemoveRetailersActionSchema = object({
  intent: string().required().oneOf([INTENTS.REJECT_REMOVE_RETAILERS]),
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
  partnershipIds: array()
    .of(string().required())
    .required()
    .test(
      'is-valid-partnership-ids',
      'Partnership ids have to be valid',
      async (partnershipIds) => {
        const isValidArr = await Promise.all(
          partnershipIds.map((id) => hasPartnership(id)),
        );
        const isAllIdsValid =
          isValidArr.filter((valid) => valid === false).length === 0;
        return isAllIdsValid;
      },
    ),
});

export async function rejectRemoveRetailersAction(
  data: RejectRemoveRetailersActionProps,
) {
  await rejectRemoveRetailersActionSchema.validate(data);
  const { partnershipRequestIds, partnershipIds } = data;
  await db.$transaction(async (tx) => {
    await Promise.all([
      deletePartnershipsTx(tx, partnershipIds),
      deletePartnershipRequestsTx(tx, partnershipRequestIds),
    ]);
  });
  return createJSONMessage(
    'Successfully removed partnerships.',
    StatusCodes.OK,
  );
}
