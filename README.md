# Area Riservata Tour Operator — Biathlon Antholz / Anterselva

Modulo self-hosted per la gestione di **opzioni → prenotazioni → vendite** dei
biglietti della tappa di Coppa del Mondo di Antholz, riservato ai Tour Operator
(i Fan Club sono assimilati ai TO) e al comitato organizzatore.

## Struttura del repository

```
database/            Script T-SQL per Microsoft SQL Server
  01_schema.sql        Schema "areato": tabelle, indici, viste di riepilogo
  02_seed.sql          Parametri di sistema + utente amministratore iniziale
backend/             Soluzione Visual Studio 2022 (ASP.NET Core 8)
  AreaTO.sln
  src/AreaTO.Api/      API REST: controller, servizi, PDF, email, Excel
src/                 Frontend React 19 + TanStack Start (UI Tour Operator/Admin)
docs/API_CONTRACT.md Contratto REST verso il gestionale ASP.NET/VB.NET esistente
```

## Prerequisiti server Windows

- Windows Server con IIS e **ASP.NET Core 8 Hosting Bundle**
- Microsoft SQL Server 2019+ (anche Express)
- Node.js 20+ solo per la build del frontend (non serve a runtime se si pubblica statico)

## 1. Database

```powershell
sqlcmd -S .\SQLEXPRESS -d BiathlonAntholz -i database\01_schema.sql
sqlcmd -S .\SQLEXPRESS -d BiathlonAntholz -i database\02_seed.sql
```

Lo schema è isolato nel namespace `areato`, quindi convive con le tabelle del
gestionale storico senza interferenze. EF Core è usato in modalità *database first*:
**non** generare migration che ricreino le tabelle.

## 2. Backend

```powershell
cd backend
dotnet restore
dotnet build -c Release
dotnet publish src\AreaTO.Api -c Release -o C:\inetpub\areato\api
```

Configurazione (`appsettings.json` o variabili d'ambiente in IIS):

| Chiave | Descrizione |
|---|---|
| `ConnectionStrings:AreaTO` | connessione SQL Server |
| `Jwt:Key` | chiave HMAC ≥ 32 caratteri (usare variabile d'ambiente `JWT_KEY`) |
| `Gestionale:BaseUrl` / `ApiKey` | endpoint e chiave del gestionale (vedi `docs/API_CONTRACT.md`) |
| `Smtp:*` | SMTP del cliente per l'invio manuale delle email |
| `Documenti:Cartella` | cartella di archiviazione dei PDF generati |
| `Cors:Origins` | origini ammesse del frontend |

In IIS creare un Application Pool **No Managed Code** puntato alla cartella di publish.

## 3. Frontend

```powershell
npm install
npm run build      # output statico da pubblicare su IIS
```

Impostare `VITE_API_BASE_URL` (es. `https://to.biathlon-antholz.it/api`) prima della build.

## Regole applicative implementate

- **Ruoli**: `ADMIN` (comitato: vede e opera su tutti i TO) e `TO` (solo i propri dati).
- **Abilitazione**: l'Admin imposta il flag sull'anagrafica e invia il link di
  attivazione (token monouso, 7 giorni) per impostare email e password.
- **Opzioni**: solo settori **non numerati**; scadenza unica per tutti
  (parametro `OPZIONE_SCADENZA`); richiedono la **validazione** dell'Admin, che
  genera il PDF *Optionsbestätigung* e lo invia via email.
- **Prenotazioni**: da conversione (anche parziale) di un'opzione validata oppure
  dirette dal catalogo gare (unica via per i posti numerati). Generano il PDF
  *Bestellformular* con le istruzioni di pagamento.
- **Sconti**: automatico 5% su 20+ biglietti non numerati nella stessa giornata di
  gara; sconto partner (default 25%) applicabile per singolo TO.
- **Pagamenti ed emissione titoli**: riservati all'Admin. L'annullamento è
  consentito al TO solo in assenza di pagamenti registrati.
- **Nominativi spettatori**: inseribili e modificabili dal TO in qualsiasi momento,
  anche su titoli già emessi.
- **Email**: nessun invio automatico. Tutte le comunicazioni (conferme, avvisi di
  scadenza, inviti) sono accodate e attivate manualmente dall'Admin.
- **Multilingua**: IT / DE / EN su interfaccia, email e PDF.
- **Audit log**: ogni azione rilevante (utente, IP, user agent, dettagli JSON).

## Endpoint principali

| Metodo | Rotta | Ruolo |
|---|---|---|
| POST | `/api/auth/login` | pubblico |
| POST | `/api/auth/set-password` | pubblico (token) |
| GET | `/api/catalogo/gare` | tutti |
| POST | `/api/catalogo/sync` | Admin |
| GET/POST | `/api/opzioni` | tutti |
| POST | `/api/opzioni/{id}/valida` | Admin |
| GET | `/api/opzioni/in-scadenza` | Admin |
| POST | `/api/opzioni/avvisi-scadenza` | Admin |
| GET/POST | `/api/prenotazioni` | tutti |
| POST | `/api/prenotazioni/da-opzione/{id}` | tutti |
| POST | `/api/prenotazioni/{id}/annulla` | TO (senza pagamenti) / Admin |
| PUT | `/api/prenotazioni/righe/{id}/spettatori` | tutti |
| POST | `/api/admin/prenotazioni/{id}/pagamenti` | Admin |
| POST | `/api/admin/prenotazioni/{id}/emetti` | Admin |
| GET | `/api/admin/riepilogo` · `/riepilogo/excel` | Admin |
| GET | `/api/admin/audit` | Admin |
