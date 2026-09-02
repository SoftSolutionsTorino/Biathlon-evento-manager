/**
 * Admin — Riepilogo generale.
 * Totali di opzioni, prenotazioni e vendite per settore e tipologia di prezzo,
 * più il dettaglio per Tour Operator, con esportazione in Excel/CSV.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useToStore, fmtEur, downloadCsv } from "@/lib/toStore";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AdminOnly } from "@/components/AdminOnly";

export const Route = createFileRoute("/_app/admin/summary")({
  component: () => (
    <AdminOnly>
      <SummaryPage />
    </AdminOnly>
  ),
});

type Agg = { qty: number; value: number };
const empty = (): Agg => ({ qty: 0, value: 0 });

function SummaryPage() {
  const { allOptions, allBookings, allSales, sectors, tourOperators } = useToStore();
  const { t } = useI18n();

  // --- aggregazione per settore + tipologia di prezzo ---
  const bySector = sectors.map((s) => {
    const opt = allOptions
      .filter((o) => o.sectorId === s.id && (o.status === "active" || o.status === "pending"))
      .reduce<Agg>((a, o) => ({ qty: a.qty + o.qty, value: a.value + o.qty * s.priceTo }), empty());
    const boo = allBookings
      .filter((b) => b.sectorId === s.id && b.status !== "cancelled")
      .reduce<Agg>((a, b) => ({ qty: a.qty + b.qty, value: a.value + b.total }), empty());
    const sal = allSales
      .filter((x) => x.sectorId === s.id)
      .reduce<Agg>((a, x) => ({ qty: a.qty + x.qty, value: a.value + x.total }), empty());
    return { sector: s, opt, boo, sal };
  }).filter((r) => r.opt.qty + r.boo.qty + r.sal.qty > 0);

  // --- aggregazione per Tour Operator ---
  const byOperator = tourOperators.map((op) => {
    const opt = allOptions
      .filter((o) => o.toId === op.id && (o.status === "active" || o.status === "pending"))
      .reduce<Agg>((a, o) => {
        const sec = sectors.find((s) => s.id === o.sectorId)!;
        return { qty: a.qty + o.qty, value: a.value + o.qty * sec.priceTo };
      }, empty());
    const boo = allBookings
      .filter((b) => b.toId === op.id && b.status !== "cancelled")
      .reduce<Agg>((a, b) => ({ qty: a.qty + b.qty, value: a.value + b.total }), empty());
    const sal = allSales
      .filter((x) => x.toId === op.id)
      .reduce<Agg>((a, x) => ({ qty: a.qty + x.qty, value: a.value + x.total }), empty());
    return { op, opt, boo, sal };
  });

  const totals = bySector.reduce(
    (a, r) => ({
      opt: { qty: a.opt.qty + r.opt.qty, value: a.opt.value + r.opt.value },
      boo: { qty: a.boo.qty + r.boo.qty, value: a.boo.value + r.boo.value },
      sal: { qty: a.sal.qty + r.sal.qty, value: a.sal.value + r.sal.value },
    }),
    { opt: empty(), boo: empty(), sal: empty() },
  );

  const exportAll = () => {
    downloadCsv(`riepilogo-area-to-${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        t("common.sector"),
        t("admin.operators.col.discount"),
        `${t("admin.summary.col.options")} ${t("admin.summary.qty")}`,
        `${t("admin.summary.col.options")} ${t("admin.summary.value")}`,
        `${t("admin.summary.col.bookings")} ${t("admin.summary.qty")}`,
        `${t("admin.summary.col.bookings")} ${t("admin.summary.value")}`,
        `${t("admin.summary.col.sales")} ${t("admin.summary.qty")}`,
        `${t("admin.summary.col.sales")} ${t("admin.summary.value")}`,
      ],
      ...bySector.map((r) => [
        r.sector.name,
        r.sector.priceCategory,
        r.opt.qty, r.opt.value,
        r.boo.qty, r.boo.value,
        r.sal.qty, r.sal.value,
      ]),
    ]);
    toast.success(t("admin.summary.exported"));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{t("admin.summary.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.summary.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={exportAll}>
          <Download className="mr-2 h-4 w-4" />
          {t("common.export.excel")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase text-muted-foreground">{t("admin.summary.col.options")}</div>
            <div className="text-2xl font-semibold">{totals.opt.qty}</div>
            <div className="text-xs text-muted-foreground">{fmtEur(totals.opt.value)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase text-muted-foreground">{t("admin.summary.col.bookings")}</div>
            <div className="text-2xl font-semibold">{totals.boo.qty}</div>
            <div className="text-xs text-muted-foreground">{fmtEur(totals.boo.value)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase text-muted-foreground">{t("admin.summary.col.sales")}</div>
            <div className="text-2xl font-semibold">{totals.sal.qty}</div>
            <div className="text-xs text-muted-foreground">{fmtEur(totals.sal.value)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t("admin.summary.bySector")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.sector")}</TableHead>
                <TableHead className="text-right">{t("admin.summary.col.options")}</TableHead>
                <TableHead className="text-right">{t("admin.summary.col.bookings")}</TableHead>
                <TableHead className="text-right">{t("admin.summary.col.sales")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bySector.map((r) => (
                <TableRow key={r.sector.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{r.sector.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.sector.priceCategory} · {fmtEur(r.sector.priceTo)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm font-medium">{r.opt.qty}</div>
                    <div className="text-xs text-muted-foreground">{fmtEur(r.opt.value)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm font-medium">{r.boo.qty}</div>
                    <div className="text-xs text-muted-foreground">{fmtEur(r.boo.value)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm font-medium">{r.sal.qty}</div>
                    <div className="text-xs text-muted-foreground">{fmtEur(r.sal.value)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t("admin.summary.byOperator")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.summary.col.operator")}</TableHead>
                <TableHead className="text-right">{t("admin.summary.col.options")}</TableHead>
                <TableHead className="text-right">{t("admin.summary.col.bookings")}</TableHead>
                <TableHead className="text-right">{t("admin.summary.col.sales")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byOperator.map((r) => (
                <TableRow key={r.op.id}>
                  <TableCell className="text-sm font-medium">{r.op.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm">{r.opt.qty}</div>
                    <div className="text-xs text-muted-foreground">{fmtEur(r.opt.value)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm">{r.boo.qty}</div>
                    <div className="text-xs text-muted-foreground">{fmtEur(r.boo.value)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm">{r.sal.qty}</div>
                    <div className="text-xs text-muted-foreground">{fmtEur(r.sal.value)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
