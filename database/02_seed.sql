/* =============================================================================
   Area TO Antholz - Dati iniziali (parametri, utente admin, catalogo demo)
   Eseguire DOPO 01_schema.sql.
   Il catalogo reale (gare, settori, prezzi) viene sincronizzato dal gestionale:
   le righe qui sotto servono solo per ambiente di test/collaudo.
   ============================================================================= */
USE AreaTO;
GO

/* ---------- Parametri di sistema ---------- */
MERGE areato.Parametro AS t
USING (VALUES
    ('OPZIONE_SCADENZA',        '2026-10-19', 'Data unica di scadenza delle opzioni (UTC, formato yyyy-MM-dd)'),
    ('SCONTO_QTA_SOGLIA',       '20',         'Numero minimo di biglietti non numerati/giorno per lo sconto automatico'),
    ('SCONTO_QTA_PERC',         '5',          'Percentuale di sconto automatico quantita'),
    ('SCONTO_PARTNER_PERC',     '25',         'Percentuale di sconto partner, applicabile manualmente dall''Admin'),
    ('LIMITE_VENDITA_DIRETTA',  '10',         'Massimo biglietti per vendita diretta del TO'),
    ('GIORNI_PAGAMENTO',        '14',         'Giorni per il pagamento dalla conferma prenotazione'),
    ('GIORNI_PREAVVISO_SCADENZA','7',         'Soglia giorni per elencare le opzioni in scadenza')
) AS s(Chiave, Valore, Descrizione)
ON t.Chiave = s.Chiave
WHEN NOT MATCHED THEN INSERT (Chiave, Valore, Descrizione) VALUES (s.Chiave, s.Valore, s.Descrizione);
GO

/* ---------- Utente amministratore iniziale ----------
   PasswordHash NULL: al primo avvio l'Admin riceve/usa il link di attivazione.
   In produzione impostare l'hash tramite l'endpoint di set-password.          */
IF NOT EXISTS (SELECT 1 FROM areato.Utente WHERE Email = 'admin@biathlon-antholz.it')
    INSERT INTO areato.Utente (Email, NomeCompleto, Ruolo, Lingua, Attivo)
    VALUES ('admin@biathlon-antholz.it', 'Amministratore Sistema', 'ADMIN', 'it', 1);
GO

/* ---------- Catalogo di collaudo ---------- */
IF NOT EXISTS (SELECT 1 FROM areato.Gara)
BEGIN
    INSERT INTO areato.Gara (ExternalId, Codice, Disciplina, NomeIt, NomeDe, NomeEn, DataOraUtc, Edizione)
    VALUES
      ('G-2027-01','SPRINT_W','Sprint','Sprint Donne 7.5km','Sprint Damen 7,5km','Women Sprint 7.5km','2027-01-21T13:15:00',2027),
      ('G-2027-02','SPRINT_M','Sprint','Sprint Uomini 10km','Sprint Herren 10km','Men Sprint 10km','2027-01-21T16:00:00',2027),
      ('G-2027-03','PURSUIT_W','Pursuit','Pursuit Donne 10km','Verfolgung Damen 10km','Women Pursuit 10km','2027-01-23T12:30:00',2027),
      ('G-2027-04','PURSUIT_M','Pursuit','Pursuit Uomini 12.5km','Verfolgung Herren 12,5km','Men Pursuit 12.5km','2027-01-23T14:45:00',2027),
      ('G-2027-05','MASSSTART_W','Mass Start','Mass Start Donne 12.5km','Massenstart Damen 12,5km','Women Mass Start 12.5km','2027-01-24T11:30:00',2027),
      ('G-2027-06','MASSSTART_M','Mass Start','Mass Start Uomini 15km','Massenstart Herren 15km','Men Mass Start 15km','2027-01-24T14:00:00',2027);

    INSERT INTO areato.Settore (ExternalId, GaraId, NomeIt, NomeDe, NomeEn, PostiNumerati, Capienza, AmmessoInOpzione)
    SELECT CONCAT('S-', g.Codice, '-A'), g.Id, 'Tribuna A — Arrivo', 'Tribüne A — Ziel', 'Grandstand A — Finish', 1, 1200, 0 FROM areato.Gara g
    UNION ALL
    SELECT CONCAT('S-', g.Codice, '-B'), g.Id, 'Tribuna B — Poligono', 'Tribüne B — Schießstand', 'Grandstand B — Range', 0, 1500, 1 FROM areato.Gara g
    UNION ALL
    SELECT CONCAT('S-', g.Codice, '-C'), g.Id, 'Settore C — In piedi', 'Sektor C — Stehplatz', 'Sector C — Standing', 0, 3000, 1 FROM areato.Gara g;

    INSERT INTO areato.Prezzo (ExternalId, GaraId, SettoreId, Tipologia, Importo)
    SELECT CONCAT('P-', s.ExternalId, '-INT'), s.GaraId, s.Id, 'INTERO',
           CASE WHEN s.NomeIt LIKE 'Tribuna A%' THEN 95 WHEN s.NomeIt LIKE 'Tribuna B%' THEN 75 ELSE 35 END
    FROM areato.Settore s
    UNION ALL
    SELECT CONCAT('P-', s.ExternalId, '-RID'), s.GaraId, s.Id, 'RIDOTTO',
           CASE WHEN s.NomeIt LIKE 'Tribuna A%' THEN 70 WHEN s.NomeIt LIKE 'Tribuna B%' THEN 55 ELSE 25 END
    FROM areato.Settore s;
END
GO

PRINT 'Dati iniziali caricati.';
GO
