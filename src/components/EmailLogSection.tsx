import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mail, ClipboardList, FileText, ArrowRight, RefreshCw } from "lucide-react";
import { useToStore, fmtDate } from "@/lib/toStore";
import { api, type EmailLogDto } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const AZIONE_LABEL: Record<string, string> = {
  PRENOTAZIONE_CREATA: "Prenotazione creata",
  OPZIONE_CREATA: "Opzione creata",
  OPZIONE_CONVERTITA: "Opzione convertita",
};

const AZIONE_ICON: Record<string, React.ElementType> = {
  PRENOTAZIONE_CREATA: ClipboardList,
  OPZIONE_CREATA: FileText,
  OPZIONE_CONVERTITA: ArrowRight,
};

type ValidationRoute = "/admin/validations" | "/admin/validation/bookings";

/** Dove portare l'admin in base all'evento registrato. */
function routeForAzione(azione: string): ValidationRoute {
  switch (azione) {
    case "OPZIONE_CREATA":
      return "/admin/validations";
    case "OPZIONE_CONVERTITA":
    case "PRENOTAZIONE_CREATA":
    default:
      return "/admin/validation/bookings";
  }
}

export function EmailLogSection({ max = 15 }: { max?: number }) {
  const { setSelectedTo, setSelectedTOperator, tourOperators } = useToStore();
  const navigate = useNavigate();

  const [logs, setLogs] = React.useState<EmailLogDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    setLoading(true);
    api
      .emailLog(max)
      .then(setLogs)
      .catch((e) => {
        console.error(e);
        toast.error("Impossibile caricare il log email.");
      })
      .finally(() => setLoading(false));
  }, [max]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleClick = (log: EmailLogDto) => {
    const toId = String(log.tourOperatorId);

    // 1. Set selectedToId (persistito in localStorage).
    setSelectedTo(toId);

    // 2. Set anche selectedTOperator (l'oggetto in-memory):
    //    le pagine di validazione controllano `selectedTOperator`
    //    per mostrare i contenuti, non solo `selectedToId`.
    const to = tourOperators.find((t) => t.id === toId);
    if (to) {
      setSelectedTOperator(to);
    } else {
      // Fallback: se il TO non è ancora in cache (raro, la lista è caricata
      // all'avvio), costruisco un oggetto minimale dai dati del log.
      setSelectedTOperator({
        id: toId,
        name: log.tourOperatorNome ?? `TO #${toId}`,
        type: "TO",
        email: "",
        plafond: 0,
        used: 0,
        enabled: true,
        partnerDiscount: 0,
        company: log.tourOperatorNome ?? undefined,
      });
    }

    // 3. Naviga alla pagina di validazione corretta.
    const target = routeForAzione(log.azione);
    navigate({ to: target });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Mail className="h-4 w-4 text-primary" />
          Attività email
        </CardTitle>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && logs.length === 0 && (
          <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Caricamento…</div>
        )}
        {!loading && logs.length === 0 && (
          <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
            Nessuna attività registrata.
          </div>
        )}

        {logs.map((log) => {
          const Icon = AZIONE_ICON[log.azione] ?? Mail;
          const label = AZIONE_LABEL[log.azione] ?? log.azione;
          return (
            <button
              key={log.id}
              type="button"
              onClick={() => handleClick(log)}
              className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-muted/60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {label}
                    {log.numero && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {log.numero}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {log.tourOperatorNome ?? `TO #${log.tourOperatorId}`} · {fmtDate(log.creatoIl)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {log.pdfAllegato && (
                  <Badge variant="secondary" className="text-[10px]">
                    PDF
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {log.entita} #{log.entitaId}
                </Badge>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
