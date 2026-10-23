import * as React from "react";
import { toast } from "sonner";
import { useToStore } from "@/lib/toStore";
import { api, ApiError } from "@/lib/api";
import type { Prezzo } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
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
import { useI18n } from "@/lib/i18n";

export type CambiaTariffaTarget = {
  kind: "opzione" | "prenotazione";
  /** Id della testata (OpzioneDto.id o PrenotazioneDto.id). */
  parentId: number;
  /** Id della riga da modificare. */
  rigaId: number;
  /** Gara della riga (fissa). */
  garaId: number;
  /** Settore corrente della riga (fisso, non modificabile). */
  settoreId: string;
  /** Tariffa corrente della riga (solo per preselezione). */
  prezzoId: number;
  /** TO corrente (obbligatorio per il payload backend). */
  tourOperatorId: number;
  /** Solo per mostrare info nel modal. */
  raceName?: string;
  currentSectorName?: string;
};
export type Lang = "it" | "de" | "en";

export function CambiaTariffaDialog({
  target,
  open,
  onOpenChange,
}: {
  target: CambiaTariffaTarget | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { aggiornaTariffaRigaOpzione, aggiornaTariffaRigaPrenotazione } = useToStore();

  const { lang, setLang } = useI18n();

  const [prezzi, setPrezzi] = React.useState<Prezzo[]>([]);
  const [prezzoId, setPrezzoId] = React.useState<string>("");
  const [loadingPrezzi, setLoadingPrezzi] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Carica le tariffe del settore della riga (SOLO ATTIVE = false).
  React.useEffect(() => {
    if (!open || !target) return;

    setPrezzoId(String(target.prezzoId));

    let cancelled = false;
    setLoadingPrezzi(true);
    api.catalogoSp
      .prezzi(target.garaId, target.settoreId, false)
      .then((res) => {
        if (cancelled) return;
        setPrezzi(res);
        // Se la tariffa corrente non è nella lista, preseleziona la prima.
        if (!res.some((p) => String(p.id) === String(target.prezzoId))) {
          setPrezzoId(res[0] ? String(res[0].id) : "");
        }
      })
      .catch((e) => {
        if (!cancelled)
          toast.error(e instanceof ApiError ? e.message : "Errore caricamento prezzi");
      })
      .finally(() => {
        if (!cancelled) setLoadingPrezzi(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, target]);

  const handleSave = async () => {
    if (!target) return;
    const pid = parseInt(prezzoId, 10);
    if (!Number.isFinite(pid)) {
      toast.error("Seleziona una tariffa.");
      return;
    }
    setSaving(true);
    try {
      const common = {
        rigaId: target.rigaId,
        garaId: target.garaId,
        settoreId: target.settoreId, // invariato
        prezzoId: pid, // unico campo che cambia
      };
      if (target.kind === "opzione") {
        await aggiornaTariffaRigaOpzione({
          opzioneId: target.parentId,
          tourOperatorId: target.tourOperatorId,
          ...common,
        });
      } else {
        await aggiornaTariffaRigaPrenotazione({
          prenotazioneId: target.parentId,
          tourOperatorId: target.tourOperatorId,
          ...common,
        });
      }
      toast.success("Tariffa aggiornata.");
      onOpenChange(false);
    } catch {
      /* lo store mostra già il toast d'errore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambia tariffa</DialogTitle>
          <DialogDescription>
            {target?.raceName ? (
              <>
                Gara: <span className="font-medium">{target.raceName}</span>
                {target.currentSectorName && (
                  <>
                    {" · "}Settore: <span className="font-medium">{target.currentSectorName}</span>
                  </>
                )}
              </>
            ) : (
              "Seleziona una nuova tariffa per il settore corrente."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Settore fisso (read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Settore</label>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {target?.currentSectorName ?? target?.settoreId ?? "—"}
            </div>
          </div>

          {/* Selezione tariffa */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tariffa</label>
            <Select
              value={prezzoId}
              onValueChange={setPrezzoId}
              disabled={loadingPrezzi || prezzi.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingPrezzi ? "Caricamento…" : "Seleziona tariffa"} />
              </SelectTrigger>
              <SelectContent>
                {prezzi.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {lang === "it" ? p.tipologia : lang === "de" ? p.tipologiaDe : p.tipologiaEn} -{" "}
                    {new Intl.NumberFormat(lang, { style: "currency", currency: "EUR" }).format(
                      p.importo,
                    )}{" "}
                    
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving || !prezzoId}>
            {saving ? "Salvataggio…" : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
