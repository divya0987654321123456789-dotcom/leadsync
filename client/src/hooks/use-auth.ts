import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type AuthUser } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

const SESSION_QUERY_KEY = [api.auth.session.path] as const;

async function parseErrorMessage(res: Response, fallbackMessage: string): Promise<string> {
  try {
    const body = await res.json();
    return body.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export function useSession() {
  return useQuery<AuthUser | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch(api.auth.session.path, { credentials: "include" });

      if (res.status === 401) {
        return null;
      }

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "Failed to load session"));
      }

      return api.auth.session.responses[200].parse(await res.json());
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const input = api.auth.login.input.parse(credentials);
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "Failed to sign in"));
      }

      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
      queryClient.invalidateQueries();
      toast({
        title: "Signed in",
        description: `Welcome back, ${user.name}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sign-in failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "Failed to sign out"));
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      queryClient.invalidateQueries();
      toast({
        title: "Signed out",
        description: "Your session has been closed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Sign-out failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
