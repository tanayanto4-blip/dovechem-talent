import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { LucideIcon } from "lucide-react";

export type MobileNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
};

function isActive(item: MobileNavItem, pathname: string) {
  return item.exact ? pathname === item.to : pathname.startsWith(item.to);
}

/**
 * Bottom tab bar untuk layar HP: maksimal 4 tab utama, sisanya masuk ke sheet
 * "Menu" supaya tidak perlu geser horizontal.
 */
export function MobileBottomNav({
  items,
  pathname,
  primaryCount = 4,
}: {
  items: MobileNavItem[];
  pathname: string;
  primaryCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const needsMore = items.length > primaryCount;
  const primary = needsMore ? items.slice(0, primaryCount - 1) : items;
  const rest = needsMore ? items.slice(primaryCount - 1) : [];
  const restActive = rest.some((it) => isActive(it, pathname));
  const restBadge = rest.reduce((sum, it) => sum + (it.badge ?? 0), 0);
  const cols = primary.length + (needsMore ? 1 : 0);

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.25)] md:hidden"
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {primary.map((it) => {
          const active = isActive(it, pathname);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <it.icon className="h-5 w-5" />
              <span className="w-full truncate text-center leading-tight">{it.label}</span>
              {it.badge ? (
                <span className="absolute right-3 top-1.5 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
                  {it.badge}
                </span>
              ) : null}
              {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" />}
            </Link>
          );
        })}

        {needsMore && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium ${
                  restActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Menu className="h-5 w-5" />
                <span>Menu</span>
                {restBadge ? (
                  <span className="absolute right-3 top-1.5 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
                    {restBadge}
                  </span>
                ) : null}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
              <SheetHeader className="text-left">
                <SheetTitle>Menu lainnya</SheetTitle>
              </SheetHeader>
              <div className="mt-4 grid gap-2 pb-4">
                {rest.map((it) => {
                  const active = isActive(it, pathname);
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 text-sm font-medium ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      <it.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.badge ? (
                        <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                          {it.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
