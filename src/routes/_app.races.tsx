/**
 * Catalogo gare Anterselva.
 * Dai settori non numerati si può richiedere un'opzione; dai settori a posti
 * numerati si può solo inserire una richiesta di prenotazione diretta
 * (i posti vengono assegnati manualmente dall'Admin in base alle note del TO).
 */
import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useToStore, fmtEur } from "@/lib/toStore";
import { useI18n, useFormatters } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { ReadOnlyNotice } from "@/components/AdminOnly";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export const Route = createFileRoute("/_app/races")({
  component: Races,
});

function Races() {
  const { races, sectors, role } = useToStore();
  const { t } = useI18n();
  const { fmtDate } = useFormatters();
  const canCreateOption = can(role, "option.create");
  const canCreateBooking = can(role, "booking.create");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{t("races.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("races.subtitle")}</p>
      </div>

      <ReadOnlyNotice />

      <div className="grid gap-4 lg:grid-cols-2">
        {races.map((r) => {
          const secs = sectors.filter((s) => s.raceId === r.id);
          return (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">{r.name}</CardTitle>
                    <div className="mt-1 text-xs text-muted-foreground">{fmtDate(r.date)}</div>
                  </div>
                  <Badge variant="outline">{r.discipline}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {secs.map((s) => {
                  const remaining = s.capacity - s.sold;
                  const pct = Math.round((s.sold / s.capacity) * 100);
                  return (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                      <div className="min-w-[160px] flex-1">
                        <div className="text-sm font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("races.available", { remaining, capacity: s.capacity, pct })}
                        </div>
                        {s.numbered && (
                          <div className="mt-1 text-xs text-primary">{t("races.numbered")}</div>
                        )}
                      </div>
                      <div className="text-sm font-semibold">{fmtEur(s.priceTo)}</div>
                      {/* Inserimento opzioni e prenotazioni: solo utente Tour Operator. */}
                      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                        {!s.numbered && canCreateOption && <NewOptionDialog raceId={r.id} sectorId={s.id} />}
                        {canCreateBooking && <NewBookingDialog raceId={r.id} sectorId={s.id} />}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function NewOptionDialog({ raceId, sectorId }: { raceId: string; sectorId: string }) {
  const { createOption, races, sectors } = useToStore();
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [qty, setQty] = React.useState(10);
  const [ttl, setTtl] = React.useState("7");
  const [note, setNote] = React.useState("");
  const r = races.find((x) => x.id === raceId)!;
  const s = sectors.find((x) => x.id === sectorId)!;

  const submit = () => {
    if (qty <= 0) return;
    createOption({ raceId, sectorId, qty, ttlDays: Number(ttl), note: note || undefined });
    toast.success(t("option.new.created", { qty }));
    setOpen(false);
    setQty(10);
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t("races.newOption")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("option.new.title")}</DialogTitle>
          <DialogDescription>
            {r.name} — {s.name} ({fmtEur(s.priceTo)})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qty">{t("common.quantity")}</Label>
              <Input id="qty" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>{t("option.new.duration")}</Label>
              <Select value={ttl} onValueChange={setTtl}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["3", "7", "14"].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d} {t("common.days")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">
              {t("common.notes")} ({t("common.optional")})
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("option.new.notePlaceholder")}
            />
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            {t("option.new.total")} <span className="font-semibold">{fmtEur(qty * s.priceTo)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit}>{t("option.new.submit")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Richiesta di prenotazione senza passare dall'opzione (anche per settori numerati). */
function NewBookingDialog({ raceId, sectorId }: { raceId: string; sectorId: string }) {
  const { createDirectBooking, races, sectors } = useToStore();
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [qty, setQty] = React.useState(4);
  const [customer, setCustomer] = React.useState("");
  const [note, setNote] = React.useState("");
  const r = races.find((x) => x.id === raceId)!;
  const s = sectors.find((x) => x.id === sectorId)!;

  const submit = () => {
    if (!customer.trim() || qty <= 0) return;
    createDirectBooking({ raceId, sectorId, qty, customer: customer.trim(), note: note || undefined });
    toast.success(t("booking.new.created", { qty }));
    setOpen(false);
    setCustomer("");
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t("races.newBooking")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("booking.new.title")}</DialogTitle>
          <DialogDescription>
            {r.name} — {s.name} ({fmtEur(s.priceTo)})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bqty">{t("common.quantity")}</Label>
              <Input id="bqty" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bcust">{t("common.customer")}</Label>
              <Input id="bcust" value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bnote">
              {t("common.notes")} ({t("common.optional")})
            </Label>
            <Textarea
              id="bnote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={s.numbered ? t("booking.new.seatNotes") : t("option.new.notePlaceholder")}
            />
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            {t("common.total")}: <span className="font-semibold">{fmtEur(qty * s.priceTo)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit}>{t("option.new.submit")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
