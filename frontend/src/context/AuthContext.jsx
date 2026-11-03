import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import authService from "../services/authService";
import { onUnauthorized, setAccessToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => onUnauthorized(logout), [logout]);

  const login = useCallback(async ({ username, password }) => {
    setAccessToken(null);
    setUser(null);

    try {
      const result = await authService.login({ username, password });

      if (
        typeof result.access_token !== "string" ||
        !result.access_token
      ) {
        throw new Error("The API did not return a valid access token.");
      }

      setAccessToken(result.access_token);

      const currentUser = await authService.getCurrentUser();

      if (!currentUser?.id || !currentUser?.username || !currentUser?.role) {
        throw new Error("The API returned an incomplete user profile.");
      }

      setUser(currentUser);
      return currentUser;
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      throw error;
    }
  }, []);

  const register = useCallback(({ username, password }) => {
    return authService.register({ username, password });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
    }),
    [user, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}