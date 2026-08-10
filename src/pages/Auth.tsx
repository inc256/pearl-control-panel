import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/auth/useAuth";
import { ROLES, type AppRole } from "@/lib/roles";
import { Gem, Loader2, Sparkles, Shield, Users, Camera, Briefcase } from "lucide-react";
import { toast } from "sonner";

const SIGNUP_ROLES: AppRole[] = ['tech', 'business', 'secretary', 'media'];

// Role icons mapping
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

  useEffect(() => {
    document.title = "Sign in — Pearl Hijja Admin";
  }, []);

  if (status === "authenticated" && user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (tab === "signin") {
      const { error } = await signIn(email, password);
      if (error) toast.error(error); 
      else { 
        toast.success("Welcome back"); 
        navigate("/"); 
      }
    } else {
      const { error } = await signUp(email, password, name, role);
      if (error) toast.error(error); 
      else toast.success("Account created — you can now sign in.");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* Left Panel - Hidden on mobile, shown on tablet/desktop */}
      <div 
        className="hidden lg:flex lg:w-[45%] xl:w-[50%] 2xl:w-[45%] flex-col justify-between p-8 xl:p-12 2xl:p-16 text-primary-foreground min-h-screen relative overflow-hidden"
        style={{ background: "var(--gradient-burgundy)" }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        {/* Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary-foreground/10 backdrop-blur-sm grid place-items-center border border-primary-foreground/10">
            <Gem className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-lg">Pearl Hijja</p>
            <p className="text-xs opacity-80 uppercase tracking-wider">Admin Console</p>
          </div>
        </div>

        {/* Main content - centered vertically */}
        <div className="relative z-10 flex-1 flex items-center py-8 lg:py-0">
          <div className="max-w-md mx-auto lg:mx-0">
            <h2 className="font-serif text-3xl xl:text-4xl 2xl:text-5xl leading-tight">
              Manage every detail of your sacred journeys.
            </h2>
            <p className="mt-4 opacity-80 text-sm xl:text-base leading-relaxed">
              A complete CMS and package management system for Pearl Hijja and Umrah Services (U) Ltd.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs opacity-70">
          © {new Date().getFullYear()} Pearl Hijja and Umrah Services (U) Ltd
        </p>
      </div>

      {/* Right Panel - Full width on mobile, flexible on desktop */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 min-h-screen w-full bg-background">
        <Card className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto shadow-[var(--shadow-elegant)] border-border/50">
          <CardHeader className="space-y-1 px-4 sm:px-6 pt-6 pb-4">
            <div className="lg:hidden flex items-center gap-2 mb-1">
              <Gem className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Pearl Hijja</span>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-semibold">
              Admin access
            </CardTitle>
            <CardDescription className="text-sm">
              Sign in to manage your website and packages.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-4 sm:px-6 pb-6">
            <Tabs 
              value={tab} 
              onValueChange={(v) => setTab(v as "signin" | "signup")}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 w-full h-11">
                <TabsTrigger value="signin" className="text-sm">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-sm">
                  Create account
                </TabsTrigger>
              </TabsList>

              <form onSubmit={submit} className="mt-4 space-y-4">
                {/* Signup fields */}
                {tab === "signup" && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        Display name
                      </Label>
                      <Input 
                        id="name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="Enter your name"
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-sm font-medium">
                        Role
                      </Label>
                      <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
                        <SelectTrigger className="h-10 text-sm">
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
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Developer access reserved for lunainc256@gmail.com
                      </p>
                    </div>
                  </div>
                )}

                {/* Common fields */}
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
                    className="h-10 text-sm"
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
                    className="h-10 text-sm"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-10 text-sm font-medium" 
                  disabled={busy}
                >
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {tab === "signin" ? "Sign in" : "Create account"}
                </Button>

                {tab === "signup" && (
                  <p className="text-xs text-muted-foreground text-center px-2">
                    First signup gets <span className="font-semibold text-primary">Developer</span> access by default.
                  </p>
                )}
              </form>
            </Tabs>

            {/* Mobile-only footer */}
            <div className="lg:hidden mt-6 pt-4 border-t border-border/50 text-center">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} Pearl Hijja and Umrah Services (U) Ltd
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}