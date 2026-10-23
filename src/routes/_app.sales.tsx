import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useToStore, fmtEur, type Sale } from "@/lib/toStore";
import { useI18n, useFormatters } from "@/lib/i18n";
import { generatePdf } from "@/lib/pdf";
import { ReadOnlyNotice } from "@/components/AdminOnly";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/sales")({
  component: SalesPage,
});

function SalesPage() {
  const { sales, races, sectors, tourOperators, currentToId } = useToStore();
  const { t, lang } = useI18n();
  const { fmtDate, fmtDateOnly } = useFormatters();
  const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
  const totalQty = sales.reduce((s, x) => s + x.qty, 0);
  const operatorName = tourOperators.find((x) => x.id === currentToId)?.name ?? "";

  /** PDF dei titoli emessi (voucher). */
  const downloadPdf = (s: Sale) => {
    const r = races.find((x) => x.id === s.raceId);
    const sec = sectors.find((x) => x.id === s.sectorId);
    const file = generatePdf({
      kind: "SALE_VOUCHER",
      lang,
      number: s.voucherCode,
      operator: operatorName,
      rows: [
        {
          date: r ? fmtDateOnly(r.date || new Date().toISOString()) : "—",
          race: r?.name ?? "—",
          sector: sec?.name ?? "—",
          category: sec?.priceCategory ?? "—",
          qty: s.qty,
          unitPrice: sec?.priceTo ?? s.total / Math.max(1, s.qty),
          total: s.total,
        },
      ],
      total: s.total,
      extra: [
        [t("common.customer"), s.customer],
        [t("sales.issuedAt"), fmtDateOnly(s.issuedAt)],
      ],
    });
    toast.success(t("pdf.generated", { file }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{t("sales.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("sales.subtitle")}</p>
      </div>

      <ReadOnlyNotice />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase text-muted-foreground">{t("sales.total")}</div>
            <div className="text-2xl font-semibold">{sales.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase text-muted-foreground">{t("sales.tickets")}</div>
            <div className="text-2xl font-semibold">{totalQty}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase text-muted-foreground">{t("sales.revenue")}</div>
            <div className="text-2xl font-semibold">{fmtEur(totalRevenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* --- vista mobile a schede --- */}
      <div className="space-y-3 md:hidden">
        {sales.map((s) => {
          const r = races.find((x) => x.id === s.raceId);
          const sec = sectors.find((x) => x.id === s.sectorId);
          return (
            <Card key={s.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.customer}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r?.name ?? "—"} — {sec?.name ?? "—"}
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {s.voucherCode}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("common.seats")}: <span className="font-medium text-foreground">{s.qty}</span>{" "}
                  · {fmtEur(s.total)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("sales.issuedAt")}: {fmtDate(s.issuedAt)}
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => downloadPdf(s)}>
                    <Download className="mr-2 h-3.5 w-3.5" />
                    {t("pdf.voucher")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sales.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t("sales.empty")}
            </CardContent>
          </Card>
        )}
      </div>

      {/* --- vista desktop a tabella --- */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("sales.voucher")}</TableHead>
                <TableHead>{t("common.customer")}</TableHead>
                <TableHead>{t("common.race")}</TableHead>
                <TableHead className="text-right">{t("common.seats")}</TableHead>
                <TableHead className="text-right">{t("common.amount")}</TableHead>
                <TableHead>{t("sales.issuedAt")}</TableHead>
                <TableHead className="text-right">{t("common.pdf")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => {
                const r = races.find((x) => x.id === s.raceId);
                const sec = sectors.find((x) => x.id === s.sectorId);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {s.voucherCode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{s.customer}</TableCell>
                    <TableCell>
                      <div className="text-sm">{r?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{sec?.name ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{s.qty}</TableCell>
                    <TableCell className="text-right">{fmtEur(s.total)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(s.issuedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(s)}>
                        <Download className="mr-2 h-3.5 w-3.5" />
                        {t("common.download")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    {t("sales.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
