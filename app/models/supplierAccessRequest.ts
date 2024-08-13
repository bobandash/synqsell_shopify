import db from "~/db.server";
import { errorHandler, getLogCombinedMessage, getLogContext } from "~/util";
import { ACCESS_REQUEST_STATUS } from "~/constants";
import logger from "~/logger";
import createHttpError from "http-errors";

export type GetSupplierAccessRequestProps = {
  name: string;
  website: string;
  email: string;
  id: number;
  checklistStatusId: string;
  hasMetSalesThreshold: boolean;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  sessionId: string;
  notes: string | null;
  isEligibleForNewRequest: boolean;
};

export type GetSupplierAccessRequestJSONProps = {
  name: string;
  website: string;
  email: string;
  id: number;
  checklistStatusId: string;
  hasMetSalesThreshold: boolean;
  createdAt: string;
  updatedAt: string;
  status: string;
  sessionId: string;
  notes: string | null;
  isEligibleForNewRequest: boolean;
};

export async function hasSupplierAccessRequest(sessionId: string) {
  try {
    const supplierAccessRequest = await db.supplierAccessRequest.findFirst({
      where: {
        sessionId,
      },
    });
    if (!supplierAccessRequest) {
      return false;
    }
    return true;
  } catch (error) {
    const context = getLogContext(hasSupplierAccessRequest, sessionId);
    throw errorHandler(
      error,
      context,
      "Failed to get supplier access request from db. Please try again later.",
    );
  }
}

export async function getSupplierAccessRequest(sessionId: string) {
  try {
    const supplierAccessRequest = await db.supplierAccessRequest.findFirst({
      where: {
        sessionId,
      },
    });
    if (!supplierAccessRequest) {
      const logMessage = getLogCombinedMessage(
        getSupplierAccessRequest,
        sessionId,
        "Supplier access request does not exist",
      );
      logger.error(logMessage);
      throw new createHttpError.BadRequest(
        `Role doesn't exist for user. Please contact support.`,
      );
    }
    return supplierAccessRequest;
  } catch (error) {
    const context = getLogContext(getSupplierAccessRequest, sessionId);
    throw errorHandler(
      error,
      context,
      "Failed to get supplier access request from db. Please try again later.",
    );
  }
}

export async function getOrCreateSupplierAccessRequest(
  sessionId: string,
  checklistStatusId: string,
) {
  try {
    const supplierAccessRequestExists =
      await hasSupplierAccessRequest(sessionId);
    if (!supplierAccessRequestExists) {
      const newSupplierAccessRequest = await createSupplierAccessRequest(
        sessionId,
        checklistStatusId,
      );
      return newSupplierAccessRequest;
    }
    const supplierAccessRequest = await getSupplierAccessRequest(sessionId);
    return supplierAccessRequest;
  } catch (error) {
    const context = getLogContext(getSupplierAccessRequest, sessionId);
    throw errorHandler(
      error,
      context,
      "Failed to get or create supplier access request from db. Please try again later.",
    );
  }
}

async function createSupplierAccessRequest(
  sessionId: string,
  checklistStatusId: string,
) {
  try {
    const newSupplierAccessRequest = await db.supplierAccessRequest.create({
      data: {
        status: ACCESS_REQUEST_STATUS.PENDING,
        sessionId,
        checklistStatusId,
        hasMetSalesThreshold: true, // !!! TODO: create a graphql query to check if user met sales threshold
      },
    });

    return newSupplierAccessRequest;
  } catch (error) {
    const context = getLogContext(
      createSupplierAccessRequest,
      sessionId,
      checklistStatusId,
    );
    throw errorHandler(
      error,
      context,
      "Failed to create supplier access request. Please contact support.",
    );
  }
}

// TODO: add more filters to status in the future, this is more for the admin side
export async function getAllSupplierAccessRequests(): Promise<
  GetSupplierAccessRequestProps[]
> {
  try {
    const allSupplierAccessRequests = await db.supplierAccessRequest.findMany({
      include: {
        Session: {
          select: {
            Profile: true,
          },
        },
      },
    });

    const allSupplierAccessRequestsFormatted = allSupplierAccessRequests.map(
      ({ Session: { Profile }, ...rest }) => {
        return {
          ...rest,
          name: Profile?.name || "",
          website: Profile?.website || "",
          email: Profile?.email || "",
        };
      },
    );

    return allSupplierAccessRequestsFormatted;
  } catch (error) {
    const context = getLogContext(getAllSupplierAccessRequests);
    throw errorHandler(
      error,
      context,
      "Failed to get all supplier access requests.",
    );
  }
}

// We can honestly just handle this by mutating the database for now
export async function updateSupplierAccessRequest(
  sessionId: string,
  status: string,
  notes: string,
  isEligibleForNewRequest: boolean,
) {
  try {
    const updatedSupplierAccessRequest = await db.supplierAccessRequest.update({
      where: {
        sessionId,
      },
      data: {
        status,
        notes,
        isEligibleForNewRequest,
        updatedAt: new Date(),
      },
    });
    return updatedSupplierAccessRequest;
  } catch (error) {
    const context = getLogContext(
      updateSupplierAccessRequest,
      sessionId,
      status,
      notes,
      isEligibleForNewRequest,
    );
    throw errorHandler(
      error,
      context,
      "Failed to update supplier access request.",
    );
  }
}
