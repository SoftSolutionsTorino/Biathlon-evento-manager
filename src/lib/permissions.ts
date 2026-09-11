/**
 * Matrice dei permessi per ruolo (specifiche cliente rev. 19/05).
 *
 * Admin  → funzioni amministrative: anagrafiche TO, validazione richieste,
 *          registrazione pagamenti, emissione titoli, riepilogo e audit globale.
 *          Sui dati del singolo Tour Operator ha accesso in sola lettura.
 * TO     → solo i propri dati: catalogo, opzioni, prenotazioni, vendite, audit
 *          delle proprie azioni. Nessun accesso alle funzioni amministrative.
 *
 * Il frontend nasconde/disabilita ciò che non è consentito; il backend
 * (AreaTO.Api) applica gli stessi controlli via [Authorize(Roles = ...)].
 */
import type { Role } from "@/lib/toStore";

export type Capability =
  | "option.create"
  | "option.release"
  | "option.convert"
  | "option.validate"
  | "booking.create"
  | "booking.cancelUnpaid"
  | "booking.cancelPaid"
  | "payment.register"
  | "ticket.issue"
  | "operator.manage"
  | "summary.view"
  | "audit.viewAll";

const ADMIN: Capability[] = [
  "option.validate",
  "booking.cancelPaid",
  "payment.register",
  "ticket.issue",
  "operator.manage",
  "summary.view",
  "audit.viewAll",
];

const TOUR_OPERATOR: Capability[] = [
  "option.create",
  "option.release",
  "option.convert",
  "booking.create",
  "booking.cancelUnpaid",
];

export const CAPABILITIES: Record<Role, Capability[]> = {
  admin: ADMIN,
  to: TOUR_OPERATOR,
};

export function can(role: Role, capability: Capability): boolean {
  return CAPABILITIES[role]?.includes(capability);
}
