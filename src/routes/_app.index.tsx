import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Clock,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  BadgeCheck,
} from "lucide-react";
import { useToStore, fmtEur, daysUntil } from "@/lib/toStore";
import { useI18n, useFormatters } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmailLogSection } from "@/components/EmailLogSection";
export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  hint?: string;
  tone?: "default" | "success" | "warning" | "info";
}) {
  const toneCls =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/15 text-warning-foreground"
        : tone === "info"
          ? "bg-info/10 text-info"
          : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${toneCls}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
          {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const {
    options,
    bookings,
    sales,
    races,
    sectors,
    tourOperators,
    currentToId,
    isAdmin,
    allOptions,
    allSales,
    user,
  } = useToStore();
  const { t } = useI18n();
  const { fmtDate } = useFormatters();

  const to = tourOperators.find((x) => x.id === currentToId)!;
  const activeOptions = options.filter((o) => o.statoId === 2);
  const expiringSoon = activeOptions.filter((o) => daysUntil(o.expiresAt) <= 2);
  const openBookings = bookings.filter((b) => b.statoId !== 6 && b.statoId !== 7);
  const issuedQty = sales.reduce((s, x) => s + x.qty, 0);
  const plafondPct = Math.round((to?.used / to?.plafond) * 100);

  const pendingCount = allOptions.filter((o) => o.statoId === 1).length;
  const enabledCount = tourOperators.filter((o) => o.enabled).length;
  const globalRevenue = allSales.reduce((s, x) => s + x.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("dash.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? t("dash.subtitle.admin") : t("dash.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isAdmin ? (
          <>
            <KpiCard
              label={t("dash.kpi.pendingValidation")}
              value={String(pendingCount)}
              icon={BadgeCheck}
              hint={t("dash.kpi.pendingValidation.hint")}
              tone="warning"
            />
            {/* <KpiCard
              label={t("dash.kpi.operators")}
              value={String(enabledCount)}
              icon={Users}
              hint={t("dash.kpi.operators.hint", { total: tourOperators.length })}
              tone="info"
            />
            <KpiCard
              label={t("dash.kpi.issued")}
              value={String(allSales.reduce((s, x) => s + x.qty, 0))}
              icon={Ticket}
              hint={t("dash.kpi.issued.hint", { count: allSales.length })}
              tone="success"
            /> */}
            <KpiCard
              label={t("dash.kpi.revenue")}
              value={fmtEur(globalRevenue)}
              icon={TrendingUp}
            />
          </>
        ) : (
          <>
            <KpiCard
              label={t("dash.kpi.activeOptions")}
              value={String(activeOptions.length)}
              icon={Clock}
              hint={t("dash.kpi.activeOptions.hint", { count: expiringSoon.length })}
              tone="info"
            />
            <KpiCard
              label={t("dash.kpi.openBookings")}
              value={String(openBookings.length)}
              icon={ClipboardList}
              hint={t("dash.kpi.openBookings.hint", {
                count: bookings.filter((b) => b.status === "pending_payment").length,
              })}
              tone="warning"
            />
            {/* <KpiCard
              label={t("dash.kpi.issued")}
              value={String(issuedQty)}
              icon={Ticket}
              hint={t("dash.kpi.issued.hint", { count: sales.length })}
              tone="success"
            />
            <KpiCard
              label={t("dash.kpi.plafond")}
              value={fmtEur(to?.used)}
              icon={Wallet}
              hint={t("dash.kpi.plafond.hint", { total: fmtEur(to?.plafond), pct: plafondPct })}
            /> */}
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" />
              {t("dash.expiring")}
            </CardTitle>
            <Link to="/options" className="text-xs text-primary hover:underline">
              {t("common.viewAll")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiringSoon.length === 0 && (
              <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                {t("dash.expiring.empty")}
              </div>
            )}
            {expiringSoon.map((o) => {
              const r = races.find((x) => x.id === o.raceId)!;
              const sec = sectors.find((x) => x.id === o.sectorId)!;
              const d = daysUntil(o.expiresAt);
              return (
                <div key={o.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">{r?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {sec?.name} · {o.qty} {t("common.seats")} · {fmtDate(o.expiresAt)}
                    </div>
                  </div>
                  <Badge variant={d <= 1 ? "destructive" : "secondary"}>
                    {d <= 0 ? t("dash.expiring.today") : `${d} ${t("common.days")}`}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card> */}

        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" /> {t("dash.plafond")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-semibold">{fmtEur(to?.plafond - to?.used)}</div>
            <div className="text-xs text-muted-foreground">
              {t("dash.plafond.available", { total: fmtEur(to?.plafond) })}
            </div>
            <Progress value={plafondPct} />
            <div className="text-xs text-muted-foreground">
              {t("dash.plafond.used", { pct: plafondPct })}
            </div>
          </CardContent>
        </Card> */}
      </div>
      {isAdmin ? (
        <EmailLogSection max={10} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                {t("dash.expiring")}
              </CardTitle>
              <Link to="/options" className="text-xs text-primary hover:underline">
                {t("common.viewAll")}
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {expiringSoon.length === 0 && (
                <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                  {t("dash.expiring.empty")}
                </div>
              )}
              {expiringSoon.map((o) => {
                const r = races.find((x) => x.id === o.raceId)!;
                const sec = sectors.find((x) => x.id === o.sectorId)!;
                const d = daysUntil(o.expiresAt);
                return (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">{r?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {sec?.name} · {o.qty} {t("common.seats")} · {fmtDate(o.expiresAt)}
                      </div>
                    </div>
                    <Badge variant={d <= 1 ? "destructive" : "secondary"}>
                      {d <= 0 ? t("dash.expiring.today") : `${d} ${t("common.days")}`}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" /> {t("dash.program")}
          </CardTitle>
          <Link to="/races" className="text-xs text-primary hover:underline">
            {t("dash.openCatalog")}
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {races.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDate(r.date || new Date().toISOString())}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
