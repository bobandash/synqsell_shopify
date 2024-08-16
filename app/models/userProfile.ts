import type { Prisma } from "@prisma/client";
import createHttpError from "http-errors";
import { ROLES } from "~/constants";
import db from "~/db.server";
import type { GraphQL } from "~/types";
import type { ShopAddress } from "~/types/admin.types";
import { errorHandler, getLogContext } from "~/util";

type ProfileDefaultsProps = {
  name: string;
  email: string;
  biography: string;
  website: string;
  address: string;
};

export type ProfileProps = {
  id: string;
  name: string;
  email: string;
  logo: string | null;
  biography: string | null;
  desiredProducts: string | null;
  sessionId: string;
};

type ProfileUpdateProps = {
  name?: string;
  email?: string;
  logo?: string;
  biography?: string;
  productsWant?: string;
  socialMediaUrls?: string[];
};

export type SocialMediaDataProps = {
  facebook: string;
  twitter: string;
  instagram: string;
  youtube: string;
  tiktok: string;
};

export async function hasProfile(sessionId: string) {
  try {
    const profile = await db.userProfile.findFirst({
      where: {
        sessionId,
      },
    });

    if (!profile) {
      return false;
    }
    return true;
  } catch (error) {
    const context = getLogContext(hasProfile, sessionId);
    throw errorHandler(error, context, "Failed to check if profile exists.");
  }
}

export async function getProfile(sessionId: string) {
  try {
    const profile = await db.userProfile.findFirstOrThrow({
      where: {
        sessionId,
      },
      include: {
        SocialMediaLink: true,
      },
    });
    return profile;
  } catch (error) {
    const context = getLogContext(hasProfile, sessionId);
    throw errorHandler(error, context, "Failed to get profile.");
  }
}

// helper function for getProfileDefaultsShopify
function getBillingAddressStringFmt(
  billingAddress: Pick<ShopAddress, "city" | "provinceCode" | "country">,
) {
  const addressArr: string[] = [];

  Object.values(billingAddress).forEach((value) => {
    if (value) {
      addressArr.push(value);
    }
  });

  if (!addressArr) {
    return "";
  }

  const address = addressArr.join(", ");
  return address;
}

// retrieves the default profile details from shopify
async function getProfileDefaultsShopify(sessionId: string, graphql: GraphQL) {
  try {
    const response = await graphql(`
      query profileQuery {
        shop {
          name
          contactEmail
          description
          url
          billingAddress {
            city
            provinceCode
            country
          }
        }
      }
    `);
    const { data } = await response.json();
    if (!data) {
      throw new createHttpError.InternalServerError(
        "Failed to get profile information.",
      );
    }
    const { shop } = data;
    const {
      name,
      contactEmail: email,
      description,
      url,
      billingAddress,
    } = shop;

    const address = getBillingAddressStringFmt(billingAddress);
    const website = url as string; // enforce the string type on url, graphql by default type-checks if it's a valid url
    const biography = description || "";

    return {
      name,
      email,
      biography,
      website,
      address,
    };
  } catch (error) {
    const context = getLogContext(
      getProfileDefaultsShopify,
      sessionId,
      graphql,
    );
    throw errorHandler(
      error,
      context,
      "Failed to retrieve default profile values",
    );
  }
}

export async function createProfileDatabase(
  sessionId: string,
  profileDefaults: ProfileDefaultsProps,
) {
  try {
    // creates profile with social media links or rollback
    const profileWithSocialMediaLinks = await db.$transaction(async (tx) => {
      const newProfile = await tx.userProfile.create({
        data: {
          sessionId,
          ...profileDefaults,
        },
      });
      await tx.socialMediaLink.create({
        data: { userProfileId: newProfile.id },
      });

      const newProfileWithSocialMediaLinks =
        await tx.userProfile.findFirstOrThrow({
          where: {
            id: newProfile.id,
          },
          include: {
            SocialMediaLink: true,
          },
        });
      return newProfileWithSocialMediaLinks;
    });
    return profileWithSocialMediaLinks;
  } catch (error) {
    const context = getLogContext(
      createProfileDatabase,
      sessionId,
      profileDefaults,
    );
    throw errorHandler(
      error,
      context,
      "Failed to create profile in database. Please try again later.",
    );
  }
}

export async function getOrCreateProfile(sessionId: string, graphql: GraphQL) {
  try {
    const existingProfile = await hasProfile(sessionId);
    if (existingProfile) {
      const profile = await getProfile(sessionId);
      return profile;
    }
    const profileDefaults = await getProfileDefaultsShopify(sessionId, graphql);
    const newProfile = await createProfileDatabase(sessionId, profileDefaults);
    return newProfile;
  } catch (error) {
    const context = getLogContext(getOrCreateProfile, sessionId, graphql);
    throw errorHandler(
      error,
      context,
      "Failed to create profile. Please contact support.",
    );
  }
}

export async function updateUserProfileTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  newProfileValues: ProfileUpdateProps,
  socialMediaData: SocialMediaDataProps,
) {
  try {
    const updatedProfile = await tx.userProfile.update({
      where: {
        sessionId,
      },
      data: {
        ...newProfileValues,
        SocialMediaLink: {
          update: {
            ...socialMediaData,
          },
        },
      },
    });
    return updatedProfile;
  } catch (error) {
    const context = getLogContext(
      updateUserProfileTx,
      tx,
      sessionId,
      newProfileValues,
      socialMediaData,
    );
    throw errorHandler(
      error,
      context,
      "Failed to update profile. Please contact support.",
    );
  }
}

async function getPaginatedVisibleProfiles(
  cursor: string | null,
  isReverse: boolean,
  role: string,
) {
  const query = {
    take: isReverse ? -12 : 12,
    skip: cursor ? 1 : 0,
    where: {
      name: role,
      isVisibleInNetwork: true,
    },
    select: {
      id: true,
      Session: {
        include: {
          Profile: true,
        },
      },
    },
    ...(cursor && { cursor: { id: cursor } }),
    orderBy: {
      Session: {
        Profile: {
          name: "asc" as Prisma.SortOrder,
        },
      },
    },
  };
  const profilesRawData = await db.role.findMany(query);
  const profiles = profilesRawData
    .map((role) => {
      return { roleId: role.id, ...role.Session.Profile };
    })
    .filter((profile) => profile.id !== undefined);
  return profiles;
}

export async function getVisibleRetailerProfiles(
  startCursor: string | null,
  endCursor: string | null,
  isReverse: boolean,
) {
  try {
    const cursor = isReverse ? startCursor : endCursor;
    const profiles = await getPaginatedVisibleProfiles(
      cursor,
      isReverse,
      ROLES.RETAILER,
    );

    if (!profiles) {
      return {
        profiles: [],
        hasPrevious: false,
        hasNext: false,
        previousCursor: null,
        nextCursor: null,
      };
    }

    const lastIndex = profiles.length - 1;
    const previousCursor = profiles[0].roleId;
    const nextCursor = profiles[lastIndex].roleId;

    const hasPrevious =
      (await getPaginatedVisibleProfiles(previousCursor, true, ROLES.RETAILER))
        .length > 0;
    const hasNext =
      (await getPaginatedVisibleProfiles(nextCursor, true, ROLES.RETAILER))
        .length > 0;

    return {
      profiles,
      hasPrevious,
      hasNext,
      previousCursor,
      nextCursor,
    };
  } catch (error) {
    const context = getLogContext(
      getVisibleRetailerProfiles,
      startCursor,
      endCursor,
      isReverse,
    );
    throw errorHandler(
      error,
      context,
      "Failed to get visible retailer profiles. Please contact support.",
    );
  }
}
