/**
 * i18n — Area Riservata Tour Operator (Antholz/Anterselva)
 * ---------------------------------------------------------
 * Gestione delle tre lingue previste dalle specifiche: italiano, tedesco, inglese.
 * La lingua scelta viene salvata in localStorage e riapplicata al caricamento.
 * Per evitare mismatch SSR/client, il primo render usa sempre la lingua di
 * default (it) e la preferenza salvata viene applicata dopo l'idratazione.
 */
import * as React from "react";

export type Lang = "it" | "de" | "en";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

type Dict = Record<string, string>;

const it: Dict = {
  // --- generali ---
  "app.title": "Area Tour Operator",
  "app.subtitle": "Coppa del Mondo Biathlon · Anterselva 2027",
  "app.event": "Coppa del Mondo Biathlon",
  "app.dates": "Anterselva 21–24 gen 2027",
  "common.all": "Tutte",
  "common.cancel": "Annulla",
  "common.confirm": "Conferma",
  "common.close": "Chiudi",
  "common.save": "Salva",
  "common.actions": "Azioni",
  "common.status": "Stato",
  "common.seats": "Posti",
  "common.amount": "Importo",
  "common.race": "Gara",
  "common.sector": "Settore",
  "common.customer": "Cliente",
  "common.notes": "Note",
  "common.quantity": "Quantità",
  "common.total": "Totale",
  "common.none": "Nessun dato",
  "common.export.csv": "Esporta CSV",
  "common.export.excel": "Esporta Excel",
  "common.language": "Lingua",
  "common.logout": "Esci",
  "common.operator": "Operatore",
  "common.viewAll": "Vedi tutte",
  "common.yes": "Sì",
  "common.no": "No",
  "common.search": "Cerca",
  "common.email": "Email",
  "common.password": "Password",
  "common.optional": "opzionale",
  "common.days": "giorni",
  "common.pdf": "PDF",
  "common.menu": "Menu",
  "common.download": "Scarica",
  "common.readOnly.admin":
    "Vista amministratore: i dati del Tour Operator selezionato sono in sola lettura. Le azioni operative sono riservate all'utente Tour Operator.",
  "pdf.request": "PDF richiesta",
  "pdf.confirm": "PDF conferma",
  "pdf.voucher": "PDF titoli",
  "pdf.generated": "PDF generato: {file}",
  "nav.section.main": "Area operativa",
  "nav.section.toData": "Dati Tour Operator",
  "common.send": "Invia",

  // --- ruoli ---
  "role.admin": "Amministratore",
  "role.to": "Utente Tour Operator",
  "role.switch": "Vista",
  "role.adminBadge": "ADMIN",

  // --- navigazione ---
  "nav.dashboard": "Dashboard",
  "nav.races": "Catalogo gare",
  "nav.options": "Opzioni",
  "nav.bookings": "Prenotazioni",
  "nav.sales": "Vendite",
  "nav.audit": "Audit log",
  "nav.section.admin": "Amministrazione",
  "nav.admin.operators": "Tour Operator",
  "nav.admin.validations": "Validazioni opzioni",
  "nav.admin.payments": "Pagamenti ed emissione",
  "nav.admin.summary": "Riepilogo generale",

  // --- notifiche ---
  "notif.title": "Notifiche",
  "notif.empty": "Nessuna notifica",
  "notif.optionExpiring": "Opzione in scadenza",
  "notif.optionExpiring.detail": "{qty} posti — scade fra {days}gg",
  "notif.paymentDue": "Pagamento in scadenza",
  "notif.paymentDue.detail": "{customer} — saldo entro {days}gg",
  "notif.pendingValidation": "Opzioni da validare",
  "notif.pendingValidation.detail": "{count} richieste in attesa di validazione",

  // --- login ---
  "login.sso": "Accedi con SSO gestionale",
  "login.authenticating": "Autenticazione…",
  "login.or": "effettua il login con credenziali",
  "login.submit": "Accedi",
  "login.asAdmin": "Accedi come amministratore",
  "login.note": "Demo mockup — l'autenticazione reale userà JWT exchange con il sito ASP.NET.",
  "login.success": "SSO autenticato — JWT ricevuto dal gestionale",

  // --- dashboard ---
  "dash.title": "Dashboard",
  "dash.subtitle": "Stato sintetico della tua attività per la tappa di Anterselva.",
  "dash.subtitle.admin": "Stato complessivo di tutti i Tour Operator abilitati.",
  "dash.kpi.activeOptions": "Opzioni attive",
  "dash.kpi.activeOptions.hint": "{count} in scadenza ≤ 2gg",
  "dash.kpi.openBookings": "Prenotazioni aperte",
  "dash.kpi.openBookings.hint": "{count} in attesa di acconto",
  "dash.kpi.issued": "Biglietti emessi",
  "dash.kpi.issued.hint": "{count} voucher generati",
  "dash.kpi.plafond": "Plafond utilizzato",
  "dash.kpi.plafond.hint": "su {total} ({pct}%)",
  "dash.kpi.pendingValidation": "Opzioni da validare",
  "dash.kpi.pendingValidation.hint": "richieste in attesa",
  "dash.kpi.operators": "Tour Operator abilitati",
  "dash.kpi.operators.hint": "su {total} anagrafiche",
  "dash.kpi.revenue": "Valore venduto",
  "dash.expiring": "Scadenze imminenti",
  "dash.expiring.empty": "Nessuna opzione in scadenza nei prossimi 2 giorni.",
  "dash.expiring.today": "Scade oggi",
  "dash.plafond": "Plafond",
  "dash.plafond.available": "disponibili su {total}",
  "dash.plafond.used": "{pct}% utilizzato",
  "dash.program": "Programma gare Anterselva",
  "dash.openCatalog": "Apri catalogo",

  // --- catalogo gare ---
  "races.title": "Catalogo gare Anterselva",
  "races.subtitle":
    "Disponibilità in tempo reale dal gestionale centrale. Crea opzioni o prenotazioni dirette.",
  "races.available": "{remaining} posti disponibili / {capacity} · {pct}% venduto",
  "races.numbered": "Posti numerati — solo prenotazione diretta",
  "races.newOption": "Nuova opzione",
  "races.newBooking": "Prenotazione diretta",
  "option.new.title": "Nuova richiesta di opzione",
  "option.new.duration": "Durata opzione",
  "option.new.notePlaceholder": "Riferimento gruppo, contatto, ecc.",
  "option.new.total": "Totale opzionato:",
  "option.new.submit": "Invia richiesta",
  "option.new.created": "Richiesta di opzione inviata: {qty} posti — in attesa di validazione",

  // --- opzioni ---
  "options.title": "Opzioni",
  "options.subtitle":
    "Richieste di opzione: dopo la validazione dell'Admin possono essere convertite in prenotazione.",
  "options.status.pending": "In validazione",
  "options.status.active": "Validata",
  "options.status.expired": "Scaduta",
  "options.status.released": "Rilasciata",
  "options.status.converted": "Convertita",
  "options.expiresAt": "Scadenza",
  "options.convert": "Converti in prenotazione",
  "options.release": "Rilascia",
  "options.release.desc": "I {qty} posti torneranno disponibili nel sistema centrale.",
  "options.status.rejected": "Rifiutata",
  "options.converted": "Opzione convertita in prenotazione",
  "options.convert.desc": "Inserisci i dati cliente e l'acconto richiesto.",
  "options.convert.deposit": "Acconto richiesto: {pct}%",
  "booking.new.title": "Nuova richiesta di prenotazione",
  "booking.new.created": "Richiesta di prenotazione inviata: {qty} posti",
  "booking.new.seatNotes": "Indicazioni sui posti desiderati (assegnazione manuale)",
  "options.released": "Opzione rilasciata",
  "options.empty": "Nessuna opzione",

  // --- prenotazioni ---
  "bookings.title": "Prenotazioni",
  "bookings.subtitle": "Conferma il saldo e converti in vendita per emettere i titoli di accesso.",
  "bookings.status.pending_payment": "In attesa acconto",
  "bookings.status.partially_paid": "Acconto versato",
  "bookings.status.paid": "Saldata",
  "bookings.status.cancelled": "Annullata",
  "bookings.status.issued": "Emessa",
  "bookings.col.customerRace": "Cliente / Gara",
  "bookings.col.payment": "Pagamento",
  "bookings.col.due": "Scadenza saldo",
  "bookings.registerPayment": "Registra pagamento",
  "bookings.registerPayment.done": "Pagamento registrato: {amount}",
  "bookings.remaining": "Saldo residuo:",
  "bookings.issue": "Emetti titoli",
  "bookings.cancel": "Annulla",
  "bookings.cancel.title": "Annullare la prenotazione?",
  "bookings.cancel.desc": "L'azione viene tracciata in audit log.",
  "bookings.cancel.confirm": "Sì, annulla",
  "bookings.cancelled": "Prenotazione annullata",
  "bookings.empty": "Nessuna prenotazione",
  "bookings.adminOnly": "Operazione riservata all'amministratore",

  // --- vendite ---
  "sales.title": "Vendite",
  "sales.subtitle": "Titoli di accesso emessi con voucher univoco. Stato finale, non modificabile.",
  "sales.total": "Vendite totali",
  "sales.tickets": "Biglietti emessi",
  "sales.revenue": "Fatturato",
  "sales.voucher": "Voucher",
  "sales.issuedAt": "Emessa",
  "sales.empty": "Nessuna vendita",

  // --- audit ---
  "audit.title": "Audit log",
  "audit.subtitle": "Tracciamento di ogni azione: chi, cosa, quando, da quale IP.",
  "audit.col.datetime": "Data/ora",
  "audit.col.user": "Utente",
  "audit.col.entity": "Entità",
  "audit.col.action": "Azione",
  "audit.col.details": "Dettagli",

  // --- admin: tour operator ---
  "admin.operators.title": "Anagrafiche Tour Operator",
  "admin.operators.subtitle":
    "Abilita l'accesso all'area riservata, imposta lo sconto partner e invia il link di attivazione.",
  "admin.operators.col.name": "Ragione sociale",
  "admin.operators.col.type": "Tipo",
  "admin.operators.col.enabled": "Area riservata",
  "admin.operators.col.discount": "Sconto partner",
  "admin.operators.col.plafond": "Plafond",
  "admin.operators.enable": "Abilita",
  "admin.operators.enabled": "Abilitato",
  "admin.operators.disabled": "Non abilitato",
  "admin.operators.invite": "Invia link attivazione",
  "admin.operators.invite.sent": "Link di attivazione inviato a {email}",
  "admin.operators.impersonate": "Apri dati TO",
  "admin.operators.impersonating": "Stai visualizzando i dati di {name}",
  "admin.operators.discount.updated": "Sconto partner aggiornato: {pct}%",

  // --- admin: validazioni ---
  "admin.validations.title": "Validazione richieste",
  "admin.validations.subtitle":
    "Ogni opzione e prenotazione richiesta dal Tour Operator diventa ufficiale solo dopo la validazione.",
  "admin.validations.pending": "In attesa",
  "admin.validations.validate": "Valida",
  "admin.validations.reject": "Rifiuta",
  "admin.validations.validated": "Richiesta validata — PDF Optionsformular pronto per l'invio",
  "admin.validations.rejected": "Richiesta rifiutata",
  "admin.validations.empty": "Nessuna richiesta in attesa",
  "admin.validations.sendPdf": "Invia PDF al TO",
  "admin.validations.pdfSent": "PDF inviato via email a {name}",
  "admin.validations.alerts": "Avvisi di scadenza",
  "admin.validations.alerts.desc":
    "Nessun invio automatico: selezioni le opzioni e decide l'amministratore.",
  "admin.validations.sendAlerts": "Invia avvisi selezionati ({count})",
  "admin.validations.alertsSent": "Avvisi di scadenza inviati a {count} Tour Operator",

  // --- admin: pagamenti ---
  "admin.payments.title": "Pagamenti ed emissione titoli",
  "admin.payments.subtitle":
    "Registrazione pagamenti ed emissione dei titoli di accesso: operazioni riservate all'amministratore.",
  "admin.payments.issued": "Titoli emessi — voucher {code}",

  // --- admin: riepilogo ---
  "admin.summary.title": "Riepilogo generale",
  "admin.summary.subtitle":
    "Totali di opzioni, prenotazioni e vendite per settore e tipologia di prezzo.",
  "admin.summary.col.operator": "Tour Operator",
  "admin.summary.col.options": "Opzioni",
  "admin.summary.col.bookings": "Prenotazioni",
  "admin.summary.col.sales": "Vendite",
  "admin.summary.bySector": "Per settore e tipologia di prezzo",
  "admin.summary.byOperator": "Per Tour Operator",
  "admin.summary.qty": "Q.tà",
  "admin.summary.value": "Valore",
  "admin.summary.exported": "Esportazione generata",
};

const de: Dict = {
  "app.title": "Tour-Operator-Bereich",
  "app.subtitle": "Biathlon-Weltcup · Antholz 2027",
  "app.event": "Biathlon-Weltcup",
  "app.dates": "Antholz 21.–24. Jan. 2027",
  "common.all": "Alle",
  "common.cancel": "Abbrechen",
  "common.confirm": "Bestätigen",
  "common.close": "Schließen",
  "common.save": "Speichern",
  "common.actions": "Aktionen",
  "common.status": "Status",
  "common.seats": "Plätze",
  "common.amount": "Betrag",
  "common.race": "Rennen",
  "common.sector": "Sektor",
  "common.customer": "Kunde",
  "common.notes": "Notizen",
  "common.quantity": "Menge",
  "common.total": "Gesamt",
  "common.none": "Keine Daten",
  "common.export.csv": "CSV exportieren",
  "common.export.excel": "Excel exportieren",
  "common.language": "Sprache",
  "common.logout": "Abmelden",
  "common.operator": "Operator",
  "common.viewAll": "Alle anzeigen",
  "common.yes": "Ja",
  "common.no": "Nein",
  "common.search": "Suchen",
  "common.email": "E-Mail",
  "common.password": "Passwort",
  "common.optional": "optional",
  "common.days": "Tage",
  "common.pdf": "PDF",
  "common.menu": "Menü",
  "common.download": "Herunterladen",
  "common.readOnly.admin":
    "Administratoransicht: die Daten des gewählten Tour Operators sind schreibgeschützt. Operative Aktionen sind dem Tour-Operator-Benutzer vorbehalten.",
  "pdf.request": "PDF Anfrage",
  "pdf.confirm": "PDF Bestätigung",
  "pdf.voucher": "PDF Karten",
  "pdf.generated": "PDF erstellt: {file}",
  "nav.section.main": "Operativer Bereich",
  "nav.section.toData": "Tour-Operator-Daten",
  "common.send": "Senden",

  "role.admin": "Administrator",
  "role.to": "Tour-Operator-Benutzer",
  "role.switch": "Ansicht",
  "role.adminBadge": "ADMIN",

  "nav.dashboard": "Dashboard",
  "nav.races": "Rennkalender",
  "nav.options": "Optionen",
  "nav.bookings": "Buchungen",
  "nav.sales": "Verkäufe",
  "nav.audit": "Audit-Log",
  "nav.section.admin": "Verwaltung",
  "nav.admin.operators": "Tour Operator",
  "nav.admin.validations": "Optionsfreigaben",
  "nav.admin.payments": "Zahlungen und Ausstellung",
  "nav.admin.summary": "Gesamtübersicht",

  "notif.title": "Benachrichtigungen",
  "notif.empty": "Keine Benachrichtigungen",
  "notif.optionExpiring": "Option läuft ab",
  "notif.optionExpiring.detail": "{qty} Plätze — läuft in {days} Tagen ab",
  "notif.paymentDue": "Zahlung fällig",
  "notif.paymentDue.detail": "{customer} — Restzahlung in {days} Tagen",
  "notif.pendingValidation": "Optionen zur Freigabe",
  "notif.pendingValidation.detail": "{count} Anfragen warten auf Freigabe",

  "login.sso": "Mit SSO des Ticketsystems anmelden",
  "login.authenticating": "Anmeldung…",
  "login.or": "Melden Sie sich mit Ihren Zugangsdaten an",
  "login.submit": "Anmelden",
  "login.asAdmin": "Als Administrator anmelden",
  "login.note":
    "Demo-Mockup — die echte Anmeldung erfolgt per JWT-Austausch mit der ASP.NET-Website.",
  "login.success": "SSO authentifiziert — JWT vom Ticketsystem erhalten",

  "dash.title": "Dashboard",
  "dash.subtitle": "Überblick über Ihre Aktivität für die Etappe in Antholz.",
  "dash.subtitle.admin": "Gesamtüberblick über alle freigeschalteten Tour Operator.",
  "dash.kpi.activeOptions": "Aktive Optionen",
  "dash.kpi.activeOptions.hint": "{count} laufen in ≤ 2 Tagen ab",
  "dash.kpi.openBookings": "Offene Buchungen",
  "dash.kpi.openBookings.hint": "{count} warten auf Anzahlung",
  "dash.kpi.issued": "Ausgestellte Tickets",
  "dash.kpi.issued.hint": "{count} Voucher erstellt",
  "dash.kpi.plafond": "Genutztes Kontingent",
  "dash.kpi.plafond.hint": "von {total} ({pct}%)",
  "dash.kpi.pendingValidation": "Optionen zur Freigabe",
  "dash.kpi.pendingValidation.hint": "offene Anfragen",
  "dash.kpi.operators": "Freigeschaltete Tour Operator",
  "dash.kpi.operators.hint": "von {total} Stammdatensätzen",
  "dash.kpi.revenue": "Verkaufswert",
  "dash.expiring": "Bevorstehende Fristen",
  "dash.expiring.empty": "Keine Option läuft in den nächsten 2 Tagen ab.",
  "dash.expiring.today": "Läuft heute ab",
  "dash.plafond": "Kontingent",
  "dash.plafond.available": "verfügbar von {total}",
  "dash.plafond.used": "{pct}% genutzt",
  "dash.program": "Rennprogramm Antholz",
  "dash.openCatalog": "Kalender öffnen",

  "races.title": "Rennkalender Antholz",
  "races.subtitle":
    "Echtzeit-Verfügbarkeit aus dem zentralen Ticketsystem. Optionen oder Direktbuchungen anlegen.",
  "races.available": "{remaining} Plätze verfügbar / {capacity} · {pct}% verkauft",
  "races.numbered": "Nummerierte Plätze — nur Direktbuchung",
  "races.newOption": "Neue Option",
  "races.newBooking": "Direktbuchung",
  "option.new.title": "Neue Optionsanfrage",
  "option.new.duration": "Optionsdauer",
  "option.new.notePlaceholder": "Gruppenreferenz, Kontakt usw.",
  "option.new.total": "Optionswert:",
  "option.new.submit": "Anfrage senden",
  "option.new.created": "Optionsanfrage gesendet: {qty} Plätze — wartet auf Freigabe",

  "options.title": "Optionen",
  "options.subtitle":
    "Optionsanfragen können nach der Freigabe durch den Administrator in Buchungen umgewandelt werden.",
  "options.status.pending": "In Freigabe",
  "options.status.active": "Freigegeben",
  "options.status.expired": "Abgelaufen",
  "options.status.released": "Freigegeben (storniert)",
  "options.status.converted": "Umgewandelt",
  "options.expiresAt": "Ablauf",
  "options.convert": "In Buchung umwandeln",
  "options.release": "Stornieren",
  "options.release.desc": "Die {qty} Plätze werden im Zentralsystem wieder freigegeben.",
  "options.status.rejected": "Abgelehnt",
  "options.converted": "Option in Buchung umgewandelt",
  "options.convert.desc": "Kundendaten und geforderte Anzahlung eingeben.",
  "options.convert.deposit": "Geforderte Anzahlung: {pct}%",
  "booking.new.title": "Neue Buchungsanfrage",
  "booking.new.created": "Buchungsanfrage gesendet: {qty} Plätze",
  "booking.new.seatNotes": "Hinweise zu den gewünschten Plätzen (manuelle Zuteilung)",
  "options.released": "Option storniert",
  "options.empty": "Keine Optionen",

  "bookings.title": "Buchungen",
  "bookings.subtitle":
    "Zahlung bestätigen und in Verkauf umwandeln, um die Zutrittstitel auszustellen.",
  "bookings.status.pending_payment": "Anzahlung ausstehend",
  "bookings.status.partially_paid": "Anzahlung erhalten",
  "bookings.status.paid": "Bezahlt",
  "bookings.status.cancelled": "Storniert",
  "bookings.status.issued": "Ausgestellt",
  "bookings.col.customerRace": "Kunde / Rennen",
  "bookings.col.payment": "Zahlung",
  "bookings.col.due": "Zahlungsfrist",
  "bookings.registerPayment": "Zahlung erfassen",
  "bookings.registerPayment.done": "Zahlung erfasst: {amount}",
  "bookings.remaining": "Restbetrag:",
  "bookings.issue": "Titel ausstellen",
  "bookings.cancel": "Stornieren",
  "bookings.cancel.title": "Buchung stornieren?",
  "bookings.cancel.desc": "Die Aktion wird im Audit-Log erfasst.",
  "bookings.cancel.confirm": "Ja, stornieren",
  "bookings.cancelled": "Buchung storniert",
  "bookings.empty": "Keine Buchungen",
  "bookings.adminOnly": "Vorgang nur für Administratoren",

  "sales.title": "Verkäufe",
  "sales.subtitle":
    "Ausgestellte Zutrittstitel mit eindeutigem Voucher. Endstatus, nicht änderbar.",
  "sales.total": "Verkäufe gesamt",
  "sales.tickets": "Ausgestellte Tickets",
  "sales.revenue": "Umsatz",
  "sales.voucher": "Voucher",
  "sales.issuedAt": "Ausgestellt",
  "sales.empty": "Keine Verkäufe",

  "audit.title": "Audit-Log",
  "audit.subtitle": "Nachverfolgung jeder Aktion: wer, was, wann und von welcher IP.",
  "audit.col.datetime": "Datum/Uhrzeit",
  "audit.col.user": "Benutzer",
  "audit.col.entity": "Entität",
  "audit.col.action": "Aktion",
  "audit.col.details": "Details",

  "admin.operators.title": "Tour-Operator-Stammdaten",
  "admin.operators.subtitle":
    "Zugang zum reservierten Bereich freischalten, Partnerrabatt festlegen und Aktivierungslink senden.",
  "admin.operators.col.name": "Firmenname",
  "admin.operators.col.type": "Typ",
  "admin.operators.col.enabled": "Reservierter Bereich",
  "admin.operators.col.discount": "Partnerrabatt",
  "admin.operators.col.plafond": "Kontingent",
  "admin.operators.enable": "Freischalten",
  "admin.operators.enabled": "Freigeschaltet",
  "admin.operators.disabled": "Nicht freigeschaltet",
  "admin.operators.invite": "Aktivierungslink senden",
  "admin.operators.invite.sent": "Aktivierungslink an {email} gesendet",
  "admin.operators.impersonate": "TO-Daten öffnen",
  "admin.operators.impersonating": "Sie sehen die Daten von {name}",
  "admin.operators.discount.updated": "Partnerrabatt aktualisiert: {pct}%",

  "admin.validations.title": "Freigabe von Anfragen",
  "admin.validations.subtitle":
    "Jede vom Tour Operator angefragte Option oder Buchung wird erst nach der Freigabe gültig.",
  "admin.validations.pending": "Ausstehend",
  "admin.validations.validate": "Freigeben",
  "admin.validations.reject": "Ablehnen",
  "admin.validations.validated": "Anfrage freigegeben — PDF Optionsformular versandbereit",
  "admin.validations.rejected": "Anfrage abgelehnt",
  "admin.validations.empty": "Keine offenen Anfragen",
  "admin.validations.sendPdf": "PDF an TO senden",
  "admin.validations.pdfSent": "PDF per E-Mail an {name} gesendet",
  "admin.validations.alerts": "Ablaufbenachrichtigungen",
  "admin.validations.alerts.desc":
    "Kein automatischer Versand: der Administrator wählt aus und entscheidet.",
  "admin.validations.sendAlerts": "Ausgewählte Benachrichtigungen senden ({count})",
  "admin.validations.alertsSent": "Ablaufbenachrichtigungen an {count} Tour Operator gesendet",

  "admin.payments.title": "Zahlungen und Ticketausstellung",
  "admin.payments.subtitle":
    "Zahlungserfassung und Ausstellung der Zutrittstitel: ausschließlich für Administratoren.",
  "admin.payments.issued": "Titel ausgestellt — Voucher {code}",

  "admin.summary.title": "Gesamtübersicht",
  "admin.summary.subtitle":
    "Summen für Optionen, Buchungen und Verkäufe nach Sektor und Preiskategorie.",
  "admin.summary.col.operator": "Tour Operator",
  "admin.summary.col.options": "Optionen",
  "admin.summary.col.bookings": "Buchungen",
  "admin.summary.col.sales": "Verkäufe",
  "admin.summary.bySector": "Nach Sektor und Preiskategorie",
  "admin.summary.byOperator": "Nach Tour Operator",
  "admin.summary.qty": "Menge",
  "admin.summary.value": "Wert",
  "admin.summary.exported": "Export erstellt",
};

const en: Dict = {
  "app.title": "Tour Operator Area",
  "app.subtitle": "Biathlon World Cup · Antholz 2027",
  "app.event": "Biathlon World Cup",
  "app.dates": "Antholz 21–24 Jan 2027",
  "common.all": "All",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.close": "Close",
  "common.save": "Save",
  "common.actions": "Actions",
  "common.status": "Status",
  "common.seats": "Seats",
  "common.amount": "Amount",
  "common.race": "Race",
  "common.sector": "Sector",
  "common.customer": "Customer",
  "common.notes": "Notes",
  "common.quantity": "Quantity",
  "common.total": "Total",
  "common.none": "No data",
  "common.export.csv": "Export CSV",
  "common.export.excel": "Export Excel",
  "common.language": "Language",
  "common.logout": "Sign out",
  "common.operator": "Operator",
  "common.viewAll": "View all",
  "common.yes": "Yes",
  "common.no": "No",
  "common.search": "Search",
  "common.email": "Email",
  "common.password": "Password",
  "common.optional": "optional",
  "common.days": "days",
  "common.pdf": "PDF",
  "common.menu": "Menu",
  "common.download": "Download",
  "common.readOnly.admin":
    "Administrator view: the selected Tour Operator's data is read-only. Operational actions belong to the Tour Operator user.",
  "pdf.request": "Request PDF",
  "pdf.confirm": "Confirmation PDF",
  "pdf.voucher": "Tickets PDF",
  "pdf.generated": "PDF generated: {file}",
  "nav.section.main": "Operations",
  "nav.section.toData": "Tour Operator data",
  "common.send": "Send",

  "role.admin": "Administrator",
  "role.to": "Tour Operator user",
  "role.switch": "View",
  "role.adminBadge": "ADMIN",

  "nav.dashboard": "Dashboard",
  "nav.races": "Race catalogue",
  "nav.options": "Options",
  "nav.bookings": "Bookings",
  "nav.sales": "Sales",
  "nav.audit": "Audit log",
  "nav.section.admin": "Administration",
  "nav.admin.operators": "Tour Operators",
  "nav.admin.validations": "Option approvals",
  "nav.admin.payments": "Payments & issuing",
  "nav.admin.summary": "Overall summary",

  "notif.title": "Notifications",
  "notif.empty": "No notifications",
  "notif.optionExpiring": "Option expiring",
  "notif.optionExpiring.detail": "{qty} seats — expires in {days} days",
  "notif.paymentDue": "Payment due",
  "notif.paymentDue.detail": "{customer} — balance due in {days} days",
  "notif.pendingValidation": "Options to approve",
  "notif.pendingValidation.detail": "{count} requests awaiting approval",

  "login.sso": "Sign in with ticketing SSO",
  "login.authenticating": "Authenticating…",
  "login.or": "login with provided credentials",
  "login.submit": "Sign in",
  "login.asAdmin": "Sign in as administrator",
  "login.note": "Demo mockup — real authentication will use JWT exchange with the ASP.NET site.",
  "login.success": "SSO authenticated — JWT received from the ticketing system",

  "dash.title": "Dashboard",
  "dash.subtitle": "Overview of your activity for the Antholz leg.",
  "dash.subtitle.admin": "Overall status of all enabled Tour Operators.",
  "dash.kpi.activeOptions": "Active options",
  "dash.kpi.activeOptions.hint": "{count} expiring in ≤ 2 days",
  "dash.kpi.openBookings": "Open bookings",
  "dash.kpi.openBookings.hint": "{count} awaiting deposit",
  "dash.kpi.issued": "Tickets issued",
  "dash.kpi.issued.hint": "{count} vouchers generated",
  "dash.kpi.plafond": "Credit used",
  "dash.kpi.plafond.hint": "of {total} ({pct}%)",
  "dash.kpi.pendingValidation": "Options to approve",
  "dash.kpi.pendingValidation.hint": "pending requests",
  "dash.kpi.operators": "Enabled Tour Operators",
  "dash.kpi.operators.hint": "of {total} records",
  "dash.kpi.revenue": "Sold value",
  "dash.expiring": "Upcoming deadlines",
  "dash.expiring.empty": "No options expiring in the next 2 days.",
  "dash.expiring.today": "Expires today",
  "dash.plafond": "Credit",
  "dash.plafond.available": "available of {total}",
  "dash.plafond.used": "{pct}% used",
  "dash.program": "Antholz race programme",
  "dash.openCatalog": "Open catalogue",

  "races.title": "Antholz race catalogue",
  "races.subtitle":
    "Real-time availability from the central ticketing system. Create options or direct bookings.",
  "races.available": "{remaining} seats available / {capacity} · {pct}% sold",
  "races.numbered": "Numbered seats — direct booking only",
  "races.newOption": "New option",
  "races.newBooking": "Direct booking",
  "option.new.title": "New option request",
  "option.new.duration": "Option duration",
  "option.new.notePlaceholder": "Group reference, contact, etc.",
  "option.new.total": "Option value:",
  "option.new.submit": "Send request",
  "option.new.created": "Option request sent: {qty} seats — awaiting approval",

  "options.title": "Options",
  "options.subtitle":
    "Option requests can be converted into bookings once approved by the administrator.",
  "options.status.pending": "Awaiting approval",
  "options.status.active": "Approved",
  "options.status.expired": "Expired",
  "options.status.released": "Released",
  "options.status.converted": "Converted",
  "options.expiresAt": "Expiry",
  "options.convert": "Convert to booking",
  "options.release": "Release",
  "options.release.desc": "The {qty} seats will return to availability in the central system.",
  "options.status.rejected": "Rejected",
  "options.converted": "Option converted into a booking",
  "options.convert.desc": "Enter the customer details and the required deposit.",
  "options.convert.deposit": "Required deposit: {pct}%",
  "booking.new.title": "New booking request",
  "booking.new.created": "Booking request sent: {qty} seats",
  "booking.new.seatNotes": "Notes about the requested seats (manual assignment)",
  "options.released": "Option released",
  "options.empty": "No options",

  "bookings.title": "Bookings",
  "bookings.subtitle": "Confirm the balance and convert to sale to issue the access tickets.",
  "bookings.status.pending_payment": "Awaiting deposit",
  "bookings.status.partially_paid": "Deposit paid",
  "bookings.status.paid": "Paid",
  "bookings.status.cancelled": "Cancelled",
  "bookings.status.issued": "Issued",
  "bookings.col.customerRace": "Customer / Race",
  "bookings.col.payment": "Payment",
  "bookings.col.due": "Balance due",
  "bookings.registerPayment": "Register payment",
  "bookings.registerPayment.done": "Payment registered: {amount}",
  "bookings.remaining": "Outstanding balance:",
  "bookings.issue": "Issue tickets",
  "bookings.cancel": "Cancel",
  "bookings.cancel.title": "Cancel this booking?",
  "bookings.cancel.desc": "The action is tracked in the audit log.",
  "bookings.cancel.confirm": "Yes, cancel",
  "bookings.cancelled": "Booking cancelled",
  "bookings.empty": "No bookings",
  "bookings.adminOnly": "Administrator-only operation",

  "sales.title": "Sales",
  "sales.subtitle": "Access tickets issued with a unique voucher. Final status, not editable.",
  "sales.total": "Total sales",
  "sales.tickets": "Tickets issued",
  "sales.revenue": "Revenue",
  "sales.voucher": "Voucher",
  "sales.issuedAt": "Issued",
  "sales.empty": "No sales",

  "audit.title": "Audit log",
  "audit.subtitle": "Tracking of every action: who, what, when and from which IP.",
  "audit.col.datetime": "Date/time",
  "audit.col.user": "User",
  "audit.col.entity": "Entity",
  "audit.col.action": "Action",
  "audit.col.details": "Details",

  "admin.operators.title": "Tour Operator records",
  "admin.operators.subtitle":
    "Enable access to the reserved area, set the partner discount and send the activation link.",
  "admin.operators.col.name": "Company name",
  "admin.operators.col.type": "Type",
  "admin.operators.col.enabled": "Reserved area",
  "admin.operators.col.discount": "Partner discount",
  "admin.operators.col.plafond": "Credit",
  "admin.operators.enable": "Enable",
  "admin.operators.enabled": "Enabled",
  "admin.operators.disabled": "Not enabled",
  "admin.operators.invite": "Send activation link",
  "admin.operators.invite.sent": "Activation link sent to {email}",
  "admin.operators.impersonate": "Open TO data",
  "admin.operators.impersonating": "You are viewing data for {name}",
  "admin.operators.discount.updated": "Partner discount updated: {pct}%",

  "admin.validations.title": "Request approvals",
  "admin.validations.subtitle":
    "Every option or booking requested by a Tour Operator becomes official only after approval.",
  "admin.validations.pending": "Pending",
  "admin.validations.validate": "Approve",
  "admin.validations.reject": "Reject",
  "admin.validations.validated": "Request approved — Optionsformular PDF ready to send",
  "admin.validations.rejected": "Request rejected",
  "admin.validations.empty": "No pending requests",
  "admin.validations.sendPdf": "Send PDF to TO",
  "admin.validations.pdfSent": "PDF emailed to {name}",
  "admin.validations.alerts": "Expiry alerts",
  "admin.validations.alerts.desc": "No automatic sending: the administrator selects and decides.",
  "admin.validations.sendAlerts": "Send selected alerts ({count})",
  "admin.validations.alertsSent": "Expiry alerts sent to {count} Tour Operators",

  "admin.payments.title": "Payments & ticket issuing",
  "admin.payments.subtitle":
    "Payment registration and ticket issuing: administrator-only operations.",
  "admin.payments.issued": "Tickets issued — voucher {code}",

  "admin.summary.title": "Overall summary",
  "admin.summary.subtitle": "Totals for options, bookings and sales by sector and price category.",
  "admin.summary.col.operator": "Tour Operator",
  "admin.summary.col.options": "Options",
  "admin.summary.col.bookings": "Bookings",
  "admin.summary.col.sales": "Sales",
  "admin.summary.bySector": "By sector and price category",
  "admin.summary.byOperator": "By Tour Operator",
  "admin.summary.qty": "Qty",
  "admin.summary.value": "Value",
  "admin.summary.exported": "Export generated",
};

const DICTS: Record<Lang, Dict> = { it, de, en };

type I18nCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const Ctx = React.createContext<I18nCtx | null>(null);
const STORAGE_KEY = "areato.lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // default "it" al primo render → nessun mismatch SSR/client
  const [lang, setLangState] = React.useState<Lang>("it");

  React.useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && saved in DICTS) setLangState(saved);
  }, []);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    } catch {
      /* storage non disponibile */
    }
  }, []);

  const t = React.useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = DICTS[lang][key] ?? DICTS.it[key] ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
    },
    [lang],
  );

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useI18n deve essere usato dentro I18nProvider");
  return ctx;
}

/** Mesi abbreviati per la formattazione deterministica delle date nelle tre lingue. */
export const MONTHS: Record<Lang, string[]> = {
  it: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"],
  de: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

/** Formattazione data/ora deterministica (UTC) nella lingua corrente. */
export function useFormatters() {
  const { lang } = useI18n();
  const p = (n: number) => n.toString().padStart(2, "0");
  return React.useMemo(
    () => ({
      fmtDate: (iso: string) => {
        const d = new Date(iso);
        return `${p(d.getUTCDate())} ${MONTHS[lang][d.getUTCMonth()]} ${d.getUTCFullYear()}, ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
      },
      fmtDateOnly: (iso: string) => {
        const d = new Date(iso);
        return `${p(d.getUTCDate())} ${MONTHS[lang][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      },
    }),
    [lang],
  );
}
