"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type Role = "buyer" | "seller";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("buyer");

  useEffect(() => {
    const saved = localStorage.getItem("vault-role") as Role | null;
    if (saved === "buyer" || saved === "seller") {
      queueMicrotask(() => setRoleState(saved));
    }
  }, []);

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole);
    try {
      localStorage.setItem("vault-role", newRole);
    } catch { /* private browsing may block localStorage */ }
  }, []);

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
