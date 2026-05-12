# DOKUMENTIMI I PROJEKTIT: SISTEM PËR KINEMËN

---

## FAQJA E TITULLIT

```
                                KOLEGJI AAB
                        
                    FAKULTETI: SHKENCA KOMPJUTERIKE
                           INXHINIERI SOFTUERIKE


                              🎬 KINEMA AAB 🎬
                    
                       Sistem për Rezervimin e Biletave
                        në Kinemën e Kinema AAB


                    Mentor: Ilir Keka
                    Anëtari i Grupit: Gentrit Hyseni


                            Data: Maj 2026
```

---

## LISTA E PËRMBAJTJES

1. [Hyrja](#1-hyrja)
2. [Qëllimi i Projektit](#2-qëllimi-i-projektit)
3. [Metodologjia](#3-metodologjia)
4. [Kërkesa e Projektit](#4-kërkesa-e-projektit)
5. [Arkitektura e Sistemit](#5-arkitektura-e-sistemit)
6. [Modeli i të Dhënave - Diagrami ER](#6-modeli-i-të-dhënave---diagrami-er)
7. [Modeli Relacionar](#7-modeli-relacionar)
8. [Skema e Bazës së Të Dhënave](#8-skema-e-bazës-së-të-dhënave)
9. [Implementimi i Tabelave SQL](#9-implementimi-i-tabelave-sql)
10. [Popullimi i Të Dhënave](#10-popullimi-i-të-dhënave)
11. [Kërkesa SQL (Queries)](#11-kërkesa-sql-queries)
12. [Interfejsi i Përdoruesit](#12-interfejsi-i-përdoruesit)
13. [Funksionalitetet e Sistemit](#13-funksionalitetet-e-sistemit)
14. [Sigurimi dhe Parandalimi i Dublikateve](#14-sigurimi-dhe-parandalimi-i-dublikateve)
15. [Konkluzionet](#15-konkluzionet)
16. [Referencat](#16-referencat)

---

## 1. HYRJA

Systemi i Rezervimit të Biletave për Kinemën (Kinema AAB) është një aplikacion web i ndërtuar për të thjeshtësuar procesin e rezervimit të biletave për filmat. Sistemi lejon përdoruesit të:

- Shfaqin filmat e disponueshëm të organizuar sipas kategorive
- Shfaqin oraret e filmave sipas datës
- Zgjedhin ulëset në sallë në mënyrë vizuale
- Kryejnë rezervim të biletave
- Kërkojnë filma sipas titullit
- Shohin filmat e sapo publikuara dhe shfaqjet e ditës

Përveç kësaj, sistemi ofron panelin administrativ ku administratorët mund të:
- Menaxhojnë filmat (shto, redakto, fshi)
- Shfaqin dhe anuojnë rezervimet aktive
- Kontrollojnë sallat e kinemase

---

## 2. QËLLIMI I PROJEKTIT

Qëllimi kryesor i këtij projekti është të krijohet një sistem i plotë për menaxhimin e rezervimeve të biletave në kinemë, duke:

1. **Automatizuar procesin e rezervimit**: Duke zëvendësuar sistemin manual ose telefonik
2. **Optimizuar përdorimin e ulëseve**: Duke parandaluar dublikime dhe maksimizuar zënimin e sallave
3. **Ofruar përvojë të mirë përdoruesit**: Interfejs i qartë dhe intuitiv
4. **Menaxhuar të dhënat në mënyrë efikase**: Duke përdorur bazën e të dhënave SQL Server
5. **Siguruar integritetin e të dhënave**: Duke zbatuar rregulla të forta të validimit dhe sigurisë

---

## 3. METODOLOGJIA

### 3.1 Teknologjitë e Përdorura

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla JS, Fetch API)
- **Backend**: Node.js me Express.js
- **Database**: Microsoft SQL Server (MSSQL)
- **Template Engine**: EJS (Embedded JavaScript Templates)
- **Autentifikimi**: Express-Session (Session-based Authentication)
- **Sigurimi**: Parameterized Queries (për parandalimin e SQL Injection)

### 3.2 Arkitektura

Sistemi ndiqet modelin **MVC (Model-View-Controller)**:
- **Model**: Tabela në SQL Server (Filmat, Shfaqjet, Sallat, Rezervimet, Perdoruesit)
- **View**: EJS templates (HTML)
- **Controller**: Express.js routes dhe business logic në server.js

### 3.3 Procesi i Zhvillimit

1. Dizajn i bazës së të dhënave (ER Diagram)
2. Implementimi i skemës SQL
3. Zhvillimi i backend (Node.js + Express)
4. Zhvillimi i frontend (EJS templates + CSS)
5. Testimi dhe debugging
6. Optimizimi dhe hardening i sigurisë

---

## 4. KËRKESA E PROJEKTIT

### 4.1 Kërkesa Funksionale

**Për përdoruesit e zakonshëm:**
- Shfaqja e listës së filmave
- Filtrim i filmave sipas kategorive/zhanrave
- Shikimi i oraret e filmave sipas datës
- Shikimi i detajeve të filmave (poster, përshkrim, kohëzgjatje)
- Zgjedhja e ulëseve në hapje vizuale të salles
- Rezervimi i biletave
- Anuljimi i biletave (në faqen e suksesit)
- Kërkimi i filmave sipas titullit
- Regjistrim dhe login

**Për administratorët:**
- Menaxhimi i filmave (CRUD operacione)
- Shfaqja e liste të rezervimeve aktive
- Anuljimi i rezervimeve
- Kontrolli mbi sallat

### 4.2 Kërkesa Jo-Funksionale

- Sistemi duhet të funksionojë 24/7
- Koha e përgjigjes duhet të jetë < 2 sekonda
- Parandalimi i dublikateve (double-booking)
- Sigurimi i të dhënave (parameterized queries)
- Interfejs responsive (punon në desktop, tablet, mobile)

---

---

## 5. ARKITEKTURA E SISTEMIT

### 5.1 Diagram i Arkitekturës

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Frontend)                        │
│  ├─ HTML5/EJS Templates                                        │
│  ├─ CSS3 (Responsive Design)                                   │
│  └─ JavaScript (Vanilla JS + Fetch API)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/HTTPS
┌────────────────────────▼────────────────────────────────────────┐
│                SERVER (Backend - Node.js)                       │
│  ├─ Express.js (Routing & Middleware)                          │
│  ├─ Express-Session (Authentication)                           │
│  ├─ Body-Parser (Request Parsing)                              │
│  └─ MSSQL Driver (Database Connection)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │ JDBC/ODBC
┌────────────────────────▼────────────────────────────────────────┐
│           DATABASE (SQL Server - Kinema)                        │
│  ├─ Filmat (Films)                                             │
│  ├─ Shfaqjet (Shows)                                           │
│  ├─ Sallat (Halls)                                             │
│  ├─ Rezervimet (Reservations)                                  │
│  └─ Perdoruesit (Users)                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. MODELI I TË DHËNAVE - DIAGRAMI ER

### 6.1 Entitetet dhe Relacionet

```
┌─────────────────┐         ┌──────────────────┐
│    Perdoruesit  │         │     Filmat       │
├─────────────────┤         ├──────────────────┤
│ ID (PK)         │    ┌────│ ID (PK)          │
│ Emri            │    │    │ Titulli          │
│ Email           │    │    │ Zhanri           │
│ Fjalekalimi     │    │    │ Kohezgjatja_Min  │
│ Roli            │    │    │ PosterURL        │
└─────────────────┘    │    │ Pershkrimi       │
      │                │    └──────────────────┘
      │                │            │
      │                │            │ (1:N)
      │                │            │
      │ (1:N)          │      ┌─────▼────────────┐
      │                │      │    Shfaqjet      │
      │                │      ├──────────────────┤
      │                │      │ ID (PK)          │
      │                └──────│ Filmi_ID (FK)    │
      │                       │ Salla_ID (FK)    │
      │                       │ Data_Ora         │
      │                       │ Cmimi_Baze       │
      │                       └─────┬────────────┘
      │                             │
      │                             │ (1:N)
      │                             │
      │        ┌────────────────────┘
      │        │
      │   ┌────▼──────────────┐     ┌──────────────────┐
      │   │  Rezervimet       │────▶│    Sallat        │
      │   ├───────────────────┤     ├──────────────────┤
      └──▶│ ID (PK)          │     │ ID (PK)          │
          │ Perdoruesi_ID(FK)│     │ Emri_Salles      │
          │ Shfaqja_ID (FK)  │     │ Rreshtat         │
          │ Rreshti          │     │ Kolonat          │
          │ Numri_Karriges   │     │ Kapaciteti       │
          │ Tipi_Uleses      │     └──────────────────┘
          │ Statusi          │
          │ Data_Rezervimit  │
          └──────────────────┘
```

### 6.2 Përshkrimi i Entiteteve

| Entiteti | Përshkrimi |
|----------|-----------|
| **Perdoruesit** | Përdoruesit e sistemit (klientët dhe administratorët) |
| **Filmat** | Filmat e disponueshëm në kinemë |
| **Shfaqjet** | Oraret e filmave në salla të ndryshme dhe në kohë të ndryshme |
| **Sallat** | Sallat e kinemase me kapacitetet e tyre |
| **Rezervimet** | Rezervimet e biletat nga përdoruesit |

---

## 7. MODELI RELACIONAR

Relacionet midis tabelave:

1. **Perdoruesit → Rezervimet** (1:N)
   - Një përdorues mund të ketë shumë rezervime
   - Foreign Key: Perdoruesi_ID

2. **Filmat → Shfaqjet** (1:N)
   - Një film mund të shfaqet shumë herë në orare të ndryshme
   - Foreign Key: Filmi_ID

3. **Sallat → Shfaqjet** (1:N)
   - Një sallë mund të ketë shumë shfaqje
   - Foreign Key: Salla_ID

4. **Shfaqjet → Rezervimet** (1:N)
   - Një shfaqje mund të ketë shumë rezervime
   - Foreign Key: Shfaqja_ID

---

## 8. SKEMA E BAZËS SË TË DHËNAVE

### 8.1 Tabela: Perdoruesit

```
┌──────────────────────────────────────────────┐
│              Perdoruesit                     │
├──────────────────────────────────────────────┤
│ ID                    INT (PK, AUTO_INC)    │
│ Emri                  VARCHAR(100) NOT NULL │
│ Email                 VARCHAR(100) UNIQUE   │
│ Fjalekalimi           VARCHAR(100) NOT NULL │
│ Roli                  VARCHAR(50) NULL      │
└──────────────────────────────────────────────┘
```

### 8.2 Tabela: Filmat

```
┌──────────────────────────────────────────────┐
│              Filmat                          │
├──────────────────────────────────────────────┤
│ ID                    INT (PK, AUTO_INC)    │
│ Titulli               NVARCHAR(200)         │
│ Zhanri                NVARCHAR(100)         │
│ Kohezgjatja_Min       INT                   │
│ PosterURL             NVARCHAR(500)         │
│ Pershkrimi            NVARCHAR(1000)        │
│ Data_Shtimit          DATETIME DEFAULT NOW  │
└──────────────────────────────────────────────┘
```

### 8.3 Tabela: Sallat

```
┌──────────────────────────────────────────────┐
│              Sallat                          │
├──────────────────────────────────────────────┤
│ ID                    INT (PK, AUTO_INC)    │
│ Emri_Salles           VARCHAR(100) NOT NULL │
│ Rreshtat              INT NOT NULL          │
│ Kolonat               INT NOT NULL          │
│ Kapaciteti            INT NULL              │
└──────────────────────────────────────────────┘
```

### 8.4 Tabela: Shfaqjet

```
┌──────────────────────────────────────────────┐
│              Shfaqjet                        │
├──────────────────────────────────────────────┤
│ ID                    INT (PK, AUTO_INC)    │
│ Filmi_ID              INT (FK) NULL         │
│ Salla_ID              INT (FK) NULL         │
│ Data_Ora              DATETIME NOT NULL     │
│ Cmimi_Baze            DECIMAL(10,2) NOT NULL│
└──────────────────────────────────────────────┘
```

### 8.5 Tabela: Rezervimet

```
┌──────────────────────────────────────────────┐
│              Rezervimet                      │
├──────────────────────────────────────────────┤
│ ID                    INT (PK, AUTO_INC)    │
│ Perdoruesi_ID         INT (FK)              │
│ Shfaqja_ID            INT (FK)              │
│ Rreshti               CHAR(1)               │
│ Numri_Karriges        INT                   │
│ Tipi_Uleses           NVARCHAR(50)          │
│ Statusi               NVARCHAR(50) DEFAULT  │
│                       'Aktiv'               │
│ Data_Rezervimit       DATETIME DEFAULT NOW  │
│ Data_Anulimit        DATETIME NULL         │
└──────────────────────────────────────────────┘
```

---

## 9. IMPLEMENTIMI I TABELAVE SQL

### 9.1 Kodi SQL për Krijimin e Tabelave

```sql
-- Krijoni bazën e të dhënave
CREATE DATABASE Kinema;
USE Kinema;

-- Tabela Perdoruesit
CREATE TABLE Perdoruesit (
    ID INT PRIMARY KEY IDENTITY(1,1),
    Emri VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Fjalekalimi VARCHAR(100) NOT NULL,
    Roli VARCHAR(50) NULL
);

-- Tabela Filmat
CREATE TABLE Filmat (
    ID INT PRIMARY KEY IDENTITY(1,1),
    Titulli NVARCHAR(200) NOT NULL,
    Zhanri NVARCHAR(100),
    Kohezgjatja_Min INT,
    PosterURL NVARCHAR(500),
    Pershkrimi NVARCHAR(1000),
    Data_Shtimit DATETIME DEFAULT GETDATE()
);

-- Tabela Sallat
CREATE TABLE Sallat (
    ID INT PRIMARY KEY IDENTITY(1,1),
    Emri_Salles VARCHAR(100) NOT NULL,
    Rreshtat INT NOT NULL,
    Kolonat INT NOT NULL,
    Kapaciteti INT NULL
);

-- Tabela Shfaqjet
CREATE TABLE Shfaqjet (
    ID INT PRIMARY KEY IDENTITY(1,1),
    Filmi_ID INT NULL,
    Salla_ID INT NULL,
    Data_Ora DATETIME NOT NULL,
    Cmimi_Baze DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (Filmi_ID) REFERENCES Filmat(ID) ON DELETE CASCADE,
    FOREIGN KEY (Salla_ID) REFERENCES Sallat(ID)
);

-- Tabela Rezervimet
CREATE TABLE Rezervimet (
    ID INT PRIMARY KEY IDENTITY(1,1),
    Perdoruesi_ID INT,
    Shfaqja_ID INT NOT NULL,
    Rreshti CHAR(1) NOT NULL,
    Numri_Karriges INT NOT NULL,
    Tipi_Uleses NVARCHAR(50),
    Statusi NVARCHAR(50) DEFAULT 'Aktiv',
    Data_Rezervimit DATETIME DEFAULT GETDATE(),
    Data_Anulimit DATETIME NULL,
    FOREIGN KEY (Perdoruesi_ID) REFERENCES Perdoruesit(ID),
    FOREIGN KEY (Shfaqja_ID) REFERENCES Shfaqjet(ID) ON DELETE CASCADE,
    UNIQUE (Shfaqja_ID, Rreshti, Numri_Karriges)
);

-- Krijo një VIEW për të marrë detajet e shfaqjeve
CREATE VIEW vw_Shfaqjet_Detaje AS
SELECT 
    s.ID AS Shfaqja_ID,
    f.ID AS Filmi_ID,
    f.Titulli,
    f.Zhanri,
    f.PosterURL,
    sal.Emri_Salles,
    sal.ID AS Salla_ID,
    s.Data_Ora,
    s.Cmimi_Regular,
    s.Cmimi_VIP
FROM Shfaqjet s
INNER JOIN Filmat f ON s.Filmi_ID = f.ID
INNER JOIN Sallat sal ON s.Salla_ID = sal.ID;
```

### 9.2 Indeksat (Performance Optimization)

```sql
-- Indeksat për kërkimin më të shpejtë
CREATE INDEX idx_Filmat_Zhanri ON Filmat(Zhanri);
CREATE INDEX idx_Shfaqjet_Filmi_ID ON Shfaqjet(Filmi_ID);
CREATE INDEX idx_Shfaqjet_Salla_ID ON Shfaqjet(Salla_ID);
CREATE INDEX idx_Shfaqjet_Data_Ora ON Shfaqjet(Data_Ora);
CREATE INDEX idx_Rezervimet_Perdoruesi_ID ON Rezervimet(Perdoruesi_ID);
CREATE INDEX idx_Rezervimet_Shfaqja_ID ON Rezervimet(Shfaqja_ID);
CREATE INDEX idx_Rezervimet_Statusi ON Rezervimet(Statusi);
```

---

## 10. POPULLIMI I TË DHËNAVE

### 10.1 Shembull i Të Dhënave për Testim

```sql
-- Shto Perdoruesit
INSERT INTO Perdoruesit (Emri, Email, Telefoni, Fjalekalimi, Roli) VALUES
('Gentrit Hyseni', 'gentrit@kinema.com', '044123456', 'pass123', 'Admin'),
('Ilir Keka', 'ilir@kinema.com', '045654321', 'pass456', 'Perdorues'),
('Artan Rama', 'artan@kinema.com', '046789012', 'pass789', 'Perdorues');

-- Shto Sallat
INSERT INTO Sallat (Emri_Salles, Kapaciteti, Numri_Rreshtave, Numri_UlesesPerRresht) VALUES
('Salla A', 140, 7, 20),
('Salla B', 180, 9, 20),
('Salla VIP', 60, 6, 10);

-- Shto Filmat
INSERT INTO Filmat (Titulli, Zhanri, Kohezgjatja_Min, PosterURL, Pershkrimi) VALUES
('Furiosa: A Mad Max Saga', 'Aksion/Aventurë', 148, 'https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xceZprc.jpg', 'Historia e origjinës së luftëtares rebele Furiosa.'),
('Deadpool & Wolverine', 'Aksion/Komedi', 128, 'https://image.tmdb.org/t/p/w500/poster.jpg', 'Aventura e plotë me humor dhe aksion.'),
('Inception', 'Dramë/Sci-Fi', 148, 'https://image.tmdb.org/t/p/w500/inception.jpg', 'Një thriller i mendit për drime brenda dremave.');

-- Shto Shfaqjet (për ditën e sotme dhe nesër)
INSERT INTO Shfaqjet (Filmi_ID, Salla_ID, Data_Ora, Cmimi_Regular, Cmimi_VIP) VALUES
(1, 1, GETDATE() + CAST('14:00:00' AS TIME), 54.00, 64.00),
(1, 2, GETDATE() + CAST('16:30:00' AS TIME), 54.00, 64.00),
(2, 1, GETDATE() + CAST('18:00:00' AS TIME), 54.00, 64.00),
(3, 3, GETDATE() + CAST('20:00:00' AS TIME), 64.00, 74.00);
```

---

## 11. KËRKESA SQL (QUERIES)

### 11.1 Shfaqja e Filmave sipas Kategorisë

```sql
SELECT * FROM Filmat 
WHERE Zhanri LIKE '%Aksion%'
ORDER BY Titulli;
```

### 11.2 Shfaqja e Oraret e Filmit të Zgjedhur

```sql
SELECT * FROM vw_Shfaqjet_Detaje
WHERE Filmi_ID = 1
ORDER BY Data_Ora ASC;
```

### 11.3 Shfaqja e Shfaqjeve për një Datë të Caktuar

```sql
SELECT s.ID AS Shfaqja_ID, s.Data_Ora, f.Titulli, sal.Emri_Salles
FROM Shfaqjet s
INNER JOIN Filmat f ON s.Filmi_ID = f.ID
INNER JOIN Sallat sal ON s.Salla_ID = sal.ID
WHERE CONVERT(date, s.Data_Ora) = '2026-05-10'
ORDER BY s.Data_Ora ASC;
```

### 11.4 Kontrollimi i Ulëseve të Zëna

```sql
SELECT Rreshti, Numri_Karriges FROM Rezervimet
WHERE Shfaqja_ID = 1 AND Statusi = 'Aktiv';
```

### 11.5 Shfaqja e Rezervimeve Aktive (për Admin)

```sql
SELECT r.ID, r.Shfaqja_ID, r.Rreshti, r.Numri_Karriges, r.Tipi_Uleses, r.Statusi,
       f.Titulli, s.Data_Ora, sal.Emri_Salles
FROM Rezervimet r
INNER JOIN Shfaqjet s ON r.Shfaqja_ID = s.ID
INNER JOIN Filmat f ON s.Filmi_ID = f.ID
INNER JOIN Sallat sal ON s.Salla_ID = sal.ID
WHERE r.Statusi = 'Aktiv'
ORDER BY s.Data_Ora DESC;
```

### 11.6 Numërimi i Ulëseve të Lira në një Shfaqje

```sql
SELECT 
    (sal.Kapaciteti - COUNT(r.ID)) AS Uleset_E_Lira,
    COUNT(r.ID) AS Uleset_E_Zena
FROM Shfaqjet s
LEFT JOIN Rezervimet r ON s.ID = r.Shfaqja_ID AND r.Statusi = 'Aktiv'
INNER JOIN Sallat sal ON s.Salla_ID = sal.ID
WHERE s.ID = 1
GROUP BY sal.Kapaciteti;
```

### 11.7 Kërkimi i Filmave sipas Titullit

```sql
SELECT * FROM Filmat
WHERE Titulli LIKE '%Deadpool%'
ORDER BY Titulli;
```

### 11.8 Listimi i Filmave të Sapo Shtuar

```sql
SELECT TOP 6 * FROM Filmat
ORDER BY ID DESC;
```

---

## 12. INTERFEJSI I PËRDORUESIT

### 12.1 Struktura e Faqeve

**1. Faqja Kryesore (/):**
- Header me navigim
- Seksioni "Po shfaqen tani" - Tabelë e filmave
- Seksioni "Së shpejti" - Filmat e sapo shtuar
- Seksioni "Shfaqjet e Sotme" - Oraret e filmave për ditën e sotme
- Footer

**2. Faqja e Kategorive (/kategorite):**
- Lista e zhanreve
- Klikuese të dinamike që ngarkohen filmat sipas zhanrit
- Rrjeti i filmave për zhanrin e zgjedhur

**3. Faqja e Detajeve të Filmit (/filmi/:id):**
- Poster i filmit
- Detaje (titull, zhanër, kohëzgjatje, përshkrim)
- Tabela e orareev me butonat "Shiko Detajet"
- Pasqyrë e salles me ulëset e disponueshme

**4. Faqja e Rezervimit:**
- Harta vizuale e ulëseve të salles
- Zgjedhja e ulëseve
- Inpute për email/telefon
- Butoni "Rezervo"

**5. Faqja e Suksesit (/success):**
- Mesazh suksesi
- Detaje të plotë të rezervimit
- Buton për anuljim të biletës
- Buton për kthehem në shtëpi

**6. Faqja e Logimit (/login):**
- Forma me email dhe fjalëkalim
- Butoni për regjistrim

**7. Paneli i Administratorit (/admin):**
- Tabela e filmave (CRUD)
- Tabela e rezervimeve aktive
- Buton për anuljim të rezervimeve

### 12.2 Paleta e Ngjyrave

```
- Ngjyra Kryesore: #1a1a2e (Blu i errët)
- Ngjyra Dytësore: #16213e (Blu më i errët)
- Ngjyra Aksent: #ffc107 (Fllusku i artë)
- Ngjyra e Suksesit: #28a745 (Jeshil)
- Ngjyra e Gabimit: #dc3545 (I kuq)
- Ngjyra Teksti: #ffffff (Bardhë)
- Ngjyra Ulëseve:
  - Regular: #4CAF50 (Jeshil)
  - VIP: #FFD700 (Ari)
  - I Zënë: #D3D3D3 (Gri i argjendtë)
  - I Zgjedhur: #FF6B6B (I kuq rozë)
```

---

## 13. FUNKSIONALITETET E SISTEMIT

### 13.1 Funksionalitetet e Përdoruesit

#### 1. Shfaqja e Filmave
- Sistemi shfaq të gjithe filmat në faqen kryesore
- Filmat organizohen në rrjeta me poster, titull, zhanër dhe kohëzgjatje
- Çdo film ka link të "Shiko Oraret" që çon në faqen e detajeve

#### 2. Filtrim sipas Kategorive
- Përdoruesi mund të zgjedhë një kategori (zhanër)
- Sistemi merr kategoritë nga `/api/kategorit`
- Filmat i përshkruhen sipas kërkimit në `/api/kategori/{zhanri}`
- **Veçantia**: Filmat me shumë zhanre (p.sh. "Aksion/Komedi") shfaqen në të dyja kategoritë

#### 3. Shfaqja sipas Datës
- Në faqën `/calendar` përdoruesi zgjedh një datë
- Sistemi merr shfaqjet për atë datë nga `/api/filmat-by-date?date=YYYY-MM-DD`
- Shfaqen filmat, sallat, dhe oraret

#### 4. Zgjedhja e Ulëseve
- Në faqen `/filmi/:id` përdoruesi zgjedh ulëse nga harta e salles
- Ulëset e zëna nuk mund të zgjidhen
- Ulëset VIP (rreshti E) kanë çmim më të lartë
- Zgjedhja paraqitet vizualisht me ngjyra

#### 5. Rezervimi i Biletave
- Përdoruesi mund të rezervojë disa ulëse
- Sistemi kryen kontroll për dublikata (double-booking)
- Çdo ulëse krijon një rresht në Rezervimet
- Pas suksesit, shfaqet faqja success.ejs me detaje

#### 6. Kërkimi
- Në header ka një forma kërkimi
- Përdoruesi shkruan titullin e filmit
- Sistemi merr filmat që përputhen me LIKE në bazën e të dhënave

#### 7. Regjistrim dhe Login
- Përdoruesi mund të regjistrohet me email dhe fjalëkalim
- Pas login-it, sesioniit i ruhet në memory (express-session)
- Administratorët drejtojnë në panelin e admin-it

#### 8. Anuljimi i Biletave
- Pas rezervimit, përdoruesi mund të anuljojë biletën
- Bileta ndryshohet nga statusi 'Aktiv' në 'Anuluar'
- Ulësa bëhet e disponueshme për rezervime të tjera

### 13.2 Funksionalitetet e Administratorit

#### 1. Menaxhimi i Filmave
- **Shto Film**: Form për të shtuar film të ri
- **Redakto Film**: Përditesimi i detajeve të filmit
- **Fshi Film**: Fshirja e filmit (me ON DELETE CASCADE hapen shfaqjet dhe rezervimet)

#### 2. Menaxhimi i Rezervimeve
- Shfaqja e listës Rezervimeve Aktive në tabela
- Përshfaqja e filmit, salles, datës, ulëseve
- Buton "Anulo" për anuljimin e rezervimit
- Përditesimi i statusit në 'Anuluar'

#### 3. Raporte (i disponueshëm me zgjerim të ardhshëm)
- Numri i biletave të shitura sipas dite/muaji
- Zënien e salles sipas filmit
- Filmat më popullor

---

## 14. SIGURIMI DHE PARANDALIMI I DUBLIKATEVE

### 14.1 Parandalimi i SQL Injection

**Metodologjia**: Përdorimi i parameterized queries

```javascript
// ❌ I PASIGURTE - SQL Injection
const result = await sql.query(`SELECT * FROM Filmat WHERE Zhanri = '${kategori}'`);

// ✅ I SIGURTE - Parameterized Query
const request = new sql.Request();
request.input('kategori', sql.NVarChar, kategori);
const result = await request.query('SELECT * FROM Filmat WHERE Zhanri = @kategori');
```

Të gjithe queries në server.js përdorin parameterized queries.

### 14.2 Parandalimi i Double-Booking

**Metodologjia**: Kontroll para insertimit

```javascript
// Kontroll para se të bëhet INSERT
const checkReq = new sql.Request();
checkReq.input('shfaqja_id', sql.Int, shfaqjaId);
const existing = await checkReq.query(
    `SELECT Rreshti, Numri_Karriges FROM Rezervimet 
     WHERE Shfaqja_ID = @shfaqja_id AND Statusi = 'Aktiv'`
);

const occupiedSeats = existing.recordset.map(r => r.Rreshti + r.Numri_Karriges);
const conflictSeats = uleset.filter(u => occupiedSeats.includes(u));

if (conflictSeats.length > 0) {
    return res.send(`Ulëse të zëna: ${conflictSeats.join(', ')}`);
}
```

**Në bazën e të dhënave:**
```sql
-- UNIQUE constraint parandalon dublikatat
UNIQUE (Shfaqja_ID, Rreshti, Numri_Karriges)
```

### 14.3 Autentifikimi dhe Autorizimi

- **Express-Session**: Sesioni i ruajtur në memory
- **Roli**: Kontrollimi i qasjes sipas rolit (Admin/Perdorues)
- **Password**: Fjalëkalimi ruhet si tekst i thjeshtë (rekomandim: hash me bcrypt në production)

```javascript
if (!req.session.user || req.session.user.Roli !== 'Admin') {
    return res.send("Nuk keni akses!");
}
```

### 14.4 Validimi i Input-it

- Email: Kontroll për format të saktë
- Telefon: Kontroll për gjatësi
- ID: Kontroll për tip të saktë (INT)
- Ulëse: Kontroll për format (Rresht + Numër)

---

## 15. KONKLUZIONET

### 15.1 Përfundimet e Arritura

Projekti "Sistem për Kinemën" ka arritur të zhvillohet me sukses me këtë arkitekturë:

1. **Baza e të Dhënave**: Dizajni relacionar i saktë që mundëson operacionet komplekse dhe të sigurta.

2. **Backend-i**: Node.js + Express për përpunimin e kërkesave dhe menaxhimin e bazës.

3. **Frontend-i**: EJS templates + CSS responsive për përvojën e përdoruesit.

4. **Sigurimi**: Parameterized queries parandalojnë SQL Injection, unique constraints parandalojnë double-booking.

5. **Funksionalitetet**: Sistemi ofron listimin e filmave, filtrim, kalendarial, orare, rezervim, menaxhim admin.

6. **Klasifikimi i Zhanreve**: Filmat me shumë zhanre shfaqen në të dyja kategoritë (p.sh. Deadpool në Aksion dhe Komedi).

### 15.2 Pikat e Forta

- ✅ Interfejs i qartë dhe intuitiv
- ✅ Sistemi parametrizuar paraqi SQL Injection
- ✅ Double-booking Prevention me UNIQUE constraint
- ✅ Filma klasifikuar sipas kategoria shumta
- ✅ Admin panel për menaxhim
- ✅ Responsive design (desktop/mobile)
- ✅ Filmat e sapo publikuar dhe shfaqjet e sotme në homepage

### 15.3 Përmirësimet e Ardhshme

Sistemi mund të përmirësohet me:

1. **Sigurimi**: Hash-imi i fjalëkalimeve me bcrypt
2. **Pagesat**: Integrimi me API-të e pagesave (Stripe, PayPal)
3. **Email**: Dërgimi i emailave konfirmues pas rezervimit
4. **Raporte**: Dashboard-i për analizën e shitjeve
5. **Bileta**: Gjenerimi i QR kodeve për bileta
6. **Vlerësime**: Sistemi i vlerësimit të filmave
7. **Kuota**: Kuota për numrin maksimal të rezervimeve për person

### 15.4 Përfundim Përgjithshëm

Sistemi "Kinema AAB" është një zbatim i plotë i një aplikacioni web për menaxhimin e rezervimeve të biletave. Ai përdor teknologjitë moderne (Node.js, Express, SQL Server) dhe aplikon praktika të mira të sigurisë dhe dizajnit të bazës. Projekti përmbush të gjithe kërkesat e lëndës dhe është i gatshëm për përdorim në produksion me ndonjë përmirësim të ardhshëm.

---

## 16. REFERENCAT

### 16.1 Referenca Teknike

1. **Express.js Documentation** - https://expressjs.com/
   - Framework-i kryesor për backend

2. **Node.js Official Documentation** - https://nodejs.org/docs/
   - Runtime për ekzekutimin e JavaScript

3. **Microsoft SQL Server Documentation** - https://learn.microsoft.com/en-us/sql/
   - Baza e të dhënave dhe queries

4. **EJS Template Engine** - https://ejs.co/
   - Template engine për frontend rendering

5. **Express-Session** - https://github.com/expressjs/session
   - Menaxhimi i sesionit për autentifikimin

### 16.2 Best Practices

6. **OWASP SQL Injection Prevention** - https://owasp.org/www-community/attacks/SQL_Injection
   - Parandalimi i SQL Injection përmes parameterized queries

7. **MDN Web Docs - Fetch API** - https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
   - Për komunikimin client-server

8. **W3C CSS Specifications** - https://www.w3.org/Style/CSS/
   - Styling dhe responsive design

### 16.3 Librat dhe Artikuj

9. **"Database Design and Relational Theory"** - C.J. Date
   - Teoria e bazave relacionare

10. **"Web Application Security"** - Andrew Hoffman
    - Sigurimi në aplikacionet web

### 16.4 Projekt dhe Kodi

11. **GitHub - Kinema AAB Project**
    - Repository-i i projektit (lokal në workspace)

12. **Stack Overflow** - https://stackoverflow.com/
    - Resourcee për debugging dhe problem-solving

---

**Dokumentimi përfundoi me suksesi. Faqe të plota: ~25-28 faqe në Word format.**

