import type {
  PartnershipRequestStatusProps,
  PartnershipRequestTypeProps,
} from '~/constants';
import { errorHandler } from '../util';
import db from '~/db.server';

// model PartnershipRequest {
//   id           String      @id @default(uuid())
//   senderId     String
//   recipientId  String
//   sender       Session     @relation("SenderPartnershipRequest", fields: [senderId], references: [id])
//   recipient    Session     @relation("RecipientPartnershipRequest", fields: [recipientId], references: [id])
//   message      String
//   priceListIds PriceList[]
//   type         String // two types, retailer request and supplier request
//   status       String // can only be rejected or pending; if it is accepted already, it willk just make the user into a price list retailer
// }

type CreatePartnershipRequestProps = {
  priceListIds: string[];
  recipientId: string;
  senderId: string;
  message: string;
  type: PartnershipRequestTypeProps;
  status: PartnershipRequestStatusProps;
};

export async function createPartnershipRequest(
  props: CreatePartnershipRequestProps,
) {
  try {
    const { priceListIds, recipientId, senderId, message, type, status } =
      props;
    // TODO: add validation to this, you should not be able to create a request if one already exists
    const partnershipRequest = await db.partnershipRequest.create({
      data: {
        senderId,
        recipientId,
        message,
        type,
        status,
        priceListIds: {
          connect: priceListIds.map((id) => ({ id })),
        },
      },
    });
    return partnershipRequest;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create partnership request.',
      createPartnershipRequest,
      { props },
    );
  }
}
