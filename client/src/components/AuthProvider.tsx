import { createContext, useContext, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { setAuthToken } from "@/lib/authToken";

function hashNavigate(path: string) {
  window.location.hash = path;
}

interface AuthUser { id: number; email: string; tier: string }

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isPro: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isPro: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount — no saved session (token is in-memory only), so just mark loading done
  // and let AppRoutes redirect to the login form.
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiRequest<{ token: string; user: AuthUser }>("POST", "/api/auth/login", data),
    onSuccess: (data) => {
      setAuthToken(data.token);
      setUser(data.user);
      qc.invalidateQueries();
      hashNavigate("/app");
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiRequest<{ token: string; user: AuthUser }>("POST", "/api/auth/register", data),
    onSuccess: (data) => {
      setAuthToken(data.token);
      setUser(data.user);
      qc.invalidateQueries();
      hashNavigate("/app");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout", {}),
    onSuccess: () => {
      setAuthToken(null);
      setUser(null);
      qc.clear();
      hashNavigate("/login");
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };
  const register = async (email: string, password: string) => {
    await registerMutation.mutateAsync({ email, password });
  };
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const isPro = user?.tier === "pro";

  return (
    <AuthContext.Provider value={{ user, isLoading, isPro, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
