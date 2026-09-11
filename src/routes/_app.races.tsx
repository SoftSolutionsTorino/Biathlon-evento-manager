import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Armchair, Tag, ShoppingCart } from "lucide-react";
import { useToStore, fmtEur, Role } from "@/lib/toStore";
import { useI18n, useFormatters } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { ReadOnlyNotice } from "@/components/AdminOnly";
import {
  loadGare,
  prefetchDettaglioGara,
  nomeGara,
  nomeSettore,
  tipologiaPrezzo,
  type Gara,
  type SettoreCatalogo,
} from "@/lib/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/races")({
  component: Races,
});

// ----- Hook: elenco gare ------------------------------------------------------
function useGare() {
  const [state, setState] = React.useState<{ data: Gara[] | null; error: boolean }>({
    data: null,
    error: false,
  });
  const load = React.useCallback(() => {
    setState({ data: null, error: false });
    loadGare()
      .then((data) => setState({ data, error: false }))
      .catch(() => setState({ data: null, error: true }));
  }, []);
  React.useEffect(load, [load]);
  return { ...state, reload: load };
}

function useDettaglioGara(garaId: number, enabled: boolean) {
  const { registerSectors } = useToStore(); // <-- aggiunto
  const [data, setData] = React.useState<SettoreCatalogo[] | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || data) return;
    let alive = true;
    prefetchDettaglioGara(garaId)
      .then((d) => {
        if (!alive) return;
        setData(d);
        registerSectors(garaId, d);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [enabled, garaId, data, registerSectors]);

  return { data, error };
}

function Races() {
  const { t, lang } = useI18n();
  const { data: gare, error, reload } = useGare();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{t("races.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("races.subtitle")}</p>
      </div>

      <ReadOnlyNotice />

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>{t("races.error")}</span>
            <Button size="sm" variant="outline" onClick={reload}>
              {t("races.retry")}
            </Button>
          </CardContent>
        </Card>
      )}

      {!gare && !error && (
        <div className="space-y-3" aria-busy="true" aria-label={t("races.loading")}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {gare && (
        <>
          <p className="text-xs text-muted-foreground">
            {t("races.count", { n: gare.filter((g) => g.attiva).length })}
          </p>
          <div className="space-y-3">
            {gare.map((g) => (
              <GaraCard key={g.id} gara={g} lang={lang} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GaraCard({ gara, lang }: { gara: Gara; lang: "it" | "de" | "en" }) {
  const { t } = useI18n();
  const { fmtDate } = useFormatters();
  const [open, setOpen] = React.useState(false);
  const { data: settori, error } = useDettaglioGara(gara.id, open);
  const prefetch = () => void prefetchDettaglioGara(gara.id).catch(() => undefined);

  return (
    <Card className={cn(!gara.attiva && "opacity-70")}>
      <CardHeader className="p-4 sm:p-6">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={() => setOpen((o) => !o)}
          onMouseEnter={prefetch}
          onFocus={prefetch}
          onTouchStart={prefetch}
          aria-expanded={open}
          aria-label={open ? t("races.collapse") : t("races.expand")}
        >
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-semibold leading-snug sm:text-lg">
              {nomeGara(gara, lang)}
            </CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{fmtDate(gara.dataOraUtc)}</span>
              {/* <span> */}

              {/* {t("races.edition")} {gara.edizione} */}

              {/* </span> */}
              <span className="font-mono">ID {gara.id}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={gara.attiva ? "default" : "secondary"}>
              {gara.attiva ? t("races.active") : t("races.inactive")}
            </Badge>
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </div>
        </button>
      </CardHeader>

      {open && (
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {error && <p className="text-sm text-destructive">{t("races.error")}</p>}
          {!settori && !error && (
            <div className="space-y-2" aria-busy="true" aria-label={t("races.loadingDetail")}>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {settori && <DettaglioGara gara={gara} settori={settori} lang={lang} />}
        </CardContent>
      )}
    </Card>
  );
}

// ----- Dettaglio: tab Settori / Prezzi ----------------------------------------
function DettaglioGara({
  gara,
  settori,
  lang,
}: {
  gara: Gara;
  settori: SettoreCatalogo[];
  lang: "it" | "de" | "en";
}) {
  const { t } = useI18n();
  const { user } = useToStore();
  const canCreateOption = gara.attiva && can(user?.ruolo.toLowerCase() as Role, "option.create");
  const canCreateBooking = gara.attiva && can(user?.ruolo.toLowerCase() as Role, "booking.create");
  const prezzi = settori.flatMap((s) => s.prezzi.map((p) => ({ ...p, settore: s })));

  return (
    <Tabs defaultValue="settori">
      <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
        <TabsTrigger value="settori" className="gap-1.5">
          <Armchair className="size-3.5" /> {t("races.sectors")} ({settori.length})
        </TabsTrigger>
        <TabsTrigger value="prezzi" className="gap-1.5">
          <Tag className="size-3.5" /> {t("races.prices")} ({prezzi.length})
        </TabsTrigger>
      </TabsList>

      {/* --- Settori: card su mobile, tabella da tablet in su --- */}
      <TabsContent value="settori" className="mt-3">
        <div className="space-y-2 md:hidden">
          {settori.map((s) => (
            <div key={s.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{nomeSettore(s, lang)}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span className="font-mono">{s.id}</span>
                  </div>
                </div>
                <SeatingBadge numbered={s.postiNumerati} />
              </div>
              <PrezziInline settore={s} lang={lang} />
              <ActionButtons
                gara={gara}
                settore={s}
                canOption={canCreateOption}
                canBooking={canCreateBooking}
              />
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>{t("common.sector")}</TableHead>
                <TableHead>{t("races.seating")}</TableHead>
                <TableHead>{t("races.prices")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settori.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.id}</TableCell>
                  <TableCell className="font-medium">{nomeSettore(s, lang)}</TableCell>
                  <TableCell>
                    <SeatingBadge numbered={s.postiNumerati} />
                  </TableCell>
                  <TableCell>
                    <PrezziInline settore={s} lang={lang} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionButtons
                      gara={gara}
                      settore={s}
                      canOption={canCreateOption}
                      canBooking={canCreateBooking}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* --- Prezzi: listino piatto della gara --- */}
      <TabsContent value="prezzi" className="mt-3">
        {prezzi.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("races.noPrice")}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>{t("common.sector")}</TableHead>
                  <TableHead>{t("races.priceType")}</TableHead>
                  <TableHead className="text-right">{t("races.price")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prezzi.map((p) => (
                  <TableRow key={`${p.id}-${p.settoreId}`}>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{p.settoreId}</span>{" "}
                      <span className="hidden sm:inline">{nomeSettore(p.settore, lang)}</span>
                    </TableCell>
                    <TableCell>{tipologiaPrezzo(p, lang)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmtEur(p.importo)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function SeatingBadge({ numbered }: { numbered: boolean }) {
  const { t } = useI18n();
  return (
    <Badge variant={numbered ? "default" : "outline"} className="whitespace-nowrap">
      {numbered ? t("races.seatingNumbered") : t("races.seatingFree")}
    </Badge>
  );
}

function PrezziInline({ settore, lang }: { settore: SettoreCatalogo; lang: "it" | "de" | "en" }) {
  const { t } = useI18n();
  if (settore.prezzi.length === 0)
    return <span className="text-xs text-muted-foreground">{t("races.noPrice")}</span>;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5 md:mt-0">
      {settore.prezzi.map((p) => (
        <span key={p.id} className="rounded bg-muted px-1.5 py-0.5 text-xs">
          {tipologiaPrezzo(p, lang)} <b>{fmtEur(p.importo)}</b>
        </span>
      ))}
    </div>
  );
}

function ActionButtons({
  gara,
  settore,
  canOption,
  canBooking,
}: {
  gara: Gara;
  settore: SettoreCatalogo;
  canOption: boolean;
  canBooking: boolean;
}) {
  const { t, lang } = useI18n();
  const hasPrice = settore.prezzi.length > 0;
  if (!hasPrice) return null;

  const priceTo = Math.min(...settore.prezzi.map((p) => p.importo));

  const raceId = String(gara.id);
  const storeSectorId = `${gara.id}-${settore.id}`;

  // Prendi il prezzo con importo minimo (come facevi prima) + il suo prezzoId
  const cheapest = settore.prezzi.reduce((min, p) => (p.importo < min.importo ? p : min));

  return (
    <div className="mt-2 flex flex-wrap justify-end gap-2 md:mt-0">
      <AddToCartDialog
        raceId={raceId}
        sectorId={storeSectorId}
        prezzoId={cheapest.id}
        numbered={settore.postiNumerati}
        raceName={nomeGara(gara, lang)}
        sectorName={nomeSettore(settore, lang)}
        priceTo={priceTo}
      />
    </div>
  );
}

function AddToCartDialog({
  raceId,
  sectorId,
  numbered,
  prezzoId, // <-- NUOVO
  raceName,
  sectorName,
  priceTo,
}: {
  raceId: string;
  sectorId: string;
  numbered: boolean;
  prezzoId: number; // <-- NUOVO
  raceName: string;
  sectorName: string;
  priceTo: number;
}) {
  const { addToCart } = useToStore();
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [qty, setQty] = React.useState(10);
  const [note, setNote] = React.useState("");

  const submit = () => {
    if (qty <= 0) return;
    addToCart({
      raceId,
      sectorId,
      prezzoId: parseInt(prezzoId.toString()),
      qty,
      note: note.trim() || undefined,
    }); // <-- prezzoId

    toast.success(t("cart.added", { qty }));
    setOpen(false);
    setQty(10);
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <ShoppingCart className="size-3.5" /> {t("cart.add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("cart.add.title")}</DialogTitle>
          <DialogDescription>
            {raceName} — {sectorName} ({fmtEur(priceTo)})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qty">{t("common.quantity")}</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">
              {t("common.notes")} ({t("common.optional")})
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={numbered ? t("booking.new.seatNotes") : t("option.new.notePlaceholder")}
            />
          </div>
          {numbered && <p className="text-xs text-muted-foreground">{t("cart.numberedHint")}</p>}
          <div className="rounded-md bg-muted p-3 text-sm">
            {t("common.total")}: <span className="font-semibold">{fmtEur(qty * priceTo)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit}>{t("cart.add")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
