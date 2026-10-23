import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown } from "lucide-react";
import { useToStore, nomeLocalizzato, fmtEur, type TicketOption } from "@/lib/toStore";
import { useI18n, useFormatters } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { generatePdf, languageFromUser, loadPdfImages } from "@/lib/pdf";
import { ReadOnlyNotice } from "@/components/AdminOnly";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { type StatoRichiestaDto, type OpzioneDto, api } from "@/lib/api";

export const Route = createFileRoute("/_app/options")({
  component: OptionsPage,
});

/** Stati da NON mostrare nei tab (Cancellata, Da saldare, Saldata). */
const HIDDEN_STATO_IDS = new Set<number>([4, 7, 5]);

/** ID stato "Convertita": mostra la quantità da ritirare. */
const CONVERTITA_STATO_ID = 3;

const VARIANT_BY_STATO_ID: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  1: "secondary",
  2: "default",
  3: "secondary",
  4: "outline",
  5: "default",
  6: "destructive",
  7: "secondary",
};

/** ID stato che abilita conversione / rilascio. */
const ACTIVE_STATO_IDS = new Set<number>([2]); // "Validata"

/** ID stato "in attesa" (badge PDF: richiesta vs conferma). */
const PENDING_STATO_ID = 1;

/** ID stato "Cancellata" (rilascio). */
const CANCELLATA_STATO_ID = 6;

/**
 * Griglia delle righe del gruppo (senza colonna azioni: i pulsanti sono nell'header).
 * Colonne: checkbox, gara, settore, qty, qty da ritirare, importo.
 */
const GRID_ROWS =
  "grid grid-cols-[2rem_minmax(0,1.4fr)_minmax(0,1.2fr)_4.5rem_6rem_7rem] items-center gap-3";

function ColLabel({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <span
      className={`text-xs font-medium text-muted-foreground ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </span>
  );
}

/** Input quantità isolato e memoizzato: evita di re-renderizzare tutta la tabella. */
const QtyCell = React.memo(function QtyCell({
  id,
  max,
  value,
  onChange,
  onBlur,
  className,
}: {
  id: string;
  max: number;
  value: string;
  onChange: (id: string, v: string) => void;
  onBlur: (id: string, v: string, max: number) => void;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={1}
      max={max}
      value={value}
      onChange={(e) => onChange(id, e.target.value)}
      onBlur={(e) => onBlur(id, e.target.value, max)}
      className={
        className ??
        "ml-auto h-8 w-20 rounded-md border border-input bg-background px-2 text-right text-sm"
      }
    />
  );
});

type OptionGroup = {
  optionId: number;
  numero: string;
  note: string | null;
  statoId: number;
  expiresAt: string;
  rows: TicketOption[];
};
type RigaPreview = {
  optionId: number;
  numero: string;
  gara: string;
  settore: string;
  tipologia: string;
  qty: number;
  prezzoUnitario: number;
  totale: number;
};

function OptionsPage() {
  const {
    options,
    rawOptions,
    refreshOptions,
    races,
    sectors,
    releaseOption,
    role,
    tourOperators,
    currentToId,
    statiRichiesta,
    convertiOpzioni,
    user,
  } = useToStore();
  const { t, lang } = useI18n();
  const { fmtDate, fmtDateOnly } = useFormatters();
  const [filter, setFilter] = React.useState<"all" | string>("all");
  const [pending, setPending] = React.useState<null | {
    body: OpzioneDto[];
    convertite: RigaPreview[];
    eliminate: RigaPreview[];
  }>(null);

  const pdfLang = languageFromUser(user?.lingua);

  // --- selezione / quantità da convertire ---
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  // NB: qtyInput è una STRINGA. Permette lo stato transitorio "" durante la digitazione.
  const [qtyInput, setQtyInput] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  // --- Lookup maps O(1) ---
  const racesById = React.useMemo(() => {
    const m = new Map<string, (typeof races)[number]>();
    races.forEach((r) => m.set(r.id, r));
    return m;
  }, [races]);

  const sectorsById = React.useMemo(() => {
    const m = new Map<string, (typeof sectors)[number]>();
    sectors.forEach((s) => m.set(s.id, s));
    return m;
  }, [sectors]);

  const rawOptionsById = React.useMemo(() => {
    const m = new Map<number, (typeof rawOptions)[number]>();
    rawOptions.forEach((r) => m.set(r.id, r));
    return m;
  }, [rawOptions]);

  // Stati visibili nei tab (esclude 6, 7, 5)
  const visibleStati = React.useMemo(
    () => statiRichiesta.filter((s) => !HIDDEN_STATO_IDS.has(s.id)),
    [statiRichiesta],
  );

  const statoById = React.useMemo(() => {
    const m = new Map<number, StatoRichiestaDto>();
    statiRichiesta.forEach((s) => m.set(s.id, s));
    return m;
  }, [statiRichiesta]);

  const statoLabel = React.useCallback(
    (s: StatoRichiestaDto) => {
      const l = (lang ?? "it").toLowerCase();
      if (l.startsWith("en")) return s.descrizioneEN;
      if (l.startsWith("de")) return s.descrizioneDE;
      return s.descrizioneIT;
    },
    [lang],
  );

  const labelFor = React.useCallback(
    (o: TicketOption) => {
      const s = statoById.get(o.statoId);
      return s ? statoLabel(s) : String(o.statoId);
    },
    [statoById, statoLabel],
  );

  // Conteggio OPZIONI distinte per stato (non righe).
  const countsByStato = React.useMemo(() => {
    const m = new Map<number, Set<number>>();
    for (const o of options) {
      let set = m.get(o.statoId);
      if (!set) {
        set = new Set<number>();
        m.set(o.statoId, set);
      }
      set.add(o.optionId);
    }
    const out = new Map<number, number>();
    for (const [statoId, set] of m) out.set(statoId, set.size);
    return out;
  }, [options]);

  // Totale OPZIONI distinte (per il tab "all").
  const totalOpzioni = React.useMemo(() => {
    const set = new Set<number>();
    for (const o of options) set.add(o.optionId);
    return set.size;
  }, [options]);

  const filtered = React.useMemo(
    () => (filter === "all" ? options : options.filter((o) => String(o.statoId) === filter)),
    [options, filter],
  );

  /** Righe raggruppate per optionId, con metadati dell'opzione. */
  const groupedFiltered = React.useMemo<OptionGroup[]>(() => {
    const map = new Map<number, TicketOption[]>();
    for (const o of filtered) {
      const arr = map.get(o.optionId);
      if (arr) arr.push(o);
      else map.set(o.optionId, [o]);
    }
    return Array.from(map.entries()).map(([optionId, rows]) => {
      const raw = rawOptionsById.get(optionId) as
        (OpzioneDto & { note?: string | null }) | undefined;
      return {
        optionId,
        numero: raw?.numero ?? `OPT-${optionId}`,
        note: raw?.note ?? null,
        statoId: rows[0].statoId,
        expiresAt: rows[0].expiresAt,
        rows,
      };
    });
  }, [filtered, rawOptionsById]);

  const operatorName = React.useMemo(
    () => tourOperators.find((x) => x.id === currentToId)?.name ?? "",
    [tourOperators, currentToId],
  );

  const canConvert = can(role, "option.convert");

  // Inizializza qtyInput con la quantità originale (solo per id nuovi)
  React.useEffect(() => {
    setQtyInput((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const o of options) {
        if (next[o.id] === undefined) {
          next[o.id] = String(o.qty);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [options]);

  // --- handler stabili per QtyCell ---
  const handleQtyChange = React.useCallback((id: string, v: string) => {
    setQtyInput((s) => ({ ...s, [id]: v }));
  }, []);

  const handleQtyBlur = React.useCallback((id: string, v: string, max: number) => {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 1) {
      setQtyInput((s) => ({ ...s, [id]: "1" }));
    } else if (n > max) {
      setQtyInput((s) => ({ ...s, [id]: String(max) }));
    }
  }, []);

  /** Legge la quantità "effettiva" clampata, senza modificare lo stato dell'input. */
  const getQty = React.useCallback(
    (o: TicketOption) => {
      const raw = qtyInput[o.id];
      const n = raw !== undefined && raw !== "" ? parseInt(raw, 10) : o.qty;
      if (!Number.isFinite(n) || n < 1) return 1;
      return Math.min(n, o.qty);
    },
    [qtyInput],
  );

  const toggleSelect = React.useCallback((id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  const selectedActiveRows = React.useMemo(
    () => options.filter((o) => selected[o.id] && ACTIVE_STATO_IDS.has(o.statoId)),
    [options, selected],
  );

  /**
   * Genera il PDF di richiesta o di conferma per l'INTERA opzione.
   * Una riga PDF per ogni riga dell'opzione; il totale è la somma.
   */
  const downloadPdfGroup = React.useCallback(
    async (g: OptionGroup) => {
      if (g.rows.length === 0) return;

      let settings: import("@/lib/api").UtenteDta | null = null;
      try {
        const list = await api.utenti();
        settings = list[0] ?? null;
      } catch (e) {}

      const pdfRows = g.rows.map((o) => {
        const r = racesById.get(o.raceId);
        const s = sectorsById.get(o.sectorId);
        const priceInfo = s?.prezzi?.find((p) => p.id === o.prezzoId);

        let ticketType = o.tipologia || "Intero";
        if (pdfLang === "en") ticketType = priceInfo?.tipologiaEN || o.tipologia || "Full Price";
        else if (pdfLang === "de")
          ticketType = priceInfo?.tipologiaDE || o.tipologia || "Normalpreis";

        // FALLBACK SUL PREZZO: usa il catalogo se il totale è 0/falsy
        const unitPrice = o.prezzoUnitario || priceInfo?.importo || s?.priceTo || 0;
        const total = o.totale || o.qty * unitPrice;

        return {
          date: fmtDateOnly(r?.date || new Date().toISOString()),
          race: nomeLocalizzato(r, pdfLang),
          raceTime: (r as any)?.time ?? undefined,
          ticketType: ticketType,
          category: nomeLocalizzato(s, pdfLang),
          seatRow: (o as any).seatRow ?? undefined,
          seatNumber: (o as any).seatNumber ?? undefined,
          qty: o.qty,
          unitPrice,
          total,
        };
      });

      const grandTotal = pdfRows.reduce((sum, r) => sum + r.total, 0);
      const imgs = await loadPdfImages();

      const file = generatePdf({
        kind: "OPTION",
        lang: pdfLang,
        date: new Date().toISOString(),
        number: g.numero,
        operator: operatorName,
        customer: { name: operatorName },
        rows: pdfRows,
        grandTotal,
        expiresAt: fmtDateOnly(g.expiresAt),
        notes: g.note ?? undefined,
        headerImage: imgs.header,
        footerImage: imgs.footer,
        user: user,
        settings: settings,
        t: t,
      });

      toast.success(t("pdf.generated", { file }));
    },
    [racesById, sectorsById, lang, pdfLang, operatorName, fmtDateOnly, t, user],
  );

  React.useEffect(() => {
    refreshOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const convertSelected = React.useCallback(async () => {
    if (selectedActiveRows.length === 0) {
      toast.error(t("options.convert") + ": seleziona almeno un'opzione");
      return;
    }

    const groups = new Map<number, Map<number, number>>();
    for (const o of selectedActiveRows) {
      const q = getQty(o);
      if (q < 1 || q > o.qty) {
        toast.error(`Quantità non valida per la riga ${o.id}`);
        return;
      }
      if (!groups.has(o.optionId)) groups.set(o.optionId, new Map());
      groups.get(o.optionId)!.set(o.rigaId, q);
    }

    const body: OpzioneDto[] = [];
    const convertite: RigaPreview[] = [];
    const eliminate: RigaPreview[] = [];

    groups.forEach((righeMap, optionId) => {
      const raw = rawOptionsById.get(optionId);
      if (!raw) return;

      body.push({
        ...raw,
        righe: raw.righe
          .filter((r) => righeMap.has(r.id))
          .map((r) => ({ ...r, quantitaDaConvertire: righeMap.get(r.id)! })),
      });

      for (const r of raw.righe) {
        const sector = sectorsById.get(`${r.garaId}-${r.settoreId}`);
        const race = racesById.get(String(r.garaId));
        const qtyToConv = righeMap.get(r.id);
        const item: RigaPreview = {
          optionId,
          numero: raw.numero,
          gara: race ? nomeLocalizzato(race, lang) : `Gara ${r.garaId}`,
          settore: sector ? nomeLocalizzato(sector, lang) : r.settoreId,
          tipologia: "",
          qty: qtyToConv ?? r.quantita,
          prezzoUnitario: r.prezzoUnitario,
          totale: r.totale,
        };
        if (qtyToConv !== undefined) convertite.push(item);
        else eliminate.push(item);
      }
    });

    if (body.length === 0) {
      toast.error("Nessuna opzione trovata lato server.");
      return;
    }
    setPending({ body, convertite, eliminate });
  }, [selectedActiveRows, getQty, rawOptionsById, sectorsById, racesById, lang]);

  /** PDF del gruppo (memoizzata). */
  const pdfButtonGroup = React.useCallback(
    (g: OptionGroup) => (
      <Button size="sm" variant="outline" onClick={() => void downloadPdfGroup(g)}>
        <FileDown className="mr-2 h-3.5 w-3.5" />
        {g.statoId === CONVERTITA_STATO_ID ? t("pdf.confirm") : t("pdf.request")}
      </Button>
    ),
    [downloadPdfGroup, t],
  );

  /** Rilascio dell'INTERA opzione (memoizzata). */
  const releaseButtonGroup = React.useCallback(
    (g: OptionGroup) => {
      const totalQty = g.rows.reduce((sum, r) => sum + r.qty, 0);
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline">
              {t("bookings.cancel")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("options.cancel.title")}?</AlertDialogTitle>
              <AlertDialogDescription>
                {t("bookings.cancel.desc", { qty: totalQty })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.no")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  // Rilascia l'intera opzione: il backend opera sull'ID opzione.
                  // Chiamiamo una volta con la prima riga; lo stato è a livello opzione.
                  releaseOption(g.rows[0].id, g.optionId);
                  toast.success(t("options.released"));
                }}
              >
                {t("common.yes")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    },
    [releaseOption, t],
  );

  return (
    <>
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("options.convert")}</AlertDialogTitle>
            <AlertDialogDescription>
              Le righe <b>non spuntate verranno cancellate</b> dall'opzione e il totale stimato sarà
              ridotto dell'importo corrispondente.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pending?.convertite.length ? (
            <div className="max-h-52 overflow-y-auto rounded border p-2 text-xs">
              <div className="mb-1 font-medium">Righe che saranno convertite</div>
              {pending.convertite.map((r, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span>
                    {r.gara} / {r.settore} / {r.tipologia}
                  </span>
                  <span>
                    {r.qty} × {fmtEur(r.prezzoUnitario)} = {fmtEur(r.totale)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {pending?.eliminate.length ? (
            <div className="max-h-52 overflow-y-auto rounded border border-destructive/40 p-2 text-xs">
              <div className="mb-1 font-medium text-destructive">
                Righe che saranno cancellate (non spuntate)
              </div>
              {pending.eliminate.map((r, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span>
                    {r.gara} / {r.settore} / {r.tipologia}
                  </span>
                  <span>
                    {r.qty} × {fmtEur(r.prezzoUnitario)} = {fmtEur(r.totale)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.no")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const body = pending!.body;
                setPending(null);
                setBusy(true);
                try {
                  await convertiOpzioni(body);
                  toast.success(t("options.converted"));
                  setSelected({});
                  refreshOptions();
                } catch (e) {
                  console.error(e);
                  toast.error("Errore durante la conversione.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("common.yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">{t("options.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("options.subtitle")}</p>
          </div>
          {canConvert && (
            <Button onClick={convertSelected} disabled={busy || selectedActiveRows.length === 0}>
              {t("options.convert")} ({selectedActiveRows.length})
            </Button>
          )}
        </div>

        <ReadOnlyNotice />

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="w-max">
              <TabsTrigger value="all">
                {t("common.all")} ({totalOpzioni})
              </TabsTrigger>
              {visibleStati.map((s) => (
                <TabsTrigger key={s.id} value={String(s.id)}>
                  {statoLabel(s)} ({countsByStato.get(s.id) ?? 0})
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        {groupedFiltered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t("options.empty")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {groupedFiltered.map((g) => {
              const first = g.rows[0];
              const canRelease =
                (g.statoId === 1 || g.statoId === 2) && can(role, "option.release");

              return (
                <div key={g.optionId} className="rounded-md border">
                  {/* Header del gruppo con PDF + Rilascio a livello di OPZIONE */}
                  <div className="flex flex-col gap-2 bg-muted/30 px-5 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{operatorName}</span>
                      <span className="text-xs text-muted-foreground">#{g.numero}</span>
                      <Badge variant={VARIANT_BY_STATO_ID[g.statoId] ?? "secondary"}>
                        {labelFor(first)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t("options.expiresAt")}: {fmtDate(g.expiresAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {pdfButtonGroup(g)}
                      {canRelease && releaseButtonGroup(g)}
                    </div>
                  </div>

                  {/* Corpo: intestazioni colonne + righe */}
                  <div className="overflow-x-auto">
                    <div className="min-w-[760px]">
                      {/* Intestazione colonne */}
                      <div className={`${GRID_ROWS} px-5 py-1.5`}>
                        <ColLabel> </ColLabel>
                        <ColLabel>{t("common.race")}</ColLabel>
                        <ColLabel>{t("common.sector")}</ColLabel>
                        <ColLabel align="right">{t("common.quantity")}</ColLabel>
                        <ColLabel align="right">{t("common.quantityritiro")}</ColLabel>
                        <ColLabel align="right">{t("admin.summary.value")}</ColLabel>
                      </div>

                      {/* Righe */}
                      <div className="divide-y">
                        {g.rows.map((o) => {
                          const r = racesById.get(o.raceId);
                          const s = sectorsById.get(o.sectorId);
                          const isActive = ACTIVE_STATO_IDS.has(o.statoId);
                          const canSelect = isActive && canConvert;
                          const isConvertita = o.statoId === CONVERTITA_STATO_ID;

                          const raceName = r ? nomeLocalizzato(r, lang) : "";
                          const sectorName = s ? nomeLocalizzato(s, lang) : "";
                          const price = o.prezzoUnitario ?? 0;

                          return (
                            <div key={o.id} className={`${GRID_ROWS} px-5 py-2 text-sm`}>
                              <div>
                                {canSelect && (
                                  <input
                                    type="checkbox"
                                    checked={!!selected[o.id]}
                                    onChange={() => toggleSelect(o.id)}
                                    className="h-4 w-4 rounded border-input accent-[var(--color-primary)]"
                                  />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium">{raceName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {fmtDate(r?.date || new Date().toISOString())}
                                </div>
                              </div>
                              <span className="truncate text-xs text-muted-foreground">
                                {sectorName}
                              </span>
                              <span className="text-right font-medium tabular-nums">{o.qty}</span>
                              <div className="flex justify-end">
                                {canSelect ? (
                                  <QtyCell
                                    id={o.id}
                                    max={o.qty}
                                    value={qtyInput[o.id] ?? String(o.qty)}
                                    onChange={handleQtyChange}
                                    onBlur={handleQtyBlur}
                                  />
                                ) : isConvertita && o.quantitaDaConvertire != null ? (
                                  <span className="font-medium tabular-nums">
                                    {o.quantitaDaConvertire}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                              <span className="text-right tabular-nums">
                                {fmtEur(o.totale ?? o.qty * price)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  {g.note && (
                    <div className="bg-muted/20 px-5 py-2 text-xs text-muted-foreground">
                      <span className="font-medium">{t("common.notes")}:</span> {g.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
