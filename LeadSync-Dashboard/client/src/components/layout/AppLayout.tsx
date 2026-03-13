import { LogOut, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useLogout, useSession } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function AppLayout({
  children,
  sectionLabel = "Dashboard",
  showDashboardNav = false,
}: {
  children: React.ReactNode;
  sectionLabel?: string;
  showDashboardNav?: boolean;
}) {
  const { data: user } = useSession();
  const logout = useLogout();
  const [location, setLocation] = useLocation();
  const initials = (user?.name || user?.email || "LS")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const navItems = [
    { path: "/", label: "Dashboard" },
    { path: "/projects", label: "Projects" },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#17324a] bg-[#031726]/96 px-3 backdrop-blur md:px-4 xl:px-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-white">LeadSync</span>
          </div>
          <div className="hidden h-6 w-px bg-border/70 lg:block" />
          {showDashboardNav ? (
            <nav className="flex items-center gap-1 rounded-full border border-[#17324a] bg-[#041c2d] p-1" aria-label="Dashboard views">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(item.path)}
                  className={cn(
                    "h-8 rounded-full px-3 text-xs text-slate-300 hover:bg-[#0f2940] hover:text-white sm:px-4 sm:text-sm",
                    location === item.path && "bg-[#123a59] text-white hover:bg-[#123a59]",
                  )}
                >
                  {item.label}
                </Button>
              ))}
            </nav>
          ) : (
            <h1 className="hidden font-display text-lg font-semibold text-slate-100 md:block">{sectionLabel}</h1>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-slate-100">{user?.name || "LeadSync User"}</div>
            <div className="text-xs text-slate-400">{user?.email || "Signed in"}</div>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-sky-400 text-sm font-bold text-primary-foreground shadow-md">
            {initials}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="hidden border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800 hover:text-white sm:inline-flex"
          >
            <LogOut className="h-4 w-4" />
            {logout.isPending ? "Signing out..." : "Sign out"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800 hover:text-white sm:hidden"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="relative flex min-w-0 flex-1 overflow-auto px-2 py-3 md:px-3 md:py-4 xl:px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full min-w-0 w-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

