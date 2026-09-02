/* =============================================================================
   Area Riservata Tour Operator - Coppa del Mondo Biathlon Antholz/Anterselva
   Script di creazione schema - Microsoft SQL Server 2019+
   -----------------------------------------------------------------------------
   NOTE DI PROGETTO
   - Lo schema "areato" contiene SOLO i dati operativi del nuovo modulo.
     Anagrafiche complete, calendario gare, prezzi e settori restano di
     proprieta' del gestionale esistente: qui vengono mantenute copie di
     sincronizzazione (colonna ExternalId = chiave nel gestionale).
   - Tutte le date sono in UTC (datetime2). La conversione in ora locale
     (Europe/Rome) e' responsabilita' del livello applicativo.
   - Tutti gli importi sono in EUR, decimal(10,2).
   - Multilingua: le colonne testuali localizzate usano suffisso _It/_De/_En.
   ============================================================================= */

IF DB_ID('AreaTO') IS NULL
    CREATE DATABASE AreaTO;
GO

USE AreaTO;
GO

IF SCHEMA_ID('areato') IS NULL
    EXEC('CREATE SCHEMA areato');
GO

/* =============================================================================
   1. ANAGRAFICHE E UTENTI
   ============================================================================= */

/* Tour Operator (i Fan Club sono assimilati ai TO, distinti dal solo campo Tipo).
   ExternalId = codice anagrafica nel database storico di biglietteria.
   Abilitato   = flag impostato dall'Admin per autorizzare l'accesso all'area. */
CREATE TABLE areato.TourOperator
(
    Id              INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_TourOperator PRIMARY KEY,
    ExternalId      NVARCHAR(50)        NOT NULL,   -- chiave anagrafica gestionale
    RagioneSociale  NVARCHAR(200)       NOT NULL,
    Tipo            VARCHAR(10)         NOT NULL CONSTRAINT CK_TO_Tipo CHECK (Tipo IN ('TO','FANCLUB')),
    PartitaIva      NVARCHAR(30)        NULL,
    Nazione         NVARCHAR(2)         NULL,       -- ISO 3166-1 alpha-2
    Lingua          VARCHAR(2)          NOT NULL CONSTRAINT DF_TO_Lingua DEFAULT 'it'
                                        CONSTRAINT CK_TO_Lingua CHECK (Lingua IN ('it','de','en')),
    EmailContatto   NVARCHAR(200)       NULL,
    Telefono        NVARCHAR(50)        NULL,
    Plafond         DECIMAL(10,2)       NULL,       -- limite di esposizione, NULL = nessun limite
    ScontoPartner   DECIMAL(5,2)        NOT NULL CONSTRAINT DF_TO_ScontoPartner DEFAULT 0, -- es. 25.00
    Abilitato       BIT                 NOT NULL CONSTRAINT DF_TO_Abilitato DEFAULT 0,
    CreatoIl        DATETIME2(0)        NOT NULL CONSTRAINT DF_TO_CreatoIl DEFAULT SYSUTCDATETIME(),
    ModificatoIl    DATETIME2(0)        NULL,
    CONSTRAINT UQ_TourOperator_ExternalId UNIQUE (ExternalId)
);
GO

/* Utenti dell'area riservata.
   Ruolo: ADMIN (comitato organizzatore) oppure TO (utente standard).
   Un utente ADMIN ha TourOperatorId NULL e vede i dati di tutti i TO. */
CREATE TABLE areato.Utente
(
    Id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Utente PRIMARY KEY,
    TourOperatorId      INT               NULL CONSTRAINT FK_Utente_TourOperator
                                          REFERENCES areato.TourOperator(Id),
    Email               NVARCHAR(200)     NOT NULL,
    NomeCompleto        NVARCHAR(200)     NULL,
    Ruolo               VARCHAR(10)       NOT NULL CONSTRAINT CK_Utente_Ruolo CHECK (Ruolo IN ('ADMIN','TO')),
    PasswordHash        NVARCHAR(255)     NULL,     -- PBKDF2/BCrypt; NULL finche' non impostata
    Lingua              VARCHAR(2)        NOT NULL CONSTRAINT DF_Utente_Lingua DEFAULT 'it',
    Attivo              BIT               NOT NULL CONSTRAINT DF_Utente_Attivo DEFAULT 1,
    UltimoAccessoIl     DATETIME2(0)      NULL,
    TentativiFalliti    INT               NOT NULL CONSTRAINT DF_Utente_Tentativi DEFAULT 0,
    BloccatoFinoA       DATETIME2(0)      NULL,
    CreatoIl            DATETIME2(0)      NOT NULL CONSTRAINT DF_Utente_CreatoIl DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Utente_Email UNIQUE (Email),
    CONSTRAINT CK_Utente_RuoloTO CHECK (
        (Ruolo = 'ADMIN' AND TourOperatorId IS NULL) OR
        (Ruolo = 'TO'    AND TourOperatorId IS NOT NULL))
);
GO

/* Token monouso per invito / impostazione email e password / reset password.
   Generato dall'Admin ("invia link di attivazione") o dal flusso password persa. */
CREATE TABLE areato.TokenAccesso
(
    Id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TokenAccesso PRIMARY KEY
                                  CONSTRAINT DF_TokenAccesso_Id DEFAULT NEWID(),
    UtenteId     INT              NOT NULL CONSTRAINT FK_TokenAccesso_Utente REFERENCES areato.Utente(Id),
    TokenHash    NVARCHAR(255)    NOT NULL,   -- si memorizza solo l'hash SHA-256 del token
    Tipo         VARCHAR(20)      NOT NULL CONSTRAINT CK_Token_Tipo CHECK (Tipo IN ('INVITO','RESET')),
    ScadeIl      DATETIME2(0)     NOT NULL,
    UsatoIl      DATETIME2(0)     NULL,
    CreatoIl     DATETIME2(0)     NOT NULL CONSTRAINT DF_Token_CreatoIl DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_TokenAccesso_Utente ON areato.TokenAccesso(UtenteId, Tipo, ScadeIl);
GO

/* =============================================================================
   2. CATALOGO (copia sincronizzata dal gestionale)
   ============================================================================= */

/* Gare della tappa di Antholz. Sincronizzate da GET /api/v1/antholz/races. */
CREATE TABLE areato.Gara
(
    Id            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Gara PRIMARY KEY,
    ExternalId    NVARCHAR(50)      NOT NULL,
    Codice        NVARCHAR(30)      NOT NULL,   -- es. SPRINT_M
    Disciplina    NVARCHAR(50)      NOT NULL,
    NomeIt        NVARCHAR(150)     NOT NULL,
    NomeDe        NVARCHAR(150)     NULL,
    NomeEn        NVARCHAR(150)     NULL,
    DataOraUtc    DATETIME2(0)      NOT NULL,
    Edizione      INT               NOT NULL,   -- anno gare, es. 2027
    Attiva        BIT               NOT NULL CONSTRAINT DF_Gara_Attiva DEFAULT 1,
    CONSTRAINT UQ_Gara_ExternalId UNIQUE (ExternalId)
);
GO

/* Settori/tribune con relativa capienza. La disponibilita' "vera" resta al
   gestionale; qui si mantiene l'ultima disponibilita' letta per la UI. */
CREATE TABLE areato.Settore
(
    Id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Settore PRIMARY KEY,
    ExternalId          NVARCHAR(50)      NOT NULL,
    GaraId              INT               NULL CONSTRAINT FK_Settore_Gara REFERENCES areato.Gara(Id),
    NomeIt              NVARCHAR(150)     NOT NULL,
    NomeDe              NVARCHAR(150)     NULL,
    NomeEn              NVARCHAR(150)     NULL,
    PostiNumerati       BIT               NOT NULL CONSTRAINT DF_Settore_Numerati DEFAULT 0,
    Capienza            INT               NOT NULL,
    DisponibilitaCache  INT               NULL,
    AggiornatoIl        DATETIME2(0)      NULL,
    AmmessoInOpzione    BIT               NOT NULL CONSTRAINT DF_Settore_Opzione DEFAULT 1,
    CONSTRAINT UQ_Settore_ExternalId UNIQUE (ExternalId)
);
GO

/* Listino: prezzo per gara/settore e tipologia (INTERO, RIDOTTO, ABBONAMENTO...). */
CREATE TABLE areato.Prezzo
(
    Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Prezzo PRIMARY KEY,
    ExternalId      NVARCHAR(50)      NOT NULL,
    GaraId          INT               NULL CONSTRAINT FK_Prezzo_Gara REFERENCES areato.Gara(Id),
    SettoreId       INT               NOT NULL CONSTRAINT FK_Prezzo_Settore REFERENCES areato.Settore(Id),
    Tipologia       NVARCHAR(50)      NOT NULL,   -- INTERO / RIDOTTO / ABBONAMENTO / ...
    Importo         DECIMAL(10,2)     NOT NULL,
    ValidoDal       DATE              NULL,
    ValidoAl        DATE              NULL,
    CONSTRAINT UQ_Prezzo_ExternalId UNIQUE (ExternalId)
);
GO

/* =============================================================================
   3. PARAMETRI DI SISTEMA
   ============================================================================= */

/* Chiave/valore per parametri gestibili dall'Admin senza rilascio:
   OPZIONE_SCADENZA (data unica per tutti, default 19/10),
   SCONTO_QTA_SOGLIA (20), SCONTO_QTA_PERC (5), LIMITE_VENDITA_DIRETTA (10), ... */
CREATE TABLE areato.Parametro
(
    Chiave       NVARCHAR(80)  NOT NULL CONSTRAINT PK_Parametro PRIMARY KEY,
    Valore       NVARCHAR(400) NOT NULL,
    Descrizione  NVARCHAR(400) NULL,
    ModificatoIl DATETIME2(0)  NOT NULL CONSTRAINT DF_Parametro_Mod DEFAULT SYSUTCDATETIME(),
    ModificatoDa INT           NULL CONSTRAINT FK_Parametro_Utente REFERENCES areato.Utente(Id)
);
GO

/* =============================================================================
   4. OPZIONI
   Ciclo: BOZZA -> RICHIESTA -> VALIDATA -> (CONVERTITA_PARZ|CONVERTITA) 
                             \-> RIFIUTATA / SCADUTA / RILASCIATA
   ============================================================================= */

CREATE TABLE areato.Opzione
(
    Id                INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Opzione PRIMARY KEY,
    Numero            NVARCHAR(20)      NOT NULL,   -- progressivo leggibile es. OPT-2027-0001
    TourOperatorId    INT               NOT NULL CONSTRAINT FK_Opzione_TO REFERENCES areato.TourOperator(Id),
    Stato             VARCHAR(20)       NOT NULL CONSTRAINT CK_Opzione_Stato CHECK
                        (Stato IN ('BOZZA','RICHIESTA','VALIDATA','RIFIUTATA','SCADUTA','RILASCIATA','CONVERTITA_PARZ','CONVERTITA')),
    ScadeIl           DATETIME2(0)      NOT NULL,   -- da parametro OPZIONE_SCADENZA
    Note              NVARCHAR(1000)    NULL,
    TotaleStimato     DECIMAL(10,2)     NOT NULL CONSTRAINT DF_Opzione_Totale DEFAULT 0,
    ExternalId        NVARCHAR(50)      NULL,       -- id hold nel gestionale
    CreatoDa          INT               NOT NULL CONSTRAINT FK_Opzione_CreatoDa REFERENCES areato.Utente(Id),
    CreatoIl          DATETIME2(0)      NOT NULL CONSTRAINT DF_Opzione_CreatoIl DEFAULT SYSUTCDATETIME(),
    ValidataDa        INT               NULL CONSTRAINT FK_Opzione_ValidataDa REFERENCES areato.Utente(Id),
    ValidataIl        DATETIME2(0)      NULL,
    MotivoRifiuto     NVARCHAR(500)     NULL,
    PdfInviatoIl      DATETIME2(0)      NULL,       -- invio Optionsformular
    CONSTRAINT UQ_Opzione_Numero UNIQUE (Numero)
);
CREATE INDEX IX_Opzione_TO_Stato ON areato.Opzione(TourOperatorId, Stato) INCLUDE (ScadeIl);
GO

/* Righe di opzione: una per combinazione gara/settore/tipologia prezzo. */
CREATE TABLE areato.OpzioneRiga
(
    Id             INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OpzioneRiga PRIMARY KEY,
    OpzioneId      INT               NOT NULL CONSTRAINT FK_OpzioneRiga_Opzione
                                     REFERENCES areato.Opzione(Id) ON DELETE CASCADE,
    GaraId         INT               NOT NULL CONSTRAINT FK_OpzioneRiga_Gara REFERENCES areato.Gara(Id),
    SettoreId      INT               NOT NULL CONSTRAINT FK_OpzioneRiga_Settore REFERENCES areato.Settore(Id),
    PrezzoId       INT               NOT NULL CONSTRAINT FK_OpzioneRiga_Prezzo REFERENCES areato.Prezzo(Id),
    Quantita       INT               NOT NULL CONSTRAINT CK_OpzioneRiga_Qta CHECK (Quantita > 0),
    QuantitaConvertita INT           NOT NULL CONSTRAINT DF_OpzioneRiga_QtaConv DEFAULT 0,
    PrezzoUnitario DECIMAL(10,2)     NOT NULL,      -- congelato al momento della richiesta
    CONSTRAINT CK_OpzioneRiga_Conv CHECK (QuantitaConvertita <= Quantita)
);
CREATE INDEX IX_OpzioneRiga_Opzione ON areato.OpzioneRiga(OpzioneId);
GO

/* =============================================================================
   5. PRENOTAZIONI
   Ciclo: RICHIESTA -> CONFERMATA -> (PAGATA) -> VENDUTA
                    \-> RIFIUTATA / ANNULLATA
   Una prenotazione puo' derivare da un'opzione (OpzioneId valorizzato) oppure
   essere inserita direttamente dal catalogo gare.
   ============================================================================= */

CREATE TABLE areato.Prenotazione
(
    Id                 INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Prenotazione PRIMARY KEY,
    Numero             NVARCHAR(20)      NOT NULL,   -- es. BOOK-2027-0001
    TourOperatorId     INT               NOT NULL CONSTRAINT FK_Pren_TO REFERENCES areato.TourOperator(Id),
    OpzioneId          INT               NULL CONSTRAINT FK_Pren_Opzione REFERENCES areato.Opzione(Id),
    Stato              VARCHAR(20)       NOT NULL CONSTRAINT CK_Pren_Stato CHECK
                         (Stato IN ('RICHIESTA','CONFERMATA','RIFIUTATA','ANNULLATA','PAGATA','VENDUTA')),
    Cliente            NVARCHAR(200)     NULL,       -- gruppo / referente
    NoteTo             NVARCHAR(1000)    NULL,       -- richieste posti numerati, ecc.
    Imponibile         DECIMAL(10,2)     NOT NULL CONSTRAINT DF_Pren_Imponibile DEFAULT 0,
    ScontoQuantita     DECIMAL(10,2)     NOT NULL CONSTRAINT DF_Pren_ScontoQta DEFAULT 0, -- 5% automatico
    ScontoPartner      DECIMAL(10,2)     NOT NULL CONSTRAINT DF_Pren_ScontoPartner DEFAULT 0, -- 25% manuale
    Totale             DECIMAL(10,2)     NOT NULL CONSTRAINT DF_Pren_Totale DEFAULT 0,
    TotalePagato       DECIMAL(10,2)     NOT NULL CONSTRAINT DF_Pren_Pagato DEFAULT 0,
    ScadenzaPagamento  DATE              NULL,
    ExternalId         NVARCHAR(50)      NULL,       -- id ordine nel gestionale
    CreatoDa           INT               NOT NULL CONSTRAINT FK_Pren_CreatoDa REFERENCES areato.Utente(Id),
    CreatoIl           DATETIME2(0)      NOT NULL CONSTRAINT DF_Pren_CreatoIl DEFAULT SYSUTCDATETIME(),
    ConfermataDa       INT               NULL CONSTRAINT FK_Pren_ConfermataDa REFERENCES areato.Utente(Id),
    ConfermataIl       DATETIME2(0)      NULL,
    MotivoRifiuto      NVARCHAR(500)     NULL,
    AnnullataDa        INT               NULL CONSTRAINT FK_Pren_AnnullataDa REFERENCES areato.Utente(Id),
    AnnullataIl        DATETIME2(0)      NULL,
    PdfInviatoIl       DATETIME2(0)      NULL,       -- invio Bestellformular / Order Confirmation
    CONSTRAINT UQ_Prenotazione_Numero UNIQUE (Numero)
);
CREATE INDEX IX_Prenotazione_TO_Stato ON areato.Prenotazione(TourOperatorId, Stato);
GO

CREATE TABLE areato.PrenotazioneRiga
(
    Id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PrenotazioneRiga PRIMARY KEY,
    PrenotazioneId   INT               NOT NULL CONSTRAINT FK_PrenRiga_Pren
                                       REFERENCES areato.Prenotazione(Id) ON DELETE CASCADE,
    OpzioneRigaId    INT               NULL CONSTRAINT FK_PrenRiga_OpzioneRiga REFERENCES areato.OpzioneRiga(Id),
    GaraId           INT               NOT NULL CONSTRAINT FK_PrenRiga_Gara REFERENCES areato.Gara(Id),
    SettoreId        INT               NOT NULL CONSTRAINT FK_PrenRiga_Settore REFERENCES areato.Settore(Id),
    PrezzoId         INT               NOT NULL CONSTRAINT FK_PrenRiga_Prezzo REFERENCES areato.Prezzo(Id),
    Quantita         INT               NOT NULL CONSTRAINT CK_PrenRiga_Qta CHECK (Quantita > 0),
    PrezzoUnitario   DECIMAL(10,2)     NOT NULL,
    ScontoPercentuale DECIMAL(5,2)     NOT NULL CONSTRAINT DF_PrenRiga_Sconto DEFAULT 0,
    Totale           DECIMAL(10,2)     NOT NULL
);
CREATE INDEX IX_PrenotazioneRiga_Pren ON areato.PrenotazioneRiga(PrenotazioneId);
GO

/* Nominativi degli spettatori: possono essere inseriti in prenotazione e
   modificati in qualunque momento dall'utente TO, anche dopo l'emissione. */
CREATE TABLE areato.Spettatore
(
    Id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Spettatore PRIMARY KEY,
    PrenotazioneRigaId  INT               NOT NULL CONSTRAINT FK_Spett_PrenRiga
                                          REFERENCES areato.PrenotazioneRiga(Id) ON DELETE CASCADE,
    TitoloId            INT               NULL,     -- FK impostata dopo la creazione di Titolo
    Nome                NVARCHAR(100)     NOT NULL,
    Cognome             NVARCHAR(100)     NOT NULL,
    Email               NVARCHAR(200)     NULL,
    Nazione             NVARCHAR(2)       NULL,
    ModificatoIl        DATETIME2(0)      NOT NULL CONSTRAINT DF_Spett_Mod DEFAULT SYSUTCDATETIME(),
    ModificatoDa        INT               NULL CONSTRAINT FK_Spett_Utente REFERENCES areato.Utente(Id)
);
CREATE INDEX IX_Spettatore_PrenRiga ON areato.Spettatore(PrenotazioneRigaId);
GO

/* =============================================================================
   6. PAGAMENTI E VENDITE
   ============================================================================= */

/* Registrazione pagamenti: consentita SOLO all'utente ADMIN. */
CREATE TABLE areato.Pagamento
(
    Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Pagamento PRIMARY KEY,
    PrenotazioneId  INT               NOT NULL CONSTRAINT FK_Pag_Pren REFERENCES areato.Prenotazione(Id),
    Importo         DECIMAL(10,2)     NOT NULL CONSTRAINT CK_Pag_Importo CHECK (Importo <> 0),
    DataValuta      DATE              NOT NULL,
    Metodo          VARCHAR(20)       NOT NULL CONSTRAINT CK_Pag_Metodo
                                      CHECK (Metodo IN ('BONIFICO','CONTANTI','CARTA','ALTRO')),
    Riferimento     NVARCHAR(200)     NULL,   -- CRO / nota contabile
    RegistratoDa    INT               NOT NULL CONSTRAINT FK_Pag_Utente REFERENCES areato.Utente(Id),
    RegistratoIl    DATETIME2(0)      NOT NULL CONSTRAINT DF_Pag_RegIl DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Pagamento_Pren ON areato.Pagamento(PrenotazioneId);
GO

/* Vendita = prenotazione convertita dall'Admin dopo l'incasso.
   L'emissione dei titoli avviene sul gestionale via REST API. */
CREATE TABLE areato.Vendita
(
    Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Vendita PRIMARY KEY,
    Numero          NVARCHAR(20)      NOT NULL,
    PrenotazioneId  INT               NOT NULL CONSTRAINT FK_Vendita_Pren REFERENCES areato.Prenotazione(Id),
    TourOperatorId  INT               NOT NULL CONSTRAINT FK_Vendita_TO REFERENCES areato.TourOperator(Id),
    Totale          DECIMAL(10,2)     NOT NULL,
    ExternalId      NVARCHAR(50)      NULL,   -- id vendita nel gestionale
    EmessaDa        INT               NOT NULL CONSTRAINT FK_Vendita_Utente REFERENCES areato.Utente(Id),
    EmessaIl        DATETIME2(0)      NOT NULL CONSTRAINT DF_Vendita_EmessaIl DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Vendita_Numero UNIQUE (Numero)
);
GO

/* Titoli di accesso emessi (biglietti e abbonamenti). */
CREATE TABLE areato.Titolo
(
    Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Titolo PRIMARY KEY,
    VenditaId       INT               NOT NULL CONSTRAINT FK_Titolo_Vendita REFERENCES areato.Vendita(Id),
    PrenotazioneRigaId INT            NOT NULL CONSTRAINT FK_Titolo_PrenRiga REFERENCES areato.PrenotazioneRiga(Id),
    Barcode         NVARCHAR(60)      NOT NULL,
    Tipo            VARCHAR(15)       NOT NULL CONSTRAINT CK_Titolo_Tipo CHECK (Tipo IN ('BIGLIETTO','ABBONAMENTO')),
    Fila            NVARCHAR(10)      NULL,
    Posto           NVARCHAR(10)      NULL,
    Intestatario    NVARCHAR(200)     NULL,   -- allineato da areato.Spettatore
    Annullato       BIT               NOT NULL CONSTRAINT DF_Titolo_Annullato DEFAULT 0,
    ExternalId      NVARCHAR(50)      NULL,
    CONSTRAINT UQ_Titolo_Barcode UNIQUE (Barcode)
);
CREATE INDEX IX_Titolo_Vendita ON areato.Titolo(VenditaId);
GO

ALTER TABLE areato.Spettatore
    ADD CONSTRAINT FK_Spett_Titolo FOREIGN KEY (TitoloId) REFERENCES areato.Titolo(Id);
GO

/* =============================================================================
   7. DOCUMENTI, NOTIFICHE, AUDIT
   ============================================================================= */

/* Archivio dei PDF generati (4 modelli previsti dalle specifiche v2.0). */
CREATE TABLE areato.Documento
(
    Id            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Documento PRIMARY KEY,
    Tipo          VARCHAR(30)       NOT NULL CONSTRAINT CK_Doc_Tipo CHECK
                    (Tipo IN ('OPZIONE_RICHIESTA','OPZIONE_CONFERMA','PRENOTAZIONE_RICHIESTA','PRENOTAZIONE_CONFERMA')),
    Lingua        VARCHAR(2)        NOT NULL,
    OpzioneId     INT               NULL CONSTRAINT FK_Doc_Opzione REFERENCES areato.Opzione(Id),
    PrenotazioneId INT              NULL CONSTRAINT FK_Doc_Pren REFERENCES areato.Prenotazione(Id),
    NomeFile      NVARCHAR(255)     NOT NULL,
    PercorsoFile  NVARCHAR(500)     NOT NULL,   -- path su file system del server Windows
    GeneratoIl    DATETIME2(0)      NOT NULL CONSTRAINT DF_Doc_GenIl DEFAULT SYSUTCDATETIME(),
    GeneratoDa    INT               NULL CONSTRAINT FK_Doc_Utente REFERENCES areato.Utente(Id)
);
GO

/* Coda email: nessun invio automatico. L'Admin decide cosa e quando inviare;
   un worker legge le righe in stato DA_INVIARE. */
CREATE TABLE areato.EmailCoda
(
    Id             INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EmailCoda PRIMARY KEY,
    Destinatario   NVARCHAR(300)     NOT NULL,
    Cc             NVARCHAR(300)     NULL,
    Oggetto        NVARCHAR(300)     NOT NULL,
    CorpoHtml      NVARCHAR(MAX)     NOT NULL,
    Lingua         VARCHAR(2)        NOT NULL,
    Tipo           VARCHAR(30)       NOT NULL,  -- INVITO / OPZIONE_PDF / SCADENZA_OPZIONE / PRENOTAZIONE_PDF / TITOLI
    DocumentoId    INT               NULL CONSTRAINT FK_Email_Documento REFERENCES areato.Documento(Id),
    Stato          VARCHAR(15)       NOT NULL CONSTRAINT CK_Email_Stato
                                     CHECK (Stato IN ('DA_INVIARE','INVIATA','ERRORE')),
    Tentativi      INT               NOT NULL CONSTRAINT DF_Email_Tentativi DEFAULT 0,
    UltimoErrore   NVARCHAR(1000)    NULL,
    RichiestaDa    INT               NULL CONSTRAINT FK_Email_Utente REFERENCES areato.Utente(Id),
    CreataIl       DATETIME2(0)      NOT NULL CONSTRAINT DF_Email_CreataIl DEFAULT SYSUTCDATETIME(),
    InviataIl      DATETIME2(0)      NULL
);
CREATE INDEX IX_EmailCoda_Stato ON areato.EmailCoda(Stato, CreataIl);
GO

/* Audit log: ogni azione di TO e Admin (chi, cosa, quando, IP). */
CREATE TABLE areato.AuditLog
(
    Id            BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLog PRIMARY KEY,
    UtenteId      INT                  NULL CONSTRAINT FK_Audit_Utente REFERENCES areato.Utente(Id),
    TourOperatorId INT                 NULL CONSTRAINT FK_Audit_TO REFERENCES areato.TourOperator(Id),
    Entita        VARCHAR(30)          NOT NULL,  -- OPZIONE / PRENOTAZIONE / VENDITA / UTENTE / AUTH
    EntitaId      NVARCHAR(30)         NULL,
    Azione        NVARCHAR(100)        NOT NULL,
    Dettagli      NVARCHAR(MAX)        NULL,      -- JSON con diff dei campi
    IndirizzoIp   NVARCHAR(45)         NULL,
    UserAgent     NVARCHAR(300)        NULL,
    CreatoIl      DATETIME2(0)         NOT NULL CONSTRAINT DF_Audit_CreatoIl DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_AuditLog_Data ON areato.AuditLog(CreatoIl DESC);
CREATE INDEX IX_AuditLog_Entita ON areato.AuditLog(Entita, EntitaId);
GO

/* =============================================================================
   8. VISTE DI RIEPILOGO (pagina unica totali + export Excel)
   ============================================================================= */

/* Totali per settore e tipologia di prezzo, con colonne per opzioni,
   prenotazioni e vendite: alimenta la pagina riepilogo dell'Admin. */
CREATE OR ALTER VIEW areato.vRiepilogoSettoreTipologia
AS
SELECT
    s.Id                                        AS SettoreId,
    s.NomeIt                                    AS Settore,
    p.Tipologia                                 AS Tipologia,
    SUM(CASE WHEN src.Origine = 'OPZIONE'      THEN src.Quantita ELSE 0 END) AS QtaOpzioni,
    SUM(CASE WHEN src.Origine = 'OPZIONE'      THEN src.Importo  ELSE 0 END) AS ImportoOpzioni,
    SUM(CASE WHEN src.Origine = 'PRENOTAZIONE' THEN src.Quantita ELSE 0 END) AS QtaPrenotazioni,
    SUM(CASE WHEN src.Origine = 'PRENOTAZIONE' THEN src.Importo  ELSE 0 END) AS ImportoPrenotazioni,
    SUM(CASE WHEN src.Origine = 'VENDITA'      THEN src.Quantita ELSE 0 END) AS QtaVendite,
    SUM(CASE WHEN src.Origine = 'VENDITA'      THEN src.Importo  ELSE 0 END) AS ImportoVendite
FROM (
    SELECT 'OPZIONE' AS Origine, orr.SettoreId, orr.PrezzoId,
           orr.Quantita, orr.Quantita * orr.PrezzoUnitario AS Importo
    FROM areato.OpzioneRiga orr
    JOIN areato.Opzione o ON o.Id = orr.OpzioneId
    WHERE o.Stato IN ('RICHIESTA','VALIDATA','CONVERTITA_PARZ')
    UNION ALL
    SELECT 'PRENOTAZIONE', pr.SettoreId, pr.PrezzoId, pr.Quantita, pr.Totale
    FROM areato.PrenotazioneRiga pr
    JOIN areato.Prenotazione pn ON pn.Id = pr.PrenotazioneId
    WHERE pn.Stato IN ('RICHIESTA','CONFERMATA','PAGATA')
    UNION ALL
    SELECT 'VENDITA', pr.SettoreId, pr.PrezzoId, pr.Quantita, pr.Totale
    FROM areato.PrenotazioneRiga pr
    JOIN areato.Prenotazione pn ON pn.Id = pr.PrenotazioneId
    WHERE pn.Stato = 'VENDUTA'
) src
JOIN areato.Settore s ON s.Id = src.SettoreId
JOIN areato.Prezzo  p ON p.Id = src.PrezzoId
GROUP BY s.Id, s.NomeIt, p.Tipologia;
GO

/* Opzioni ancora in vita: elenco usato dall'Admin per decidere l'invio
   manuale dell'email di avviso scadenza. */
CREATE OR ALTER VIEW areato.vOpzioniInScadenza
AS
SELECT o.Id, o.Numero, o.TourOperatorId, t.RagioneSociale, t.EmailContatto, t.Lingua,
       o.ScadeIl, DATEDIFF(DAY, SYSUTCDATETIME(), o.ScadeIl) AS GiorniAllaScadenza,
       (SELECT SUM(Quantita - QuantitaConvertita) FROM areato.OpzioneRiga r WHERE r.OpzioneId = o.Id) AS QtaResidua
FROM areato.Opzione o
JOIN areato.TourOperator t ON t.Id = o.TourOperatorId
WHERE o.Stato IN ('VALIDATA','CONVERTITA_PARZ');
GO

PRINT 'Schema areato creato correttamente.';
GO
