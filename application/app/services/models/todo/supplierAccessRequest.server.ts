import db from '~/db.server';
import { ACCESS_REQUEST_STATUS } from '~/constants';

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
  const supplierAccessRequest = await db.supplierAccessRequest.findFirst({
    where: {
      sessionId,
    },
  });
  if (!supplierAccessRequest) {
    return false;
  }
  return true;
}

export async function getSupplierAccessRequest(sessionId: string) {
  const supplierAccessRequest = await db.supplierAccessRequest.findFirstOrThrow(
    {
      where: {
        sessionId,
      },
    },
  );
  return supplierAccessRequest;
}

// TODO: to get more than 60 days of orders, it requires asking Shopify for permission (> 14 days) and Shopify can reject request
// if app scales, then decide whether or not to request orders as a app permission scope
async function createSupplierAccessRequest(
  sessionId: string,
  checklistStatusId: string,
) {
  const newSupplierAccessRequest = await db.supplierAccessRequest.create({
    data: {
      status: ACCESS_REQUEST_STATUS.PENDING,
      sessionId,
      checklistStatusId,
      hasMetSalesThreshold: true,
    },
  });

  return newSupplierAccessRequest;
}

export async function getOrCreateSupplierAccessRequest(
  sessionId: string,
  checklistStatusId: string,
) {
  const supplierAccessRequestExists = await hasSupplierAccessRequest(sessionId);
  if (!supplierAccessRequestExists) {
    const newSupplierAccessRequest = await createSupplierAccessRequest(
      sessionId,
      checklistStatusId,
    );
    return newSupplierAccessRequest;
  }
  const supplierAccessRequest = await getSupplierAccessRequest(sessionId);
  return supplierAccessRequest;
}

export async function getAllSupplierAccessRequests() {
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
}

// We can honestly just handle this by mutating the database for now
export async function updateSupplierAccessRequest(
  sessionId: string,
  status: string,
  notes: string,
  isEligibleForNewRequest: boolean,
) {
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
}
