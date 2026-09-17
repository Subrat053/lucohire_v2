import { createContext } from "react";
import { useAuth } from "./AuthContext";

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
  const auth = useAuth();
  if (!auth) {
    throw new Error("useAdminAuth must be used within AuthProvider");
  }

  return {
    admin: auth.user,
    token: localStorage.getItem("authToken"),
    loading: auth.loading,
    isAuthenticated: auth.isAuthenticated,
    loginAdmin: (credentials) => auth.login(credentials, { mode: "admin" }),
    fetchAdmin: auth.refreshUser,
    logout: auth.logout,
  };
};

export const AdminAuthProvider = ({ children }) => {
  return (
    <AdminAuthContext.Provider value={{}}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export default AdminAuthContext;
