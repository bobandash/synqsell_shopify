import { createContext, useContext } from "react";
import type { Dispatch, FC, SetStateAction } from "react";
import { ROLES } from "~/constants";

type Props = {
  children: React.ReactNode;
  roles: Set<string>;
  setRoles: Dispatch<SetStateAction<Set<string>>>;
};

type Role = string;
interface RoleContextType {
  roles: Set<Role>;
  setRoles: React.Dispatch<React.SetStateAction<Set<Role>>>;
  addRole: (role: Role) => void;
  isRetailer: boolean;
  isSupplier: boolean;
}

const RoleContext = createContext<RoleContextType>({
  roles: new Set(),
  setRoles: () => {},
  addRole: (role: string) => {},
  isRetailer: false,
  isSupplier: false,
});

export const RoleProvider: FC<Props> = ({ children, roles, setRoles }) => {
  function addRole(role: string) {
    setRoles((prev) => {
      return new Set([...prev, role]);
    });
  }
  const isRetailer = roles.has(ROLES.RETAILER);
  const isSupplier = roles.has(ROLES.SUPPLIER);

  const value = {
    roles,
    setRoles,
    addRole,
    isRetailer,
    isSupplier,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRoleContext = () => {
  return useContext(RoleContext);
};
