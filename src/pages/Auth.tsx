import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { ROLES, type AppRole } from "@/lib/roles";
import { Gem, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SIGNUP_ROLES: AppRole[] = ['tech', 'business', 'secretary', 'media'];

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AppRole>('media');
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Sign in — Pearl Hijja Admin"; }, []);
  if (!loading && user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (tab === "signin") {
      const { error } = await signIn(email, password);
      if (error) toast.error(error); else { toast.success("Welcome back"); navigate("/"); }
    } else {
      const { error } = await signUp(email, password, name, role);
      if (error) toast.error(error); else toast.success("Account created — you can now sign in.");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 text-primary-foreground" style={{ background: "var(--gradient-burgundy)" }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary-foreground/10 grid place-items-center"><Gem className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold">Pearl Hijja</p>
            <p className="text-xs opacity-80 uppercase tracking-wider">Admin Console</p>
          </div>
        </div>
        <div className="max-w-md">
          <h2 className="font-serif text-4xl leading-tight">Manage every detail of your sacred journeys.</h2>
          <p className="mt-4 opacity-80 text-sm">A complete CMS and package management system for Pearl Hijja and Umrah Services (U) Ltd.</p>
        </div>
        <p className="text-xs opacity-70">© Pearl Hijja and Umrah Services (U) Ltd</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 bg-background">
        <Card className="w-full max-w-md shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle className="text-2xl">Admin access</CardTitle>
            <CardDescription>Sign in to manage your website and packages.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <TabsContent value="signup" className="space-y-4 m-0">
                  <div>
                    <Label htmlFor="name">Display name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Admin" />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {SIGNUP_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLES[r].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Developer access is reserved for lunainc256@gmail.com
                    </p>
                  </div>
                </TabsContent>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@pearlhijja.com" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {tab === "signin" ? "Sign in" : "Create account"}
                </Button>
                {tab === "signup" && (
                  <p className="text-xs text-muted-foreground text-center">
                    First signup gets Developer access by default.
                  </p>
                )}
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
