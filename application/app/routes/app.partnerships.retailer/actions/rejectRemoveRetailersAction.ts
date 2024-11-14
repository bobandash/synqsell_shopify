import { object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import { deletePartnershipRequestsTx } from '~/services/models/partnershipRequest.server';
import { deletePartnershipsTx } from '~/services/models/partnership.server';
import db from '~/db.server';
import { StatusCodes } from 'http-status-codes';
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';
import {
  partnershipIdListSchema,
  partnershipRequestIdListSchema,
} from '~/schemas/models';

export type RejectRemoveRetailersActionProps = {
  intent: IntentsProps;
  partnershipRequestIds: string[];
  partnershipIds: string[];
};

const rejectRemoveRetailersActionSchema = object({
  intent: string().required().oneOf([INTENTS.REJECT_REMOVE_RETAILERS]),
  partnershipRequestIds: partnershipRequestIdListSchema,
  partnershipIds: partnershipIdListSchema,
});

export async function rejectRemoveRetailersAction(
  data: RejectRemoveRetailersActionProps,
) {
  try {
    await rejectRemoveRetailersActionSchema.validate(data);
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
    logError(error, 'Action: reject retailers.');
    return getRouteError('Failed to reject retailers.', error);
  }
}
