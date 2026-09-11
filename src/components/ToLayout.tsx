
import * as React from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  ClipboardList,
  Ticket,
  ScrollText,
  LogOut,
  Bell,
  Snowflake,
  ChevronRight,
  Users,
  BadgeCheck,
  Wallet,
  BarChart3,
  Globe,
  ShieldCheck,
  Menu,
  ShoppingCart,
} from "lucide-react";
import { ToStoreProvider, useToStore, daysUntil } from "@/lib/toStore";
import { I18nProvider, useI18n, LANGS } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; labelKey: string; icon: typeof LayoutDashboard; exact?: boolean };

/** Voci comuni (dashboard) + area operativa del Tour Operator. */
const DASHBOARD: NavItem = {
  to: "/",
  labelKey: "nav.dashboard",
  icon: LayoutDashboard,
  exact: true,
};

const OPERATIVE_NAV: NavItem[] = [
  { to: "/races", labelKey: "nav.races", icon: CalendarDays },
  { to: "/cart", labelKey: "nav.cart", icon: ShoppingCart },
  { to: "/options", labelKey: "nav.options", icon: Clock },
  { to: "/bookings", labelKey: "nav.bookings", icon: ClipboardList },
  { to: "/sales", labelKey: "nav.sales", icon: Ticket },
];

const AUDIT_NAV: NavItem = { to: "/audit", labelKey: "nav.audit", icon: ScrollText };

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/operators", labelKey: "nav.admin.operators", icon: Users },
  { to: "/admin/validations", labelKey: "nav.admin.validations", icon: BadgeCheck },
  { to: "/admin/payments", labelKey: "nav.admin.payments", icon: Wallet },
  { to: "/admin/summary", labelKey: "nav.admin.summary", icon: BarChart3 },
];

function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="uppercase">{lang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGS.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}>
            <span className="mr-2">{l.flag}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Scorciatoia al carrello multi-gara con il numero di righe in attesa di invio. */
function CartButton() {
  const { cart } = useToStore();
  const { t } = useI18n();
  const n = cart.length;
  return (
    <Button asChild variant="outline" size="icon" className="relative" aria-label={t("nav.cart")}>
      <Link to="/cart">
        <ShoppingCart className="h-4 w-4" />
        {n > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {n}
          </span>
        )}
      </Link>
    </Button>
  );
}

function NotificationsBell() {
  const { options, bookings, allOptions, isAdmin } = useToStore();
  const { t } = useI18n();
  const expiring = options.filter((o) => o.status === "active" && daysUntil(o.expiresAt) <= 2);
  const duePayments = bookings.filter(
    (b) => b.status !== "issued" && b.status !== "cancelled" && daysUntil(b.paymentDueAt) <= 3,
  );
  const pending = isAdmin ? allOptions.filter((o) => o.status === "pending") : [];
  const total = expiring.length + duePayments.length + (pending.length > 0 ? 1 : 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {total}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))]">
        <DropdownMenuLabel>{t("notif.title")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {total === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            {t("notif.empty")}
          </div>
        )}
        {pending.length > 0 && (
          <DropdownMenuItem className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium">{t("notif.pendingValidation")}</span>
            <span className="text-xs text-muted-foreground">
              {t("notif.pendingValidation.detail", { count: pending.length })}
            </span>
          </DropdownMenuItem>
        )}
        {expiring.map((o) => (
          <DropdownMenuItem key={o.id} className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium">{t("notif.optionExpiring")}</span>
            <span className="text-xs text-muted-foreground">
              {t("notif.optionExpiring.detail", {
                qty: o.qty,
                days: Math.max(0, daysUntil(o.expiresAt)),
              })}
            </span>
          </DropdownMenuItem>
        ))}
        {duePayments.map((b) => (
          <DropdownMenuItem key={b.id} className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium">{t("notif.paymentDue")}</span>
            <span className="text-xs text-muted-foreground">
              {t("notif.paymentDue.detail", {
                customer: b.customer,
                days: Math.max(0, daysUntil(b.paymentDueAt)),
              })}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Contenuto della navigazione, condiviso fra sidebar desktop e drawer mobile. */
function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { t } = useI18n();
  const { isAdmin } = useToStore();

  const renderItem = (n: NavItem) => {
    const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
    const Icon = n.icon;
    return (
      <Link
        key={n.to}
        to={n.to as never}
        onClick={onNavigate}
        className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{t(n.labelKey)}</span>
        {active && <ChevronRight className="h-4 w-4 opacity-70" />}
      </Link>
    );
  };

  const sectionTitle = (label: string) => (
    <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
      {label}
    </div>
  );

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {renderItem(DASHBOARD)}
      {isAdmin ? (
        <>
          {sectionTitle(t("nav.section.admin"))}
          {ADMIN_NAV.map(renderItem)}
          {renderItem(AUDIT_NAV)}
          {/* L'Admin consulta i dati del TO selezionato in sola lettura. */}
          {/* {sectionTitle(t("nav.section.toData"))}
          {OPERATIVE_NAV.map(renderItem)} */}
        </>
      ) : (
        <>
          {sectionTitle(t("nav.section.main"))}
          {OPERATIVE_NAV.map(renderItem)}
          {renderItem(AUDIT_NAV)}
        </>
      )}
    </nav>
  );
}

function BrandHeader() {
  const { t } = useI18n();
  return (
    <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Snowflake className="h-5 w-5" />
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold">Antholz TO</span>
        <span className="truncate text-xs text-sidebar-foreground/60">{t("app.title")}</span>
      </div>
    </div>
  );
}

function SidebarFooter() {
  const { t } = useI18n();
  return (
    <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/60">
      <div>{t("app.event")}</div>
      <div>{t("app.dates")}</div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <BrandHeader />
      <NavContent />
      <SidebarFooter />
    </aside>
  );
}

function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden" aria-label={t("common.menu")}>
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-[17rem] flex-col bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">{t("common.menu")}</SheetTitle>
        <BrandHeader />
        <NavContent onNavigate={() => setOpen(false)} />
        <SidebarFooter />
      </SheetContent>
    </Sheet>
  );
}

function Topbar() {
  // vedere cose tour operator per lui
  const {
    tourOperators,
    currentToId,
    isAdmin,
    currentUserEmail,
    selectedToId,
    setSelectedTo,
    user,
  } = useToStore();
  const { t } = useI18n();
  const to = tourOperators.find((x) => x.id === currentToId);
  const navigate = useNavigate();
  const initials = currentUserEmail.slice(0, 2).toUpperCase();

 
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 sm:px-6 md:h-16 md:flex-nowrap md:py-0">
      <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1 ">
        <MobileNav />
        {isAdmin ? (
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {t("admin.operators.impersonate")}
            </span>
            <Select value={selectedToId ?? ""} onValueChange={(val) => setSelectedTo(val)}>
              <SelectTrigger className="h-8 w-full min-w-0 sm:w-[260px]">
                <SelectValue placeholder={t("admin.operators.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {tourOperators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground sm:text-sm">{t("common.operator")}</span>
            <div className="flex min-w-0 items-center gap-2 ">
              <span className="truncate font-semibold">{user?.nomeCompleto}</span>
              <Badge className="" variant={user?.ruolo === "ADMIN" ? "secondary" : "outline"}>
                {user?.ruolo === "ADMIN" ? t("role.admin") : t("role.to")}
              </Badge>
            </div>
          </div>
        )}
        {isAdmin && (
          <Badge className="hidden gap-1 sm:flex mt-4">
            <ShieldCheck className="h-3 w-3" /> {t("role.adminBadge")}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <CartButton />
        {/* {import.meta.env.DEV && (
          <Select value={isAdmin ? "admin" : "to"} onValueChange={(v) => {}}>
            <SelectTrigger className="h-9 w-[150px] sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="to">{t("role.to")}</SelectItem>
              <SelectItem value="admin">{t("role.admin")}</SelectItem>
            </SelectContent>
          </Select>
        )} */}

        <LanguageSwitcher />
        <NotificationsBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </div>
              <span className="hidden max-w-[10rem] truncate lg:inline">
                {isAdmin ? t("role.admin") : (user?.nomeCompleto ?? "—")}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="max-w-[16rem] truncate">
              {user?.email ?? user?.nomeCompleto ?? "—"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" /> {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
export function ToLayout() {
  return (
    <I18nProvider>
      <ToStoreProvider>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </ToStoreProvider>
    </I18nProvider>
  );
}
