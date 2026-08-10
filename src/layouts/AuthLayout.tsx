import type { ReactNode } from "react";
import { Gem } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[var(--gradient-burgundy)] p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary-foreground/10">
              <Gem className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Pearl Hijja</p>
              <p className="text-xs uppercase tracking-wider opacity-80">Admin Console</p>
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="font-serif text-4xl leading-tight">Manage every detail of your sacred journeys.</h2>
            <p className="mt-4 text-sm opacity-80">A complete CMS and package management system for Pearl Hijja and Umrah Services (U) Ltd.</p>
          </div>
          <p className="text-xs opacity-70">© Pearl Hijja and Umrah Services (U) Ltd</p>
        </div>
        <div className="flex flex-1 items-center justify-center bg-background p-6 sm:p-10">{children}</div>
      </div>
    </div>
  );
}
