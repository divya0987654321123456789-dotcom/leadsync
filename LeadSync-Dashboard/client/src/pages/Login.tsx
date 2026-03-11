import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useLogin } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState("admin@ikioledlighting.com");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const user = await login.mutateAsync({ email, password });
      if (user) {
        setLocation("/");
      }
    } catch {
      // Errors are handled by the shared toast.
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(77,139,184,0.18),_transparent_28%),radial-gradient(circle_at_right_20%,_rgba(39,146,240,0.12),_transparent_24%),linear-gradient(180deg,_#062f4f_0%,_#041f36_100%)] px-6 py-12">
      <Card className="w-full max-w-md border-slate-700/70 bg-[#071522]/92 shadow-2xl shadow-black/30 backdrop-blur">
        <CardContent className="p-7 sm:p-8">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-display font-bold tracking-tight text-white">LeadSync</h1>
            <p className="text-sm text-slate-400">Sign in to access the dashboard.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  className="h-11 border-slate-700 bg-slate-950/80 pl-10 text-slate-100"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@ikioledlighting.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="h-11 border-slate-700 bg-slate-950/80 pl-10 text-slate-100"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <Button className="h-11 w-full" type="submit" disabled={login.isPending}>
              {login.isPending ? "Signing in..." : "Sign In"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
