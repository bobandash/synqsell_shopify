import { object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import { deletePartnershipRequestsTx } from '~/services/models/partnershipRequest.server';
import { deletePartnershipsTx } from '~/services/models/partnership.server';
import db from '~/db.server';
import { StatusCodes } from 'http-status-codes';
import {
  partnershipIdListSchema,
  partnershipRequestIdListSchema,
} from '~/schemas/models';
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';

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
  try {
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
  } catch (error) {
    logError(error);
    return getRouteError(
      error,
      'Failed to reject suppliers. Please try again later.',
    );
  }
}
