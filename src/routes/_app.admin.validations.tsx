/**
 * Admin — Validazione richieste e avvisi di scadenza.
 * Ogni opzione richiesta dal TO resta "pending" finché l'Admin non la valida;
 * dopo la validazione l'Admin invia manualmente il PDF Optionsformular.
 * Gli avvisi di scadenza non partono mai in automatico: l'Admin seleziona le
 * opzioni in scadenza e decide se inviare l'email.
 */
import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, X, FileDown, Send } from "lucide-react";
import { useToStore, fmtEur, daysUntil } from "@/lib/toStore";
import { useI18n, useFormatters } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AdminOnly } from "@/components/AdminOnly";

export const Route = createFileRoute("/_app/admin/validations")({
  component: () => (
    <AdminOnly>
      <ValidationsPage />
    </AdminOnly>
  ),
});

function ValidationsPage() {
  const { allOptions, tourOperators, races, sectors, validateOption, rejectOption, sendOptionPdf, sendExpiryAlerts } =
    useToStore();
  const { t } = useI18n();
  const { fmtDate } = useFormatters();
  const [selected, setSelected] = React.useState<string[]>([]);

  const pending = allOptions.filter((o) => o.status === "pending");
  const expiring = allOptions.filter((o) => o.status === "active" && daysUntil(o.expiresAt) <= 7);
  const toName = (id: string) => tourOperators.find((x) => x.id === id)?.name ?? id;

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{t("admin.validations.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.validations.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {t("admin.validations.pending")} ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.summary.col.operator")}</TableHead>
                <TableHead>{t("common.race")}</TableHead>
                <TableHead>{t("common.sector")}</TableHead>
                <TableHead className="text-right">{t("common.seats")}</TableHead>
                <TableHead className="text-right">{t("common.amount")}</TableHead>
                <TableHead>{t("common.notes")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((o) => {
                const r = races.find((x) => x.id === o.raceId)!;
                const s = sectors.find((x) => x.id === o.sectorId)!;
                return (
                  <TableRow key={o.id}>
                    <TableCell className="text-sm font-medium">{toName(o.toId)}</TableCell>
                    <TableCell className="text-sm">{r.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.name}</TableCell>
                    <TableCell className="text-right font-medium">{o.qty}</TableCell>
                    <TableCell className="text-right text-sm">{fmtEur(o.qty * s.priceTo)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.note ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            validateOption(o.id);
                            toast.success(t("admin.validations.validated"));
                          }}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          {t("admin.validations.validate")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            rejectOption(o.id);
                            toast.success(t("admin.validations.rejected"));
                          }}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          {t("admin.validations.reject")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    {t("admin.validations.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="text-base font-semibold">{t("admin.validations.alerts")}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.validations.alerts.desc")}</p>
          </div>
          <Button
            disabled={selected.length === 0}
            onClick={() => {
              sendExpiryAlerts(selected);
              toast.success(t("admin.validations.alertsSent", { count: selected.length }));
              setSelected([]);
            }}
          >
            <Send className="mr-2 h-4 w-4" />
            {t("admin.validations.sendAlerts", { count: selected.length })}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>{t("admin.summary.col.operator")}</TableHead>
                <TableHead>{t("common.race")}</TableHead>
                <TableHead className="text-right">{t("common.seats")}</TableHead>
                <TableHead>{t("options.expiresAt")}</TableHead>
                <TableHead className="text-right">{t("common.pdf")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiring.map((o) => {
                const r = races.find((x) => x.id === o.raceId)!;
                const d = daysUntil(o.expiresAt);
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Checkbox checked={selected.includes(o.id)} onCheckedChange={() => toggle(o.id)} />
                    </TableCell>
                    <TableCell className="text-sm font-medium">{toName(o.toId)}</TableCell>
                    <TableCell className="text-sm">{r.name}</TableCell>
                    <TableCell className="text-right">{o.qty}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{fmtDate(o.expiresAt)}</span>
                        <Badge variant={d <= 1 ? "destructive" : "secondary"}>
                          {d <= 0 ? t("dash.expiring.today") : `${d} ${t("common.days")}`}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={o.pdfSent ? "outline" : "secondary"}
                        onClick={() => {
                          sendOptionPdf(o.id);
                          toast.success(t("admin.validations.pdfSent", { name: toName(o.toId) }));
                        }}
                      >
                        <FileDown className="mr-2 h-3.5 w-3.5" />
                        {t("admin.validations.sendPdf")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {expiring.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    {t("options.empty")}
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
