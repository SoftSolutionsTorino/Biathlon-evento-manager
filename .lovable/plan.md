## Area Riservata Tour Operator – Tappa Antholz/Anterselva

### Ambito aggiornato (in base alle tue precisazioni)

- **Eventi**: limitati alla sola **tappa di Antholz** della Coppa del Mondo di Biathlon (gare singole della settimana di gara: Sprint, Pursuit, Individual, Mass Start, Relay, Single Mixed Relay, ecc.).
- **Utenti**: solo **Tour Operator**. I **Fan Club sono assimilati ai Tour Operator** (stesso modello dati, stesso ruolo, eventualmente con un flag `tipo = TO | FanClub` puramente descrittivo per reportistica).
- **Niente sezione Fan Club separata** né gestione membri fan club.

### Flusso commerciale da gestire

Il cuore del modulo è il ciclo di vita del biglietto in tre stati:

```text
   OPZIONE  ─► PRENOTAZIONE ─► VENDITA
  (hold)     (booking conf.)   (ticket emesso)
     │             │                 │
     └─ scadenza   └─ scadenza       └─ stato finale
        auto         pagamento          (voucher/PDF)
```

- **Opzione**: blocco temporaneo posti (es. 7/14 giorni), senza pagamento. TTL configurabile per gara/settore.
- **Conversione Opzione → Prenotazione**: TO conferma entro la scadenza; richiede dati cliente/gruppo + acconto o conferma pagamento secondo regole.
- **Conversione Prenotazione → Vendita**: a saldo ricevuto, emissione biglietti/voucher. Stato finale, non più modificabile dal TO.
- **Annulli e rilasci**: opzione/prenotazione possono essere rilasciate prima della scadenza; i posti rientrano in disponibilità in tempo reale.

### Schermate previste

1. **Login SSO** verso il gestionale ASP.NET esistente (JWT exchange).
2. **Dashboard TO**: KPI personali (opzioni attive, prenotazioni in scadenza, biglietti emessi, plafond residuo, scadenze imminenti).
3. **Catalogo gare Antholz**: lista delle gare della tappa con data, settore/tribuna, capienza residua, prezzo TO.
4. **Nuova Opzione**: selezione gara → settore → quantità → scadenza opzione (calcolata) → conferma.
5. **Gestione Opzioni**: tabella filtrabile (gara, stato, scadenza), azioni: *Converti in prenotazione*, *Rilascia*, *Modifica quantità* (entro limiti).
6. **Gestione Prenotazioni**: tabella con dati pagamento, stato saldo, azione *Converti in vendita* (emissione), *Annulla*.
7. **Vendite / Biglietti emessi**: storico, download voucher/PDF, dettagli pax.
8. **Audit log personale**: tutte le azioni del TO (chi, cosa, quando, IP).
9. **Notifiche**: campanella in-app + email per scadenze opzioni, conferme pagamento, variazioni disponibilità.

### Modello dati (lato modulo)

Tabelle principali (PostgreSQL self-hosted):

- `tour_operators` (id, ragione_sociale, tipo `TO|FanClub`, plafond, attivo, …)
- `to_users` (id, to_id, email, ruolo `admin|operatore|viewer`, sso_subject)
- `races` (id, codice, nome_gara, data, ora, disciplina) — sincronizzata da API ASP.NET, scope: solo Antholz
- `sectors` (id, race_id, nome, capienza, prezzo_to)
- `options` (id, to_id, race_id, sector_id, qty, created_at, expires_at, stato)
- `bookings` (id, option_id?, to_id, race_id, sector_id, qty, importo, acconto, saldo, scadenza_pagamento, stato)
- `sales` (id, booking_id, voucher_code, emesso_at, pax_data jsonb)
- `audit_log` (id, to_user_id, entity, entity_id, action, payload_diff jsonb, ip, created_at)
- `notifications` (id, to_user_id, tipo, payload, letta_at, inviata_email_at)

### Integrazione con il gestionale ASP.NET

API REST richieste al team .NET (versionate `/api/v1/...`):

- `POST /sso/exchange` → JWT con `sub`, `to_id`, `ruolo`
- `GET /antholz/races` → elenco gare tappa
- `GET /races/{id}/availability` → disponibilità per settore (real-time)
- `POST /options` / `DELETE /options/{id}` → hold/rilascio posti sul gestionale centrale
- `POST /options/{id}/convert-to-booking`
- `POST /bookings/{id}/payment` → registrazione acconto/saldo
- `POST /bookings/{id}/issue` → emissione biglietti, restituisce voucher
- `POST /webhooks/payments` → callback firmato da gestionale per aggiornamento stato pagamento

Il modulo Lovable mantiene la **sua copia di stato operativo** (opzioni, audit, notifiche) e delega al gestionale **disponibilità reale e ticketing**.

### Stack e deployment (self-hosted, no Lovable Cloud)

- Frontend + SSR: **TanStack Start (React 19, TypeScript)** su Node.js
- DB: **PostgreSQL** sul tuo server
- Auth: **JWT SSO** verso gestionale + sessioni httpOnly
- Email: SMTP del cliente (no Resend) o connettore a scelta
- Reverse proxy: IIS/Nginx davanti al Node, dominio `to.tuosito.it`

### Roadmap rivista (più snella, scope ridotto)

1. **Fase 1 – Allineamento (1 sett.)**: contratto API + JWT con team .NET, schema DB, regole opzione/prenotazione (TTL, acconti).
2. **Fase 2 – Foundation (2 sett.)**: progetto TanStack, login SSO, layout, tabelle base, audit log.
3. **Fase 3 – Catalogo + Opzioni (2 sett.)**: lista gare Antholz, creazione/gestione/rilascio opzioni, scadenze automatiche.
4. **Fase 4 – Prenotazioni + Vendite (2 sett.)**: conversione opzione→prenotazione, gestione pagamenti, conversione→vendita, voucher.
5. **Fase 5 – Notifiche + Hardening (1-2 sett.)**: email/in-app, report CSV, test, deploy on-prem.

Totale stimato: **8–9 settimane** (vs. 15 della versione precedente, grazie allo scope ridotto).

### Punti da chiarire prima di partire

1. **TTL opzione**: durata standard (es. 7 giorni) o variabile per gara/vicinanza all'evento?
2. **Acconto richiesto** per passare opzione→prenotazione: % fissa, importo fisso, o nessuno?
3. **Pagamenti**: gestiti interamente dal gestionale ASP.NET (il modulo registra solo lo stato) o serve integrazione gateway (Stripe/Nexi) lato modulo?
4. **Emissione biglietti**: PDF/voucher generato dal gestionale o dal modulo TO?
5. **Multi-utente per TO**: un TO può avere più operatori con ruoli diversi (admin/operatore/viewer)?
