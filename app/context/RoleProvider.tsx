import { createContext, useContext } from "react";
import type { Dispatch, FC, SetStateAction } from "react";

type Props = {
  children: React.ReactNode;
  roles: Set<string>;
  setRoles: Dispatch<SetStateAction<Set<string>>>;
};

const RoleContext = createContext({});

export const RoleProvider: FC<Props> = ({ children, roles, setRoles }) => {
  function addRole(role: string) {
    setRoles((prev) => {
      return new Set([...prev, role]);
    });
  }

  const value = {
    roles,
    setRoles,
    addRole,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRoleContext = () => {
  return useContext(RoleContext);
};
