import { useState } from "react";
import { trpc } from "@/providers/trpc";

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("medilogix_token")
  );

  const { data: user, isLoading } = trpc.auth.me.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("medilogix_token", data.token);
      setToken(data.token);
    },
  });

  const setupMutation = trpc.auth.setup.useMutation();

  const logout = () => {
    localStorage.removeItem("medilogix_token");
    setToken(null);
    window.location.reload();
  };

  const isAuthenticated = !!user;

  return {
    user,
    isLoading,
    isAuthenticated,
    login: loginMutation.mutateAsync,
    logout,
    setup: setupMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error?.message ?? null,
  };
}
