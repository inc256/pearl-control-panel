import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, ClipboardList, Palette, Settings, LogOut, Menu, X, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/landing", label: "Landing Page", icon: FileText },
  { to: "/bookings", label: "Bookings", icon: ClipboardList },
  { to: "/customize", label: "Customize", icon: Palette },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children, title, description }: { children: ReactNode; title: string; description?: string }) {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };

  const SidebarInner = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground grid place-items-center">
          <Gem className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="font-semibold text-sm">Pearl Hijja</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin Panel</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="px-2 text-xs text-muted-foreground truncate">{user?.email}</div>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 border-r border-border z-30">
        {SidebarInner}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">{SidebarInner}</aside>
        </div>
      )}

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/80 backdrop-blur flex items-center gap-3 px-4 md:px-8">
          <button className="md:hidden p-2 -ml-2 rounded-md hover:bg-muted" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-semibold truncate">{title}</h1>
            {description && <p className="text-xs text-muted-foreground truncate hidden sm:block">{description}</p>}
          </div>
        </header>
        <main className="p-4 md:p-8 max-w-[1400px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
