import { getChecklistStatus } from "~/models/checklistStatus";
import type { FormDataObject } from "~/types";
import { getStartedSupplierSchema } from "./_schema";
import type { InferType } from "yup";
import {
  getOrCreateSupplierAccessRequest,
  hasSupplierAccessRequest,
} from "~/models/supplierAccessRequest";
import { getJSONError } from "~/util";
import { json } from "@remix-run/node";
import { StatusCodes } from "http-status-codes";

type getStartedSupplierData = InferType<typeof getStartedSupplierSchema>;

export type GetStartedSupplierActionData = {
  supplierAccessRequest: {
    id: string;
    checklistStatusId: string;
    hasMetSalesThreshold: boolean;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    sessionId: string;
    notes: string | null;
    isEligibleForNewRequest: boolean;
  };
};

// For now, suppliers should be able to request access at any time
export async function getStartedSupplierAction(
  formDataObject: FormDataObject,
  sessionId: string,
) {
  try {
    await getStartedSupplierSchema.validate(formDataObject);
    const { checklistItemId } =
      formDataObject as unknown as getStartedSupplierData;
    const checklistStatus = await getChecklistStatus(
      sessionId,
      checklistItemId,
    );
    const supplierAccessRequestExists =
      await hasSupplierAccessRequest(sessionId);
    const supplierAccessRequest = await getOrCreateSupplierAccessRequest(
      sessionId,
      checklistStatus.id,
    );
    return json(
      { supplierAccessRequest },
      {
        status: supplierAccessRequestExists
          ? StatusCodes.OK
          : StatusCodes.CREATED,
      },
    );
  } catch (error) {
    throw getJSONError(error, "index");
  }
}
