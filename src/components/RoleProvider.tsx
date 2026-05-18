"use client";

import React, { createContext, useContext, useState } from "react";

type Role = "buyer" | "seller";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    if (typeof window === "undefined") return "buyer";
    const saved = localStorage.getItem("vault-role") as Role;
    return saved === "buyer" || saved === "seller" ? saved : "buyer";
  });

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem("vault-role", newRole);
  };

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
