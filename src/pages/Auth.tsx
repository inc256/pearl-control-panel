import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { Gem, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
      const { error } = await signUp(email, password, name);
      if (error) toast.error(error); else toast.success("Account created — check your email if confirmation is required, or sign in.");
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
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create admin</TabsTrigger>
              </TabsList>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <TabsContent value="signup" className="space-y-4 m-0">
                  <div>
                    <Label htmlFor="name">Display name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Admin" />
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
                  {tab === "signin" ? "Sign in" : "Create admin account"}
                </Button>
                {tab === "signup" && (
                  <p className="text-xs text-muted-foreground">First account becomes Admin automatically.</p>
                )}
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
