/**
 * Opzioni del Tour Operator (o del TO selezionato dall'Admin, in sola lettura).
 *
 * Regole di ruolo:
 * - conversione e rilascio: solo utente Tour Operator (l'Admin valida dalla
 *   pagina "Validazioni" e non opera al posto del TO);
 * - PDF: "Opzione — Richiesta" per le richieste in attesa, "Opzione — Conferma"
 *   per le opzioni validate. Entrambi scaricabili da TO e Admin.
 *
 * Responsive: tabella su >= md, elenco a schede su mobile.
 */
import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown } from "lucide-react";
import { useToStore, fmtEur, daysUntil, type OptionStatus, type TicketOption } from "@/lib/toStore";
import { useI18n, useFormatters } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { generatePdf } from "@/lib/pdf";
import { ReadOnlyNotice } from "@/components/AdminOnly";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/options")({
  component: OptionsPage,
});

const VARIANT: Record<OptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  active: "default",
  expired: "destructive",
  released: "outline",
  converted: "secondary",
  rejected: "destructive",
};

function OptionsPage() {
  const { options, races, sectors, releaseOption, role, tourOperators, currentToId } = useToStore();
  const { t, lang } = useI18n();
  const { fmtDate, fmtDateOnly } = useFormatters();
  const [filter, setFilter] = React.useState<"all" | OptionStatus>("all");

  const filtered = options.filter((o) => filter === "all" || o.status === filter);
  const count = (s: OptionStatus) => options.filter((o) => o.status === s).length;
  const operatorName = tourOperators.find((x) => x.id === currentToId)?.name ?? "";

  /** Genera il PDF di richiesta o di conferma dell'opzione. */
  const downloadPdf = (o: TicketOption, confirm: boolean) => {
    const r = races.find((x) => x.id === o.raceId)!;
    const s = sectors.find((x) => x.id === o.sectorId)!;
    const file = generatePdf({
      kind: confirm ? "OPTION_CONFIRM" : "OPTION_REQUEST",
      lang,
      number: `OPT-${o.id.toUpperCase()}`,
      operator: operatorName,
      rows: [
        {
          date: fmtDateOnly(r.date),
          race: r.name,
          sector: s.name,
          category: s.priceCategory,
          qty: o.qty,
          unitPrice: s.priceTo,
          total: o.qty * s.priceTo,
        },
      ],
      total: o.qty * s.priceTo,
      extra: [[t("options.expiresAt"), fmtDateOnly(o.expiresAt)]],
    });
    toast.success(t("pdf.generated", { file }));
  };

  const pdfButtons = (o: TicketOption) => (
    <Button size="sm" variant="outline" onClick={() => downloadPdf(o, o.status !== "pending")}>
      <FileDown className="mr-2 h-3.5 w-3.5" />
      {o.status === "pending" ? t("pdf.request") : t("pdf.confirm")}
    </Button>
  );

  const releaseButton = (o: TicketOption) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t("options.release")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("options.release")}?</AlertDialogTitle>
          <AlertDialogDescription>{t("options.release.desc", { qty: o.qty })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.no")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              releaseOption(o.id);
              toast.success(t("options.released"));
            }}
          >
            {t("common.yes")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const actions = (o: TicketOption) => (
    <div className="flex flex-wrap justify-end gap-2">
      {pdfButtons(o)}
      {o.status === "active" && can(role, "option.convert") && (
        <ConvertDialog optionId={o.id} qty={o.qty} unitPrice={sectors.find((x) => x.id === o.sectorId)!.priceTo} />
      )}
      {o.status === "active" && can(role, "option.release") && releaseButton(o)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{t("options.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("options.subtitle")}</p>
      </div>

      <ReadOnlyNotice />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="all">
              {t("common.all")} ({options.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              {t("options.status.pending")} ({count("pending")})
            </TabsTrigger>
            <TabsTrigger value="active">
              {t("options.status.active")} ({count("active")})
            </TabsTrigger>
            <TabsTrigger value="converted">{t("options.status.converted")}</TabsTrigger>
            <TabsTrigger value="released">{t("options.status.released")}</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* --- vista mobile a schede --- */}
      <div className="space-y-3 md:hidden">
        {filtered.map((o) => {
          const r = races.find((x) => x.id === o.raceId)!;
          const s = sectors.find((x) => x.id === o.sectorId)!;
          return (
            <Card key={o.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{s.name}</div>
                  </div>
                  <Badge variant={VARIANT[o.status]}>{t(`options.status.${o.status}`)}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    {t("common.seats")}: <span className="font-medium text-foreground">{o.qty}</span>
                  </div>
                  <div className="text-right">{fmtEur(o.qty * s.priceTo)}</div>
                  <div className="col-span-2">
                    {t("options.expiresAt")}: {fmtDate(o.expiresAt)}
                  </div>
                </div>
                {actions(o)}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">{t("options.empty")}</CardContent>
          </Card>
        )}
      </div>

      {/* --- vista desktop a tabella --- */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.race")}</TableHead>
                <TableHead>{t("common.sector")}</TableHead>
                <TableHead className="text-right">{t("common.seats")}</TableHead>
                <TableHead className="text-right">{t("admin.summary.value")}</TableHead>
                <TableHead>{t("options.expiresAt")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => {
                const r = races.find((x) => x.id === o.raceId)!;
                const s = sectors.find((x) => x.id === o.sectorId)!;
                const d = daysUntil(o.expiresAt);
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(r.date)}</div>
                    </TableCell>
                    <TableCell className="text-sm">{s.name}</TableCell>
                    <TableCell className="text-right font-medium">{o.qty}</TableCell>
                    <TableCell className="text-right">{fmtEur(o.qty * s.priceTo)}</TableCell>
                    <TableCell>
                      <div className="text-xs">{fmtDate(o.expiresAt)}</div>
                      {o.status === "active" && (
                        <div className={`text-xs ${d <= 1 ? "text-destructive" : "text-muted-foreground"}`}>
                          {d <= 0 ? t("dash.expiring.today") : `${d} ${t("common.days")}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={VARIANT[o.status]}>{t(`options.status.${o.status}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{actions(o)}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
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

function ConvertDialog({ optionId, qty, unitPrice }: { optionId: string; qty: number; unitPrice: number }) {
  const { convertOptionToBooking } = useToStore();
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [customer, setCustomer] = React.useState("");
  const [depositPct, setDepositPct] = React.useState(10);
  const total = qty * unitPrice;

  const submit = () => {
    if (!customer.trim()) return;
    convertOptionToBooking(optionId, customer.trim(), depositPct);
    toast.success(t("options.converted"));
    setOpen(false);
    setCustomer("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t("options.convert")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("options.convert")}</DialogTitle>
          <DialogDescription>{t("options.convert.desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">{t("common.customer")}</Label>
            <Input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("options.convert.deposit", { pct: depositPct })}</Label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={depositPct}
              onChange={(e) => setDepositPct(Number(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />
          </div>
          <div className="space-y-1 rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span>{t("common.total")}</span>
              <span className="font-semibold">{fmtEur(total)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("options.convert.deposit", { pct: depositPct })}</span>
              <span className="font-semibold">{fmtEur(Math.round((total * depositPct) / 100))}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit}>{t("common.confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
