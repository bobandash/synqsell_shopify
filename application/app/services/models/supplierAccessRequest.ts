import db from '~/db.server';

import { ACCESS_REQUEST_STATUS } from '~/constants';
import { errorHandler } from '~/lib/utils/server';

export type GetSupplierAccessRequestProps = {
  name: string;
  website: string;
  email: string;
  id: string;
  num: number;
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
  id: string;
  num: number;
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
    throw errorHandler(
      error,
      `Failed to check if supplier access request exists.`,
      hasSupplierAccessRequest,
      {
        sessionId,
      },
    );
  }
}

export async function getSupplierAccessRequest(sessionId: string) {
  try {
    const supplierAccessRequest =
      await db.supplierAccessRequest.findFirstOrThrow({
        where: {
          sessionId,
        },
      });
    return supplierAccessRequest;
  } catch (error) {
    throw errorHandler(
      error,
      `Failed to get supplier access request.`,
      getSupplierAccessRequest,
      {
        sessionId,
      },
    );
  }
}

// TODO: to get more than 60 days of orders, it requires asking Shopify for permission (> 14 days) and Shopify can reject request
// if app scales, then decide whether or not to request orders as a app permission scope
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
        hasMetSalesThreshold: true,
      },
    });

    return newSupplierAccessRequest;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create supplier access request.',
      createSupplierAccessRequest,
      { sessionId, checklistStatusId },
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
    throw errorHandler(
      error,
      `Failed to get or create supplier access request.`,
      getOrCreateSupplierAccessRequest,
      {
        sessionId,
        checklistStatusId,
      },
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
        session: {
          select: {
            userProfile: true,
          },
        },
      },
    });

    const allSupplierAccessRequestsFormatted = allSupplierAccessRequests.map(
      ({ session: { userProfile }, ...rest }) => {
        return {
          ...rest,
          name: userProfile?.name || '',
          website: userProfile?.website || '',
          email: userProfile?.email || '',
        };
      },
    );
    return allSupplierAccessRequestsFormatted;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get all supplier access requests.',
      getAllSupplierAccessRequests,
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
    throw errorHandler(
      error,
      `Failed to check if supplier access request exists.`,
      updateSupplierAccessRequest,
      {
        sessionId,
        status,
        notes,
        isEligibleForNewRequest,
      },
    );
  }
}
