import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, X, Search, Euro, Ticket, ClipboardCheck, Pencil } from "lucide-react";
import { useToStore, fmtEur, type TicketOption, type Booking } from "@/lib/toStore";
import { useI18n, useFormatters } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AdminOnly } from "@/components/AdminOnly";

export const Route = createFileRoute("/_app/admin/validations")({
  component: () => (
    <AdminOnly>
      <ValidationsPage />
    </AdminOnly>
  ),
});

function nomeLocalizzato(
  e: { nameIt: string; nameDe?: string | null; nameEn?: string | null },
  lang: string,
): string {
  const l = (lang ?? "it").toLowerCase();
  if (l.startsWith("en") && e.nameEn) return e.nameEn;
  if (l.startsWith("de") && e.nameDe) return e.nameDe;
  return e.nameIt;
}

const STATO = {
  IN_VALIDAZIONE: 1,
  VALIDATA: 2,
  CONVERTITA: 3,
  RILASCIATA: 4,
  SALDATA: 5,
  CANCELLATA: 6,
  DA_SALDARE: 7,
} as const;

const HIDDEN_STATI_OPZIONI = new Set<number>([STATO.RILASCIATA, STATO.DA_SALDARE, STATO.SALDATA]);
const HIDDEN_STATI_PRENOTAZIONI = new Set<number>([STATO.RILASCIATA, STATO.CONVERTITA]);

const VARIANT_BY_STATO_ID: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  1: "secondary",
  2: "default",
  3: "secondary",
  4: "outline",
  5: "default",
  6: "destructive",
  7: "secondary",
};

const GRID_ROWS = "grid grid-cols-[1.6fr_1.6fr_70px_110px_40px] items-center gap-3";
const GRID_ROWS_WITH_CUSTOMER =
  "grid grid-cols-[1.4fr_1.4fr_70px_110px_1.4fr_40px] items-center gap-3";

const SECTION_STYLE = {
  options: {
    Icon: Ticket,
    accent: "text-amber-500 dark:text-amber-400",
    headerBg: "bg-amber-50/70 dark:bg-amber-950/40",
    strip: "bg-amber-200 dark:bg-amber-800",
  },
  bookings: {
    Icon: ClipboardCheck,
    accent: "text-blue-600 dark:text-blue-500",
    headerBg: "bg-blue-50/70 dark:bg-blue-950/40",
    strip: "bg-blue-200 dark:bg-blue-800",
  },
} as const;

type CambiaTariffaTarget = {
  kind: "opzione" | "prenotazione";
  parentId: number;
  rigaId: number;
  garaId: number;
  settoreId: string;
  prezzoId: number;
  tourOperatorId: number;
  raceName: string;
  currentSectorName: string;
  currentQty: number;
};

type OptionGroup = {
  optionId: number;
  toId: string;
  statoId: number;
  expiresAt: string;
  note?: string;
  rows: TicketOption[];
};

type BookingGroup = {
  prenotazioneId: number;
  toId: string;
  statoId: number;
  customer: string;
  paymentDueAt: string;
  rows: Booking[];
};

function ColLabel({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  description,
  accent,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  description?: string;
  accent: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <CardHeader className={className}>
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Icon className={`h-5 w-5 ${accent}`} />
            <span>{title}</span>
            {count !== undefined && (
              <span className="text-base font-normal text-muted-foreground">({count})</span>
            )}
          </CardTitle>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    </CardHeader>
  );
}

function ValidationsPage() {
  const {
    options,
    bookings,
    races,
    sectors,
    tourOperators,
    statiRichiesta,
    updateOptionStato,
    updatePrenotazioneStato,
    selectedTOperator,
    user,
  } = useToStore();
  const { t, lang } = useI18n();
  const { fmtDate } = useFormatters();

  const [filterOptions, setFilterOptions] = React.useState<"all" | string>("all");
  const [filterBookings, setFilterBookings] = React.useState<"all" | string>("all");
  const [busy, setBusy] = React.useState<string | null>(null);

  const [tariffaTarget, setTariffaTarget] = React.useState<CambiaTariffaTarget | null>(null);
  const [tariffaOpen, setTariffaOpen] = React.useState(false);
  const raceName = (id: string) => {
    const r = races.find((x) => x.id === id);
    return r ? nomeLocalizzato(r, lang) : id;
  };

  const sectorName = (id: string) => {
    const s = sectors.find((x) => x.id === id);
    return s ? nomeLocalizzato(s, lang) : id;
  };

  const statoLabel = (id: number) => {
    const s = statiRichiesta.find((x) => x.id === id);
    if (!s) return `#${id}`;
    const l = (lang ?? "it").toLowerCase();
    if (l.startsWith("en")) return s.descrizioneEN;
    if (l.startsWith("de")) return s.descrizioneDE;
    return s.descrizioneIT;
  };
  const sectorPrice = (id: string) => sectors.find((x) => x.id === id)?.priceTo ?? 0;

  const visibleStatiOpzioni = React.useMemo(
    () => statiRichiesta.filter((s) => !HIDDEN_STATI_OPZIONI.has(s.id)),
    [statiRichiesta],
  );
  const visibleStatiPrenotazioni = React.useMemo(
    () => statiRichiesta.filter((s) => !HIDDEN_STATI_PRENOTAZIONI.has(s.id)),
    [statiRichiesta],
  );

  const countsByStatoOpzioni = React.useMemo(() => {
    const perStato = new Map<number, Set<number>>();
    for (const o of options) {
      let set = perStato.get(o.statoId);
      if (!set) {
        set = new Set<number>();
        perStato.set(o.statoId, set);
      }
      set.add(o.optionId);
    }
    const m = new Map<number, number>();
    for (const [statoId, set] of perStato) m.set(statoId, set.size);
    return m;
  }, [options]);

  const countsByStatoPrenotazioni = React.useMemo(() => {
    const perStato = new Map<number, Set<number>>();
    for (const b of bookings) {
      const prenId = Number(b.id.split("-")[0]);
      let set = perStato.get(b.statoId);
      if (!set) {
        set = new Set<number>();
        perStato.set(b.statoId, set);
      }
      set.add(prenId);
    }
    const m = new Map<number, number>();
    for (const [statoId, set] of perStato) m.set(statoId, set.size);
    return m;
  }, [bookings]);

  const filteredOptions = React.useMemo(
    () =>
      filterOptions === "all"
        ? options
        : options.filter((o) => String(o.statoId) === filterOptions),
    [options, filterOptions],
  );
  const filteredBookings = React.useMemo(
    () =>
      filterBookings === "all"
        ? bookings
        : bookings.filter((b) => String(b.statoId) === filterBookings),
    [bookings, filterBookings],
  );

  const groupedOptions = React.useMemo(() => groupOptionRows(filteredOptions), [filteredOptions]);
  const groupedBookings = React.useMemo(
    () => groupBookingRows(filteredBookings),
    [filteredBookings],
  );

  const runOptionAction = async (optionId: number, idStato: number, okMsg: string) => {
    setBusy(`o-${optionId}`);
    try {
      await updateOptionStato(
        optionId,
        idStato,
        parseInt(selectedTOperator?.id ?? "0"),
        user?.id ?? 0,
      );
      toast.success(okMsg);
    } catch {
      /* lo store mostra già il toast d'errore */
    } finally {
      setBusy(null);
    }
  };

  const runBookingAction = async (prenotazioneId: number, idStato: number, okMsg: string) => {
    setBusy(`b-${prenotazioneId}`);
    try {
      await updatePrenotazioneStato(
        prenotazioneId,
        idStato,
        parseInt(selectedTOperator?.id ?? "0"),
        user?.id ?? 0,
      );
      toast.success(okMsg);
    } catch {
      /* ... */
    } finally {
      setBusy(null);
    }
  };

  const openTariffaOpzione = React.useCallback(
    (o: TicketOption) => {
      const idx = o.sectorId.indexOf("-");
      setTariffaTarget({
        kind: "opzione",
        parentId: o.optionId,
        rigaId: o.rigaId,
        garaId: Number(o.sectorId.slice(0, idx)),
        settoreId: o.sectorId.slice(idx + 1),
        prezzoId: o.prezzoId ?? 0,
        tourOperatorId: parseInt(selectedTOperator?.id ?? "0", 10),
        raceName: raceName(o.raceId),
        currentSectorName: sectorName(o.sectorId),
        currentQty: o.qty,
      });
      setTariffaOpen(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [races, sectors, selectedTOperator?.id],
  );

  const openTariffaPrenotazione = React.useCallback(
    (b: Booking) => {
      const idx = b.sectorId.indexOf("-");
      setTariffaTarget({
        kind: "prenotazione",
        parentId: Number(b.id.split("-")[0]),
        rigaId: Number(b.id.split("-")[1]),
        garaId: Number(b.sectorId.slice(0, idx)),
        settoreId: b.sectorId.slice(idx + 1),
        prezzoId: b.prezzoId ?? 0,
        tourOperatorId: parseInt(selectedTOperator?.id ?? "0", 10),
        raceName: raceName(b.raceId),
        currentSectorName: sectorName(b.sectorId),
        currentQty: b.qty,
      });
      setTariffaOpen(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [races, sectors, selectedTOperator?.id],
  );

  if (!selectedTOperator) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{t("admin.validations.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.validations.subtitle")}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p className="max-w-md text-sm text-muted-foreground">
              {t("admin.validations.selectTo")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const operatorName = selectedTOperator.company || selectedTOperator.name;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{t("admin.validations.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.validations.subtitle")}</p>
      </div>

      {/* ============================ OPZIONI ============================ */}
      <Card className="relative overflow-hidden">
        <div className={`absolute inset-x-0 top-0 h-1 ${SECTION_STYLE.options.strip}`} />
        <SectionHeader
          icon={SECTION_STYLE.options.Icon}
          accent={SECTION_STYLE.options.accent}
          className={SECTION_STYLE.options.headerBg}
          title={t("admin.validations.options")}
        />

        <div className="border-b px-4 pb-3 pt-1 sm:px-5">
          <Tabs
            value={filterOptions}
            onValueChange={(v) => setFilterOptions(v as typeof filterOptions)}
          >
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList className="w-max">
                <TabsTrigger value="all">
                  {t("common.all")} ({groupedOptions.length})
                </TabsTrigger>
                {visibleStatiOpzioni.map((s) => (
                  <TabsTrigger key={s.id} value={String(s.id)}>
                    {lang === "it" && s.descrizioneIT} {lang === "en" && s.descrizioneEN}{" "}
                    {lang === "de" && s.descrizioneDE} ({countsByStatoOpzioni.get(s.id) ?? 0})
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </div>
        <CardContent className="space-y-3 pt-4">
          {groupedOptions.length === 0 ? (
            <EmptyState>{t("admin.validations.empty")}</EmptyState>
          ) : (
            groupedOptions.map((g) => {
              const isPending = g.statoId === STATO.IN_VALIDAZIONE;
              const isBusy = busy === `o-${g.optionId}`;
              return (
                <div key={g.optionId} className="rounded-md border">
                  <div className="flex flex-col gap-2 bg-muted/30 px-5 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        #{g.rows[0].numeroOpzione}
                      </span>
                      <span className="text-sm font-medium">{operatorName}</span>
                      <Badge variant={VARIANT_BY_STATO_ID[g.statoId] ?? "secondary"}>
                        {statoLabel(g.statoId)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t("options.expiresAt")}: {fmtDate(g.expiresAt)}
                      </span>
                    </div>
                    {isPending && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={isBusy}
                          onClick={() =>
                            runOptionAction(
                              g.optionId,
                              STATO.VALIDATA,
                              t("admin.validations.validated"),
                            )
                          }
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          {t("admin.validations.validate")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() =>
                            runOptionAction(
                              g.optionId,
                              STATO.CANCELLATA,
                              t("admin.validations.rejected"),
                            )
                          }
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          {t("admin.validations.reject")}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className={`${GRID_ROWS} px-5 py-1.5`}>
                    <ColLabel>{t("common.race")}</ColLabel>
                    <ColLabel>{t("common.sector")}</ColLabel>
                    <ColLabel align="right">{t("common.seats")}</ColLabel>
                    <ColLabel align="right">{t("common.amount")}</ColLabel>
                    <ColLabel align="right">{t("common.actions")}</ColLabel>
                  </div>

                  <div className="divide-y">
                    {g.rows.map((o) => (
                      <div key={o.id} className={`${GRID_ROWS} px-5 py-2 text-sm`}>
                        <span className="truncate">{raceName(o.raceId)}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {sectorName(o.sectorId)}
                        </span>
                        <span className="text-right font-medium tabular-nums">{o.qty}</span>
                        <span className="text-right">
                          {fmtEur(o.totale ?? o.qty * sectorPrice(o.sectorId))}
                        </span>
                        <div className="flex justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title={t("admin.validations.changeTariffaQty")}
                            onClick={() => openTariffaOpzione(o)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {g.note && (
                    <div className="bg-muted/20 px-5 py-2 text-xs text-muted-foreground">
                      <span className="font-medium">{t("common.notes")}:</span> {g.note}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ============================ PRENOTAZIONI ============================ */}
      <Card className="relative overflow-hidden">
        <div className={`absolute inset-x-0 top-0 h-1 ${SECTION_STYLE.bookings.strip}`} />
        <SectionHeader
          icon={SECTION_STYLE.bookings.Icon}
          accent={SECTION_STYLE.bookings.accent}
          className={SECTION_STYLE.bookings.headerBg}
          title={t("admin.validations.bookings")}
          description={t("admin.validations.bookings.desc")}
        />

        <div className="border-b px-4 pb-3 pt-1 sm:px-5">
          <Tabs
            value={filterBookings}
            onValueChange={(v) => setFilterBookings(v as typeof filterBookings)}
          >
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList className="w-max">
                <TabsTrigger value="all">
                  {t("common.all")} ({groupedBookings.length})
                </TabsTrigger>
                {visibleStatiPrenotazioni.map((s) => (
                  <TabsTrigger key={s.id} value={String(s.id)}>
                    {lang === "it" && s.descrizioneIT} {lang === "en" && s.descrizioneEN}{" "}
                    {lang === "de" && s.descrizioneDE} ({countsByStatoPrenotazioni.get(s.id) ?? 0})
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </div>

        <CardContent className="space-y-3 pt-4">
          {groupedBookings.length === 0 ? (
            <EmptyState>{t("admin.validations.empty")}</EmptyState>
          ) : (
            groupedBookings.map((g) => {
              const isPending = g.statoId === STATO.IN_VALIDAZIONE;
              const isToPay = g.statoId === STATO.DA_SALDARE;
              const isBusy = busy === `b-${g.prenotazioneId}`;
              const d = new Date(g.paymentDueAt).getTime() - Date.now();
              const days = Math.ceil(d / 86400000);
              return (
                <div key={g.prenotazioneId} className="rounded-md border">
                  <div className="flex flex-col gap-2 bg-muted/30 px-5 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-foreground-muted">
                        #{g.rows[0].numeroPrenotazione}
                      </span>
                      <span className="text-sm font-medium">{operatorName}</span>
                      <Badge variant={VARIANT_BY_STATO_ID[g.statoId] ?? "secondary"}>
                        {statoLabel(g.statoId)}
                      </Badge>
                      {isToPay && (
                        <>
                          <span className="text-xs text-muted-foreground">
                            {t("options.expiresAt")}: {fmtDate(g.paymentDueAt)}
                          </span>
                          <Badge variant={days <= 1 ? "destructive" : "secondary"}>
                            {days <= 0 ? t("dash.expiring.today") : `${days} ${t("common.days")}`}
                          </Badge>
                        </>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            disabled={isBusy}
                            onClick={() =>
                              runBookingAction(
                                g.prenotazioneId,
                                STATO.DA_SALDARE,
                                t("admin.validations.bookingValidated"),
                              )
                            }
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            {t("admin.validations.validate")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() =>
                              runBookingAction(
                                g.prenotazioneId,
                                STATO.CANCELLATA,
                                t("admin.validations.rejected"),
                              )
                            }
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            {t("admin.validations.reject")}
                          </Button>
                        </>
                      )}
                      {isToPay && (
                        <Button
                          size="sm"
                          disabled={isBusy}
                          onClick={() =>
                            runBookingAction(
                              g.prenotazioneId,
                              STATO.SALDATA,
                              t("admin.validations.bookingPaid"),
                            )
                          }
                        >
                          <Euro className="mr-1 h-3.5 w-3.5" />
                          {t("admin.validations.pay")}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className={`${GRID_ROWS_WITH_CUSTOMER} px-5 py-1.5`}>
                    <ColLabel>{t("common.race")}</ColLabel>
                    <ColLabel>{t("common.sector")}</ColLabel>
                    <ColLabel align="right">{t("common.seats")}</ColLabel>
                    <ColLabel align="right">{t("common.amount")}</ColLabel>
                    <ColLabel>{t("common.customer")}</ColLabel>
                    <ColLabel align="right">{t("common.actions")}</ColLabel>
                  </div>

                  <div className="divide-y">
                    {g.rows.map((b) => (
                      <div key={b.id} className={`${GRID_ROWS_WITH_CUSTOMER} px-5 py-2 text-sm`}>
                        <span className="truncate">{raceName(b.raceId)}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {sectorName(b.sectorId)}
                        </span>
                        <span className="text-right font-medium tabular-nums">{b.qty}</span>
                        <span className="text-right">{fmtEur(b.total)}</span>
                        <span className="truncate text-xs text-muted-foreground">{g.customer}</span>
                        <div className="flex justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title={t("admin.validations.changeTariffaQty")}
                            onClick={() => openTariffaPrenotazione(b)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <TariffaQuantitaDialog
        target={tariffaTarget}
        open={tariffaOpen}
        onOpenChange={(v) => {
          setTariffaOpen(v);
          if (!v) setTariffaTarget(null);
        }}
      />
    </div>
  );
}

function groupOptionRows(rows: TicketOption[]): OptionGroup[] {
  const map = new Map<number, OptionGroup>();
  for (const o of rows) {
    let g = map.get(o.optionId);
    if (!g) {
      g = {
        optionId: o.optionId,
        toId: o.toId,
        statoId: o.statoId,
        expiresAt: o.expiresAt,
        note: o.note,
        rows: [],
      };
      map.set(o.optionId, g);
    }
    g.rows.push(o);
  }
  return [...map.values()];
}

function groupBookingRows(rows: Booking[]): BookingGroup[] {
  const map = new Map<number, BookingGroup>();
  for (const b of rows) {
    const id = Number(b.id.split("-")[0]);
    let g = map.get(id);
    if (!g) {
      g = {
        prenotazioneId: id,
        toId: b.toId,
        statoId: b.statoId,
        customer: b.customer,
        paymentDueAt: b.paymentDueAt,
        rows: [],
      };
      map.set(id, g);
    }
    g.rows.push(b);
  }
  return [...map.values()];
}

// --------------------------------------------------------- dialog inline

function TariffaQuantitaDialog({
  target,
  open,
  onOpenChange,
}: {
  target: CambiaTariffaTarget | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const {
    aggiornaTariffaRigaOpzione,
    aggiornaTariffaRigaPrenotazione,
    aggiornaQuantitaRigaOpzione,
    aggiornaQuantitaRigaPrenotazione,
  } = useToStore();
  const { t } = useI18n();

  const [qty, setQty] = React.useState("1");
  const [prezzoId, setPrezzoId] = React.useState("");
  const [prezzi, setPrezzi] = React.useState<{ id: number; tipologia: string; importo: number }[]>(
    [],
  );
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !target) return;
    setQty(String(target.currentQty));
    setPrezzoId(String(target.prezzoId));
  }, [open, target]);

  // Carica i prezzi del settore (fissato) della riga.
  React.useEffect(() => {
    if (!open || !target) return;
    let cancelled = false;
    setLoading(true);
    api.catalogoSp
      .prezzi(target.garaId, target.settoreId, false)
      .then((rows) => {
        if (cancelled) return;
        setPrezzi(rows.map((p: any) => ({ id: p.id, tipologia: p.tipologia, importo: p.importo })));
      })
      .catch(() => toast.error(t("admin.validations.prezziLoadError")))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, target?.garaId, target?.settoreId]);

  const onSave = async () => {
    if (!target) return;

    const nextQty = Number(qty);
    if (!Number.isFinite(nextQty) || nextQty < 1) {
      toast.error(t("admin.validations.invalidQty"));
      return;
    }
    if (!prezzoId) {
      toast.error(t("admin.validations.tariffRequired"));
      return;
    }

    const qtyChanged = nextQty !== target.currentQty;
    const tariffChanged = Number(prezzoId) !== target.prezzoId;

    if (!qtyChanged && !tariffChanged) {
      onOpenChange(false);
      return;
    }

    setBusy(true);
    try {
      if (target.kind === "opzione") {
        if (qtyChanged) {
          await aggiornaQuantitaRigaOpzione({
            opzioneId: target.parentId,
            tourOperatorId: target.tourOperatorId,
            rigaId: target.rigaId,
            quantita: nextQty,
          });
        }
        if (tariffChanged) {
          await aggiornaTariffaRigaOpzione({
            opzioneId: target.parentId,
            tourOperatorId: target.tourOperatorId,
            rigaId: target.rigaId,
            garaId: target.garaId,
            settoreId: target.settoreId,
            prezzoId: Number(prezzoId),
          });
        }
      } else {
        if (qtyChanged) {
          await aggiornaQuantitaRigaPrenotazione({
            prenotazioneId: target.parentId,
            tourOperatorId: target.tourOperatorId,
            rigaId: target.rigaId,
            quantita: nextQty,
          });
        }
        if (tariffChanged) {
          await aggiornaTariffaRigaPrenotazione({
            prenotazioneId: target.parentId,
            tourOperatorId: target.tourOperatorId,
            rigaId: target.rigaId,
            garaId: target.garaId,
            settoreId: target.settoreId,
            prezzoId: Number(prezzoId),
          });
        }
      }

      toast.success(t("admin.validations.rowUpdated"));
      onOpenChange(false);
    } catch {
      /* lo store mostra già il toast d'errore */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.validations.changeTariffaQty")}</DialogTitle>
          {target && (
            <DialogDescription>
              {target.raceName} — {target.currentSectorName}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="qty">{t("admin.validations.qty")}</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("admin.validations.sector")}</Label>
            <Input value={target?.currentSectorName ?? ""} readOnly disabled />
          </div>

          <div className="space-y-1.5">
            <Label>{t("admin.validations.tariff")}</Label>
            <Select value={prezzoId} onValueChange={setPrezzoId} disabled={busy || loading}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.validations.selectTariff")} />
              </SelectTrigger>
              <SelectContent>
                {prezzi.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.tipologia} — {fmtEur(p.importo)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={busy} onClick={onSave}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
