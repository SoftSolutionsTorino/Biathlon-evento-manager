/**
 * Login (mockup): SSO verso il gestionale oppure credenziali locali.
 * Permette di entrare come utente Tour Operator o come amministratore,
 * con selettore di lingua IT/DE/EN.
 */
import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Snowflake, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { I18nProvider, useI18n, LANGS } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Accesso — Area Tour Operator Antholz" },
      { name: "description", content: "Accesso riservato ai Tour Operator della Coppa del Mondo di Biathlon di Anterselva." },
      { property: "og:title", content: "Accesso — Area Tour Operator Antholz" },
      { property: "og:description", content: "Accesso riservato ai Tour Operator della Coppa del Mondo di Biathlon di Anterselva." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <I18nProvider>
      <LoginPage />
    </I18nProvider>
  ),
});

function LoginPage() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [loading, setLoading] = React.useState(false);

  const enter = () => {
    setLoading(true);
    setTimeout(() => {
      toast.success(t("login.success"));
      navigate({ to: "/" });
    }, 500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[oklch(0.22_0.05_250)] to-[oklch(0.38_0.13_250)] p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 p-8">
          <div className="flex justify-end gap-1">
            {LANGS.map((l) => (
              <Button
                key={l.code}
                size="sm"
                variant={lang === l.code ? "secondary" : "ghost"}
                onClick={() => setLang(l.code)}
              >
                {l.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Snowflake className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">{t("app.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("app.subtitle")}</p>
          </div>

          {/* <Button className="w-full" size="lg" onClick={enter} disabled={loading}>
            <KeyRound className="mr-2 h-4 w-4" />
            {loading ? t("login.authenticating") : t("login.sso")}
          </Button> */}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t("login.or")}</span>
            </div>
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              enter();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input id="email" type="email" defaultValue="mario.rossi@alpinetours.de" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd">{t("common.password")}</Label>
              <Input id="pwd" type="password" defaultValue="demo1234" />
            </div>
            <Button type="submit" variant="outline" className="w-full">
              {t("login.submit")}
            </Button>
          </form>

          <Button variant="ghost" className="w-full" onClick={enter}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            {t("login.asAdmin")}
          </Button>

          <p className="text-center text-xs text-muted-foreground">{t("login.note")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
