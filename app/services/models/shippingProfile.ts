import type { Prisma } from '@prisma/client';
import { errorHandler } from '../util';
import db from '~/db.server';

export type ShippingProfilePayload = Prisma.ShippingProfileGetPayload<{
  include: {
    locationGroup: {
      include: {
        zones: {
          include: {
            modelDefinitions: {
              include: {
                rateDefinition: true;
              };
            };
          };
        };
      };
    };
  };
}>;

export async function userHasShippingProfile(supplierId: string) {
  try {
    const shippingProfile = await db.shippingProfile.findFirst({
      where: {
        supplierId,
      },
    });
    if (!shippingProfile) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has shipping profile.',
      userHasShippingProfile,
      { supplierId },
    );
  }
}

export async function userGetShippingProfile(
  supplierId: string,
): Promise<ShippingProfilePayload> {
  try {
    const shippingProfile = await db.shippingProfile.findFirstOrThrow({
      where: {
        supplierId,
      },
      include: {
        locationGroup: {
          include: {
            zones: {
              include: {
                modelDefinitions: {
                  include: {
                    rateDefinition: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return shippingProfile;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has shipping profile.',
      userHasShippingProfile,
      { supplierId },
    );
  }
}

export function getDefaultShippingProfile() {}
