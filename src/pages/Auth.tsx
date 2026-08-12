import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/auth/useAuth";
import { ROLES, type AppRole } from "@/lib/roles";
import { Gem, Loader2, Sparkles, Shield, Users, Camera, Briefcase } from "lucide-react";
import { toast } from "sonner";

const SIGNUP_ROLES: AppRole[] = ['tech', 'business', 'secretary', 'media'];

const RoleIcon = ({ role }: { role: AppRole }) => {
  const icons = {
    tech: <Shield className="h-4 w-4" />,
    business: <Briefcase className="h-4 w-4" />,
    secretary: <Users className="h-4 w-4" />,
    media: <Camera className="h-4 w-4" />,
    developer: <Sparkles className="h-4 w-4" />,
  };
  return icons[role] || <Users className="h-4 w-4" />;
};

export default function Auth() {
  const { user, status, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AppRole>('media');
  const [busy, setBusy] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    document.title = "Sign in — Pearl Hijja Admin";
  }, []);

  if (status === "authenticated" && user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (tab === "signin") {
      const { error } = await signIn(email, password, rememberMe);
      if (error) toast.error(error);
      else { toast.success("Welcome back"); navigate("/"); }
    } else {
      if (!name.trim()) {
        toast.error("Please enter a display name.");
      } else {
        const { error } = await signUp(email, password, name, role);
        if (error) toast.error(error);
        else toast.success("Account created — you can now sign in.");
      }
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg shadow-[var(--shadow-elegant)] border-border/50">
        <CardHeader className="space-y-1 px-4 sm:px-6 pt-6 pb-4">
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-semibold flex items-center gap-2">
            <Gem className="h-5 w-5 text-primary" />
            Pearl Hijja
          </CardTitle>
          <CardDescription className="text-sm lg:text-base">
            Sign in to manage your website and packages.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "signin" | "signup")}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full h-11 lg:h-12">
              <TabsTrigger value="signin" className="text-sm lg:text-base">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-sm lg:text-base">
                Create account
              </TabsTrigger>
            </TabsList>

            <form onSubmit={submit} className="mt-4 lg:mt-6 space-y-4 lg:space-y-5">
              {tab === "signup" && (
                <div className="space-y-4 lg:space-y-5 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Display name
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      className="h-10 lg:h-11 text-sm lg:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium">
                      Role
                    </Label>
                    <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
                      <SelectTrigger className="h-10 lg:h-11 text-sm lg:text-base">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {SIGNUP_ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="text-sm">
                            <span className="flex items-center gap-2">
                              <RoleIcon role={r} />
                              {ROLES[r].label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pearlhijja.com"
                  className="h-10 lg:h-11 text-sm lg:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="h-10 lg:h-11 text-sm lg:text-base"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="remember-me" className="text-sm font-medium cursor-pointer">
                    Remember me
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 lg:h-11 text-sm lg:text-base font-medium"
                disabled={busy}
              >
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {tab === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </Tabs>

          <div className="mt-6 pt-4 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Pearl Hijja and Umrah Services (U) Ltd
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}