"use client";

import { createContext, useContext } from "react";

const UserContext = createContext(null);

/** Makes the signed-in staff member available to every client page. */
export function UserProvider({ user, children }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** `{ name, email, role, isAdmin }` for the signed-in staff member. */
export function useUser() {
  const user = useContext(UserContext);
  return { ...user, isAdmin: user?.role === "admin" };
}
