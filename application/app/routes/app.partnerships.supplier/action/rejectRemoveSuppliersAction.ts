import { object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import { deletePartnershipRequestsTx } from '~/services/models/partnershipRequest';
import { deletePartnershipsTx } from '~/services/models/partnership';
import db from '~/db.server';
import { StatusCodes } from 'http-status-codes';
import {
  partnershipIdListSchema,
  partnershipRequestIdListSchema,
} from '~/schemas/models';
import { createJSONSuccess } from '~/lib/utils/server';

export type RejectRemoveSuppliersActionProps = {
  intent: IntentsProps;
  partnershipRequestIds: string[];
  partnershipIds: string[];
};

const rejectRemoveSuppliersActionSchema = object({
  intent: string().required().oneOf([INTENTS.REJECT_REMOVE_SUPPLIERS]),
  partnershipRequestIds: partnershipRequestIdListSchema,
  partnershipIds: partnershipIdListSchema,
});

export async function rejectRemoveSuppliersAction(
  data: RejectRemoveSuppliersActionProps,
) {
  await rejectRemoveSuppliersActionSchema.validate(data);
  const { partnershipRequestIds, partnershipIds } = data;
  await db.$transaction(async (tx) => {
    await Promise.all([
      deletePartnershipsTx(tx, partnershipIds),
      deletePartnershipRequestsTx(tx, partnershipRequestIds),
    ]);
  });

  return createJSONSuccess(
    'Successfully removed partnerships.',
    StatusCodes.OK,
  );
}
