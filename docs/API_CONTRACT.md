# Contratto API v1 — Gestionale biglietteria ↔ Area Riservata Tour Operator

Il modulo Area TO **non** duplica la biglietteria: il gestionale ASP.NET/VB.NET resta
la fonte di verità per catalogo, disponibilità reale, hold posti ed emissione titoli.
Gli endpoint sotto vanno esposti dal team .NET con autenticazione `Authorization: Bearer <ApiKey>`
(configurata in `Gestionale:ApiKey`). Tutte le date sono UTC ISO-8601.

## 1. Catalogo

### `GET /api/v1/antholz/races`
```json
[{ "id": "R123", "code": "SPRINT_M", "discipline": "Sprint",
   "nameIt": "Sprint Uomini 10km", "nameDe": "Sprint Herren 10km", "nameEn": "Men's Sprint 10km",
   "startUtc": "2027-01-22T16:00:00Z" }]
```

### `GET /api/v1/antholz/sectors`
```json
[{ "id": "S45", "raceId": "R123", "nameIt": "Tribuna A — Arrivo", "nameDe": "...", "nameEn": "...",
   "numbered": true, "capacity": 1200, "available": 340 }]
```
`numbered = true` ⇒ il settore **non** è opzionabile (solo prenotazione diretta, posti
assegnati manualmente dall'Admin in base alle note del TO).

### `GET /api/v1/antholz/prices`
```json
[{ "id": "P9", "sectorId": "S45", "category": "INTERO", "amount": 95.00 }]
```

## 2. Disponibilità e hold

### `POST /api/v1/options` — blocca posti (scarica disponibilità)
```json
{ "externalReference": "OPT-2027-0001",
  "lines": [{ "sectorId": "S45", "priceId": "P9", "quantity": 24 }] }
```
Risposta: `{ "holdId": "H8891", "success": true, "message": null }`

### `DELETE /api/v1/options/{holdId}` — rilascio (rientro disponibilità)

## 3. Emissione titoli

### `POST /api/v1/bookings/issue`
```json
{ "externalReference": "BOOK-2027-0042",
  "lines": [{ "sectorId": "S45", "priceId": "P9", "quantity": 24 }] }
```
Risposta:
```json
[{ "barcode": "ANT27000012345", "type": "BIGLIETTO", "row": "12", "seat": "8",
   "holder": "Mario Rossi", "sectorId": "S45" }]
```

## 4. Anagrafiche Tour Operator (import iniziale)

### `GET /api/v1/anagrafiche/tour-operators`
Serve al popolamento iniziale di `areato.TourOperator` (99% dei TO esiste già nel
gestionale storico). Campi attesi: `id`, `ragioneSociale`, `tipo` (TO|FANCLUB),
`partitaIva`, `nazione`, `lingua`, `email`, `telefono`.

## 5. Dati necessari dal committente

| Dato | Uso |
|---|---|
| Data unica di scadenza opzioni | parametro `OPZIONE_SCADENZA` |
| Giorni di preavviso scadenza | parametro `GIORNI_PREAVVISO_SCADENZA` |
| Giorni per il pagamento | parametro `GIORNI_PAGAMENTO` |
| Soglia e % sconto quantità | `SCONTO_QTA_SOGLIA` (20), `SCONTO_QTA_PERC` (5) |
| % sconto partner | campo `ScontoPartner` sull'anagrafica TO (default 25) |
| Coordinate bancarie comitato | testo istruzioni pagamento nel PDF Bestellformular |
| Credenziali SMTP | invio email (nessun invio automatico: sempre azionato dall'Admin) |
| Logo e font ufficiali | intestazione dei 4 PDF |
