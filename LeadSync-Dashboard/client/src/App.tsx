import { useEffect, type ReactNode } from "react";
import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSession } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SalesMapper from "./pages/SalesMapper";

function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card px-5 py-3 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>{label}</span>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useSession();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user && location !== "/login") {
      setLocation("/login");
    }
  }, [isLoading, location, setLocation, user]);

  if (isLoading) {
    return <FullPageLoader label="Checking your session..." />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

function LoginRoute() {
  const { data: user, isLoading } = useSession();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/");
    }
  }, [isLoading, setLocation, user]);

  if (isLoading) {
    return <FullPageLoader label="Checking your session..." />;
  }

  return <Login />;
}

function ProjectsRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/projects");
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <LoginRoute />
      </Route>
      <Route path="/sales-mapper">
        <ProjectsRedirect />
      </Route>
      <Route path="/projects">
        <RequireAuth>
          <SalesMapper />
        </RequireAuth>
      </Route>
      <Route path="/">
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      </Route>
      <Route>
        <RequireAuth>
          <NotFound />
        </RequireAuth>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
