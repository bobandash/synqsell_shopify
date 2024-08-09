import db from "~/db.server";
import type { GraphQL } from "~/types";
import { errorHandler, getLogContext } from "~/util";

// model Profile {
//     id              String  @id @default(uuid())
//     name            String
//     email           String
//     logo            String
//     biography       String
//     desiredProducts String
//     Session         Session @relation(fields: [sessionId], references: [id])
//     sessionId       String  @unique
//   }

type ProfileDefaultsProps = {
  name: string;
  contactEmail: string;
  description: string;
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

export async function hasProfile(sessionId: string) {
  try {
    const profile = await db.profile.findFirst({
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
    const profile = await db.profile.findFirst({
      where: {
        sessionId,
      },
    });
    if (!profile) {
      return null;
    }
    return profile;
  } catch (error) {
    const context = getLogContext(hasProfile, sessionId);
    throw errorHandler(error, context, "Failed to get profile.");
  }
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
        }
      }
    `);
    const { data } = await response.json();
    if (!data) {
      // TODO:
      throw new Error("test");
    }
    const { shop } = data;
    const { name, contactEmail, description } = shop;
    return {
      name,
      contactEmail,
      description: description || "",
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
    const { name, contactEmail, description } = profileDefaults;
    const newProfile = await db.profile.create({
      data: {
        sessionId,
        name,
        email: contactEmail,
        biography: description,
      },
    });
    return newProfile;
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
    const existingProfile = await getProfile(sessionId);
    if (existingProfile) {
      return existingProfile;
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
