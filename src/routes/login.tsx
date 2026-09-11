import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Snowflake, ShieldCheck, User, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { I18nProvider, useI18n, LANGS } from "@/lib/i18n";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useToStore } from "@/lib/toStore";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Accesso — Area Tour Operator Antholz" },
      {
        name: "description",
        content:
          "Accesso riservato ai Tour Operator della Coppa del Mondo di Biathlon di Anterselva.",
      },
      { property: "og:title", content: "Accesso — Area Tour Operator Antholz" },
      {
        property: "og:description",
        content:
          "Accesso riservato ai Tour Operator della Coppa del Mondo di Biathlon di Anterselva.",
      },
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
  const [role, setRole] = React.useState<"TO" | "ADMIN">("TO");
  const { setUser, sendEmailForResetPassword } = useToStore();

  // Reset password states
  const [resetMode, setResetMode] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const [resetLoading, setResetLoading] = React.useState(false);

  // Change password states (when loginTemporaneo === true)
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [tempUser, setTempUser] = React.useState<any>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [changePasswordLoading, setChangePasswordLoading] = React.useState(false);
  const [changePasswordError, setChangePasswordError] = React.useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = React.useState(false);

  // Normal login
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const identifier = (document.getElementById("identifier") as HTMLInputElement).value;
    const password = (document.getElementById("pwd") as HTMLInputElement).value;

    try {
      const user = await api.login(identifier, password, role);

      if (user.loginTemporaneo) {
        setTempUser(user);
        setShowChangePassword(true);
        toast.info(t("login.temp_password.toast"));
        return;
      }

      setUser(user);
      toast.success(role === "TO" ? t("login.success") : t("login.success"));
      navigate({ to: "/" });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(role === "TO" ? t("login.error") : t("login.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset password submit
  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = (document.getElementById("identifier") as HTMLInputElement).value;
    if (!email) {
      toast.error(t("login.reset.error_email"));
      return;
    }
    setResetLoading(true);
    try {
      await sendEmailForResetPassword(email);
      setResetSent(true);
    } catch (err) {
      toast.error(t("login.reset.error_generic"));
    } finally {
      setResetLoading(false);
    }
  };

  // Set new password
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);

    if (!newPassword || newPassword.length < 6) {
      setChangePasswordError(t("login.temp_password.error_min_length"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError(t("login.temp_password.error_mismatch"));
      return;
    }

    setChangePasswordLoading(true);
    try {
      await api.setPassword(tempUser.id, newPassword);
      setChangePasswordSuccess(true);
      toast.success(t("login.temp_password.success_message"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("login.temp_password.error_generic");
      setChangePasswordError(msg);
      toast.error(msg);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const toggleRole = (newRole: "TO" | "ADMIN") => {
    setRole(newRole);
  };

  const backToLogin = () => {
    setResetMode(false);
    setResetSent(false);
    const input = document.getElementById("identifier") as HTMLInputElement;
    if (input) input.value = "";
  };

  const goToLogin = () => {
    setShowChangePassword(false);
    setChangePasswordSuccess(false);
    setTempUser(null);
    setNewPassword("");
    setConfirmPassword("");
    setChangePasswordError(null);
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
            <h1 className="mt-4 text-xl font-semibold">
              {showChangePassword ? t("login.temp_password.title") : t("app.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {showChangePassword ? t("login.temp_password.subtitle") : t("app.subtitle")}
            </p>
          </div>

          {/* ---- CHANGE PASSWORD FORM ---- */}
          {showChangePassword && (
            <form className="space-y-4" onSubmit={handleSetPassword}>
              <div className="space-y-2">
                <Label htmlFor="newPwd">{t("login.temp_password.new_password")}</Label>
                <Input
                  id="newPwd"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("login.temp_password.new_password")}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPwd">{t("login.temp_password.confirm_password")}</Label>
                <Input
                  id="confirmPwd"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("login.temp_password.confirm_password")}
                  autoComplete="new-password"
                />
              </div>

              {changePasswordError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{changePasswordError}</span>
                </div>
              )}

              {changePasswordSuccess ? (
                <div className="space-y-4 text-center">
                  <div className="flex justify-center">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("login.temp_password.success_message")}
                  </p>
                  <Button onClick={goToLogin} className="w-full">
                    {t("login.temp_password.back_to_login")}
                  </Button>
                </div>
              ) : (
                <Button type="submit" className="w-full" disabled={changePasswordLoading}>
                  {changePasswordLoading
                    ? t("login.authenticating")
                    : t("login.temp_password.set_password")}
                </Button>
              )}
            </form>
          )}

          {/* ---- NORMAL LOGIN / RESET ---- */}
          {!showChangePassword && (
            <>
              {!resetMode && (
                <div className="flex rounded-lg border border-border p-1">
                  <button
                    type="button"
                    onClick={() => toggleRole("TO")}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      role === "TO" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <User className="inline mr-2 h-4 w-4" />
                    Tour Operator
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleRole("ADMIN")}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      role === "ADMIN" ? "bg-red-600 text-white" : "hover:bg-muted"
                    }`}
                  >
                    <ShieldCheck className="inline mr-2 h-4 w-4" />
                    Amministratore
                  </button>
                </div>
              )}

              {resetSent ? (
                <div className="space-y-4 text-center">
                  <div className="flex justify-center">
                    <Mail className="h-12 w-12 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("login.to.emailmessage")}</p>
                  <Button variant="outline" onClick={backToLogin} className="w-full">
                    {t("login.to.return")}
                  </Button>
                </div>
              ) : (
                <form className="space-y-3" onSubmit={resetMode ? handleReset : handleLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="identifier">
                      {resetMode
                        ? t("common.email")
                        : role === "TO"
                          ? t("common.email")
                          : t("common.nomeutente")}
                    </Label>
                    <Input
                      id="identifier"
                      type={resetMode ? "email" : role === "TO" ? "email" : "text"}
                      autoComplete="new-password"
                      placeholder={
                        resetMode
                          ? "email@dominio.it"
                          : role === "TO"
                            ? "email@dominio.it"
                            : t("common.nomeutente")
                      }
                    />
                  </div>

                  {!resetMode && (
                    <div className="space-y-2">
                      <Label htmlFor="pwd">{t("common.password")}</Label>
                      <Input id="pwd" type="password" autoComplete="new-password" />
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading || resetLoading}>
                    {resetMode ? (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        {resetLoading ? t("login.invite.reset") : t("login.invite.reset")}
                      </>
                    ) : (
                      <>
                        {role === "TO" ? (
                          <User className="mr-2 h-4 w-4" />
                        ) : (
                          <ShieldCheck className="mr-2 h-4 w-4" />
                        )}
                        {loading
                          ? t("login.authenticating")
                          : role === "TO"
                            ? t("login.submit")
                            : t("login.submit")}
                      </>
                    )}
                  </Button>
                </form>
              )}

              {role === "TO" && !resetMode && !resetSent && (
                <div className="text-center mt-5 cursor-pointer">
                  <a
                    className="text-sm py-0 text-blue-400 underline underline-offset-2"
                    onClick={() => setResetMode(true)}
                  >
                    {t("login.to.reset")}
                  </a>
                </div>
              )}

              {role === "ADMIN" && (
                <p className="text-center text-xs text-muted-foreground">{t("login.note")}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
