import db from "../db.server";
import createHttpError from "http-errors";
import { ROLES } from "~/constants";

export type RoleProps = {
  id: string;
  name: string;
  shop: string;
};

export async function getRoles(shop: string) {
  try {
    const data = await db.role.findMany({
      where: {
        shop: shop,
      },
    });
    const roles = data.map(({ name }) => name);
    return roles;
  } catch {
    throw createHttpError.InternalServerError(
      `getRoles (shop ${shop}): Failed to retrieve roles`,
    );
  }
}

export async function addRole(shop: string, role: string) {
  if (!(role === ROLES.RETAILER || role === ROLES.SUPPLIER)) {
    throw new createHttpError.BadRequest(
      `addRole (shop: ${shop}, role: ${role}): Role not valid.`,
    );
  }

  try {
    const newRole = await db.role.create({
      data: {
        shop,
        name: role,
      },
    });
    return newRole;
  } catch {
    throw new createHttpError.InternalServerError(
      `addRole (shop ${shop}, role ${role}): Failed to create role`,
    );
  }
}

export async function deleteRole(id: string) {
  try {
    const newRole = await db.role.delete({
      where: {
        id,
      },
    });
    return newRole;
  } catch {
    throw new createHttpError.InternalServerError(
      `deleteRole (id ${id}: Failed to delete role`,
    );
  }
}

export async function hasRole(shop: string, role: string) {
  try {
    const result = await db.role.findFirst({
      where: {
        shop: shop,
        name: role,
      },
    });

    if (result) {
      return true;
    }
    return false;
  } catch {
    throw new createHttpError.InternalServerError(
      `hasRole (shop ${shop}, role ${role}): Failed to retrieve role`,
    );
  }
}

export async function getRole(shop: string, role: string) {
  try {
    const currentRole = db.role.findFirst({
      where: {
        shop: shop,
        name: role,
      },
    });
    return currentRole;
  } catch {
    throw new createHttpError.InternalServerError(
      `getRole (shop ${shop}, role ${role}): Failed to retrieve role`,
    );
  }
}
