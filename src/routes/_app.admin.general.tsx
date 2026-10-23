import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";
import { AdminOnly } from "@/components/AdminOnly";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/admin/general")({
  component: () => (
    <AdminOnly>
      <GeneralPage />
    </AdminOnly>
  ),
});

// --------------------------------------------------------------------- campi

type FieldDef = {
  key: keyof FormState;
  labelKey: string;
  placeholderKey?: string;
  type?: "text" | "email" | "tel";
  colSpan?: 1 | 2;
};

type FormState = {
  email: string;
  iban: string;
  indirizzo: string;
  swift: string;
  /** Formato "gg/mm/aaaa hh:mm" oppure "" per vuoto. */
  scadenzaOpzioni: string;
  bank: string;
  emailPrezzo: number;
  servizioPrezzo: number;
};

const FIELDS: FieldDef[] = [
  { key: "email", labelKey: "admin.general.email", type: "email", colSpan: 2 },
  { key: "bank", labelKey: "admin.general.bank", colSpan: 2 },
  {
    key: "iban",
    labelKey: "admin.general.iban",
    placeholderKey: "admin.general.iban.placeholder",
    colSpan: 2,
  },
  { key: "swift", labelKey: "admin.general.swift" },
  {
    key: "scadenzaOpzioni",
    labelKey: "admin.general.scadenzaOpzioni",
    placeholderKey: "admin.general.scadenzaOpzioni.placeholder",
  },
  { key: "indirizzo", labelKey: "admin.general.indirizzo", colSpan: 2 },
  { key: "emailPrezzo", labelKey: "admin.general.emailprezzo" },
  { key: "servizioPrezzo", labelKey: "admin.general.servizioprezzo" },
];

const EMPTY: FormState = {
  email: "",
  iban: "",
  indirizzo: "",
  swift: "",
  scadenzaOpzioni: "",
  bank: "",
  emailPrezzo: 0,
  servizioPrezzo: 0,
};

// --- helper conversione datetime <-> formato italiano ---

/** ISO (o null) → "gg/mm/aaaa hh:mm". */
function isoToItDisplay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`;
}

/** "gg/mm/aaaa hh:mm" (o "") → ISO string (o null). */
function itDisplayToIso(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  // Accetta: 1/1/2025 9:30, 01/01/2025 09:30, 01/01/2025 (senza ora)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const hh = m[4] != null ? Number(m[4]) : 0;
  const mi = m[5] != null ? Number(m[5]) : 0;

  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;
  if (hh < 0 || hh > 23 || mi < 0 || mi > 59) return null;

  const d = new Date(yyyy, mm - 1, dd, hh, mi, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  // Verifica round-trip (es. 31/02 → 02/03): se cambia, la data non era valida.
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d.toISOString();
}

// -------------------------------------------------------------------- pagina

function GeneralPage() {
  const { t } = useI18n();
  const [userId, setUserId] = React.useState<number | null>(null);
  const [values, setValues] = React.useState<FormState>(EMPTY);
  const [original, setOriginal] = React.useState<FormState>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.utenti();
      const u = list[0];

      if (!u) {
        toast.error(t("admin.general.noUser"));
        setLoading(false);
        return;
      }

      const norm: FormState = {
        email: u.email ?? "",
        iban: u.iban ?? "",
        indirizzo: u.indirizzo ?? "",
        swift: u.swift ?? "",
        scadenzaOpzioni: isoToItDisplay(u.scadenzaOpzioni ?? null),
        bank: u.bank ?? "",
        emailPrezzo: u.emailPrezzo ?? 0,
        servizioPrezzo: u.servizioPrezzo ?? 0,
      };

      setUserId(u.id);
      setValues(norm);
      setOriginal(norm);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("admin.general.loadError");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    load();
  }, [load]);

  const dirty = React.useMemo(
    () => (Object.keys(values) as (keyof FormState)[]).some((k) => values[k] !== original[k]),
    [values, original],
  );

  const onChange = (key: keyof FormState, v: string) => setValues((s) => ({ ...s, [key]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || saving || userId == null) return;

    setSaving(true);
    try {
      // Costruisci il patch: solo i campi modificati.
      const patch: Record<string, unknown> = {};
      if (values.email !== original.email) patch.email = values.email.trim();
      if (values.iban !== original.iban) patch.iban = values.iban.trim();
      if (values.indirizzo !== original.indirizzo) patch.indirizzo = values.indirizzo.trim();
      if (values.swift !== original.swift) patch.swift = values.swift.trim();
      if (values.bank !== original.bank) patch.bank = values.bank.trim();
      if (values.emailPrezzo !== original.emailPrezzo) patch.emailPrezzo = values.emailPrezzo;
      if (values.servizioPrezzo !== original.servizioPrezzo)
        patch.servizioPrezzo = values.servizioPrezzo;

      if (values.scadenzaOpzioni !== original.scadenzaOpzioni) {
        const raw = values.scadenzaOpzioni.trim();
        if (raw !== "" && itDisplayToIso(raw) === null) {
          toast.error(t("admin.general.invalidDate"));
          setSaving(false);
          return;
        }
        patch.scadenzaOpzioni = itDisplayToIso(raw);
      }

      if (Object.keys(patch).length > 0) {
        await api.aggiornaUtente(userId, patch);
      }

      setOriginal({ ...values });
      toast.success(t("admin.general.saved"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("admin.general.saveError");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    setValues({ ...original });
    toast.message(t("admin.general.discarded"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{t("admin.general.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.general.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("admin.general.loading")}
            </div>
          ) : userId == null ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("admin.general.empty")}
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <div key={f.key} className={f.colSpan === 2 ? "sm:col-span-2" : undefined}>
                    <Label htmlFor={`g-${f.key}`} className="mb-1 block text-xs font-medium">
                      {t(f.labelKey)}
                    </Label>
                    <Input
                      id={`g-${f.key}`}
                      type={f.type ?? "text"}
                      value={values[f.key]}
                      placeholder={f.placeholderKey ? t(f.placeholderKey) : undefined}
                      onChange={(e) => onChange(f.key, e.target.value)}
                      autoComplete="off"
                      inputMode={f.key === "scadenzaOpzioni" ? "numeric" : undefined}
                    />
                    {f.key === "scadenzaOpzioni" && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {t("admin.general.scadenzaOpzioni.hint")}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onReset}
                  disabled={!dirty || saving}
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={!dirty || saving}>
                  <Save className="mr-2 h-3.5 w-3.5" />
                  {saving ? t("admin.general.saving") : t("common.save")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
