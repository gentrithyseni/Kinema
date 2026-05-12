const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

// Perdorim msnodesqlv8 per Windows Authentication (që të hysh pa password)
const sql = require('mssql/msnodesqlv8'); 
const fs = require('fs');

const app = express();

const UPCOMING_ONLY_TITLES = [
    'Toy Story 5',
    'Scary Movie',
    'Top Gun (40th Anniversary)',
    'Sneaks'
];

const HALL_PRICING = {
    1: { regular: 6.0, vip: 9.0 },
    2: { regular: 5.0, vip: 6.5 },
    3: { regular: 5.5, vip: 7.5 },
    4: { regular: 4.0, vip: 5.5 },
    5: { regular: 5.8, vip: 7.2 }
};

function getHallPricingById(hallId) {
    return HALL_PRICING[hallId] || { regular: 5.5, vip: 7.5 };
}

function getHallPricing(hallId, hallName) {
    if (HALL_PRICING[hallId]) return HALL_PRICING[hallId];
    const match = String(hallName || '').match(/\d+/);
    if (match) {
        const parsed = parseInt(match[0], 10);
        if (HALL_PRICING[parsed]) return HALL_PRICING[parsed];
    }
    return { regular: 5.5, vip: 7.5 };
}

function isKidsHall(hallId, hallName) {
    const lower = String(hallName || '').toLowerCase();
    return hallId === 4 || lower.includes('kids') || lower.includes('femij') || lower.includes('fëmij') || lower.includes('salla 4');
}

function isAnimatedGenre(value) {
    return /anim/i.test(String(value || ''));
}

// Konfigurimi i EJS per pamjen (frontend)
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('view cache', false);
app.use(express.static('public')); // Këtu do mbajmë CSS dhe fotot
app.use(bodyParser.urlencoded({ extended: true }));

// Konfigurimi i Seksionit (Per te mbajtur mend nese useri/admini eshte loguar)
app.use(session({
    secret: 'kinema_sekrete',
    resave: false,
    saveUninitialized: true
}));

// Konfigurimi i Databazes me Windows Authentication
const dbConfig = {
    server: 'GENTO\\VE_SERVER', // Emri i serverit tend ne SSMS
    database: 'Kinema',         // Emri i databazes
    driver: 'msnodesqlv8',      // Tregon qe lidhemi direkt nga Windows
    options: {
        trustedConnection: true, // Kjo zevendeson username dhe password
        encrypt: false,
        trustServerCertificate: true
    }
};

async function ensureActiveSeatUniqueIndex() {
    const request = new sql.Request();
    await request.query(`
        IF NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE name = 'UX_Rezervimet_Aktiv_Seat'
              AND object_id = OBJECT_ID('dbo.Rezervimet')
        )
        BEGIN
            CREATE UNIQUE INDEX UX_Rezervimet_Aktiv_Seat
            ON dbo.Rezervimet (Shfaqja_ID, Rreshti, Numri_Karriges)
            WHERE Statusi = 'Aktiv';
        END
    `);
}

// Lidhja me Databazen
sql.connect(dbConfig).then(async () => {
    console.log("Lidhja me SSMS u krye me sukses!");
    try {
        await ensureActiveSeatUniqueIndex();
        console.log('Index i ulëseve aktive u verifikua/krijua me sukses.');
    } catch (idxErr) {
        console.log('Gabim gjatë verifikimit të index-it të ulëseve aktive:', idxErr.message || idxErr);
    }
}).catch(err => {
    console.log("Gabim ne lidhje me databazen: ", err);
});

function getLocalDayRange(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
}

function parseLocalDateTime(datePart, timePart) {
    if (!datePart || !timePart) return null;
    const candidate = new Date(`${datePart}T${timePart}:00`);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
}

function addMinutes(date, minutes) {
    return new Date(date.getTime() + (minutes * 60000));
}

function formatDateTime24(value) {
    return new Date(value).toLocaleString('sq-AL', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getBookingCutoff(date = new Date()) {
    return new Date(date.getTime() + 60000);
}

function isStartTimeAllowed(startDateTime) {
    const hours = startDateTime.getHours();
    const minutes = startDateTime.getMinutes();
    return hours < 23 || (hours === 23 && minutes === 0);
}

async function cleanupExpiredShows(now = new Date()) {
    const request = new sql.Request();
    request.input('now', sql.DateTime, now);
    await request.query(`
        DELETE r
        FROM Rezervimet r
        INNER JOIN Shfaqjet s ON r.Shfaqja_ID = s.ID
        INNER JOIN Filmat f ON s.Filmi_ID = f.ID
        WHERE DATEADD(minute, ISNULL(f.Kohezgjatja_Min, 0) + 60, s.Data_Ora) <= @now;

        DELETE s
        FROM Shfaqjet s
        INNER JOIN Filmat f ON s.Filmi_ID = f.ID
        WHERE DATEADD(minute, ISNULL(f.Kohezgjatja_Min, 0) + 60, s.Data_Ora) <= @now;
    `);
}

// ==========================================
// RRUGËT E APLIKACIONIT (ROUTES)
// ==========================================

// 1. Faqja Kryesore - Shfaq filmat me shfaqje aktualë
app.get('/', async (req, res) => {
    try {
        await cleanupExpiredShows();

        // Today's shows
        const { start: todayStart, end: tomorrowStart } = getLocalDayRange();
        const bookingCutoff = getBookingCutoff();

        const showsReq = new sql.Request();
        showsReq.input('todayStart', sql.DateTime, todayStart);
        showsReq.input('tomorrowStart', sql.DateTime, tomorrowStart);
        showsReq.input('bookingCutoff', sql.DateTime, bookingCutoff);
        const showsQ = `
            SELECT s.ID AS Shfaqja_ID, s.Data_Ora, f.ID AS Filmi_ID, f.Titulli, f.PosterURL, sal.Emri_Salles
            FROM Shfaqjet s
            INNER JOIN Filmat f ON s.Filmi_ID = f.ID
            INNER JOIN Sallat sal ON s.Salla_ID = sal.ID
            WHERE s.Data_Ora > @bookingCutoff AND s.Data_Ora < @tomorrowStart
            ORDER BY s.Data_Ora ASC
        `;
        const showsResult = await showsReq.query(showsQ);

        // Current films: all films with posters displayed on homepage (excluding upcoming-only films)
        const currentReq = new sql.Request();
        const currentFilmsQ = `
            SELECT ID, Titulli, Zhanri, Kohezgjatja_Min, PosterURL
            FROM Filmat
            WHERE PosterURL IS NOT NULL AND PosterURL != ''
            AND Titulli NOT IN ('Top Gun (40th Anniversary)', 'Scary Movie', 'Sneaks', 'Toy Story 5')
            ORDER BY ID DESC
        `;
        const currentFilmsResult = await currentReq.query(currentFilmsQ);

        res.render('index', {
            filmat: [],  // Empty for old reference
            currentFilms: currentFilmsResult.recordset,
            todaysShows: showsResult.recordset,
            user: req.session.user
        });
    } catch (err) {
        console.log(err);
        res.send("Gabim gjate marrjes se filmave nga databaza.");
    }
});

// 1b. Kategoritë - Shfaq pagën e kategorive
app.get('/kategorite', (req, res) => {
    res.render('kategorite', { user: req.session.user });
});

// Alias per URL me diakritikë
app.get('/kategoritë', (req, res) => {
    res.redirect('/kategorite');
});

// 1c. Sallat - Shfaq pagën e sallave
app.get('/sallat', (req, res) => {
    res.render('halls', { user: req.session.user });
});

// 1d. Filmat sipas kategorisë
app.get('/kategori/:kategori', async (req, res) => {
    try {
        const rawKategori = req.params.kategori;
        const kategori = decodeURIComponent(rawKategori);

        // Merr te gjithe filmat dhe filtroni ne-side duke ndare Zhanri me '/'
        const request = new sql.Request();
        const result = await request.query('SELECT * FROM Filmat ORDER BY Titulli');
        const all = result.recordset || [];
        const filtered = all.filter(f => {
            if (!f.Zhanri) return false;
            const parts = String(f.Zhanri).split('/').map(p => p.trim());
            return parts.includes(kategori);
        });

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json(filtered);
        }

        res.render('index', { filmat: filtered, user: req.session.user, selectedCategory: kategori });
    } catch (err) {
        console.log(err);
        res.send("Gabim gjate filtrimit sipas kategorise.");
    }
});

// API: Get films by category (JSON)
app.get('/api/kategori/:kategori', async (req, res) => {
    try {
        const rawKategori = req.params.kategori;
        const kategori = decodeURIComponent(rawKategori);

        // Merr te gjithe filmat dhe filtro ne server: ndaj Zhanri me '/' dhe kontrollo per perputhje
        const request = new sql.Request();
        const result = await request.query('SELECT * FROM Filmat ORDER BY Titulli');
        const all = result.recordset || [];
        const filtered = all.filter(f => {
            if (!f.Zhanri) return false;
            const parts = String(f.Zhanri).split('/').map(p => p.trim());
            return parts.includes(kategori);
        });

        res.json(filtered);
    } catch (err) {
        console.log('API kateg error', err);
        res.status(500).json({ error: 'Gabim ne server' });
    }
});

// Calendar functionality removed per request.

// Upcoming films (by Premiere_Date)
app.get('/upcoming', async (req, res) => {
    try {
        const request = new sql.Request();
        // Use parameterized IN by building a safe query with quoted literals (titles come from code)
        const inList = UPCOMING_ONLY_TITLES.map(t => "'" + t.replace("'", "''") + "'").join(',');
        const q = `SELECT * FROM Filmat WHERE Titulli IN (${inList}) ORDER BY Premiere_Date ASC`;
        const result = await request.query(q);
        res.render('upcoming', { filmat: result.recordset, user: req.session.user });
    } catch (err) {
        console.log('Upcoming error', err);
        res.send('Gabim ne server');
    }
});

// 2. Detajet e Filmit dhe Oraret
app.get('/filmi/:id', async (req, res) => {
    try {
        await cleanupExpiredShows();
        const id = req.params.id;
        const request = new sql.Request();
        request.input('id', sql.Int, id);
        const filmi = await request.query(`SELECT * FROM Filmat WHERE ID = @id`);
        
        if (filmi.recordset.length === 0) {
            return res.send("Filmi nuk u gjet!");
        }

        const titulli = filmi.recordset[0].Titulli;
        // Marrim oraret nga VIEW qe krijuam ne SQL
        const request2 = new sql.Request();
        request2.input('titulli', sql.NVarChar, titulli);
        request2.input('bookingCutoff', sql.DateTime, getBookingCutoff());
        const shfaqjetResult = await request2.query(`SELECT * FROM vw_Shfaqjet_Detaje WHERE Titulli = @titulli AND Data_Ora > @bookingCutoff`);
        const shfaqjetList = shfaqjetResult.recordset;

        // Get reservations for these shfaqja IDs so we can mark occupied seats in the UI
        let reservedMap = {};
        const shfaqjaIds = shfaqjetList.map(s => s.Shfaqja_ID).filter(Boolean);
        if (shfaqjaIds.length > 0) {
            const ids = shfaqjaIds.join(',');
            const resReq = new sql.Request();
            const reservedRows = await resReq.query(`SELECT Shfaqja_ID, Rreshti, Numri_Karriges FROM Rezervimet WHERE Statusi = 'Aktiv' AND Shfaqja_ID IN (${ids})`);
            for (const r of reservedRows.recordset) {
                const sid = r.Shfaqja_ID;
                const seat = String(r.Rreshti) + String(r.Numri_Karriges);
                if (!reservedMap[sid]) reservedMap[sid] = [];
                reservedMap[sid].push(seat);
            }
        }

        res.render('detajet', { filmi: filmi.recordset[0], shfaqjet: shfaqjetList, user: req.session.user, reservedMap });
    } catch (err) {
        console.log(err);
        res.send("Gabim gjate marrjes se detajeve te filmit.");
    }
});

// 3. Faqja e Logimit (Pamja)
app.get('/login', (req, res) => {
    res.render('login', { user: req.session.user });
});

// 3b. Faqja e Regjistrim (Pamja)
app.get('/register', (req, res) => {
    res.render('register', { user: req.session.user });
});

// 4. Logjika e Logimit
app.post('/login', async (req, res) => {
    try {
        const { email, fjalekalimi } = req.body;
        // Kontrollojme nese ekziston useri
        const request = new sql.Request();
        request.input('email', sql.NVarChar, email);
        request.input('fjalekalimi', sql.NVarChar, fjalekalimi);
        const result = await request.query(`SELECT * FROM Perdoruesit WHERE Email=@email AND Fjalekalimi=@fjalekalimi`);
        
        if (result.recordset.length > 0) {
            req.session.user = result.recordset[0]; // Ruajme te dhenat ne sesion
            
            // Nese eshte admin, dergoje te faqja e adminit, perndryshe te faqja kryesore
            if(req.session.user.Roli === 'Admin') {
                res.redirect('/admin');
            } else {
                res.redirect('/');
            }
        } else {
            res.send("Email ose Fjalekalimi i gabuar! <a href='/login'>Kthehu mbrapa</a>");
        }
    } catch (err) {
        console.log(err);
        res.send("Gabim gjate procesit te logimit.");
    }
});

// 4b. Logjika e Regjistrim
app.post('/register', async (req, res) => {
    try {
        const { emri, email, telefoni, fjalekalimi, fjalekalimi_confirm } = req.body;
        
        if (fjalekalimi !== fjalekalimi_confirm) {
            return res.send("Fjalëkalimet nuk përputhen! <a href='/register'>Kthehu mbrapa</a>");
        }

        // Kontrollojme nese email ekziston
        const checkRequest = new sql.Request();
        checkRequest.input('email', sql.NVarChar, email);
        const existing = await checkRequest.query(`SELECT * FROM Perdoruesit WHERE Email=@email`);
        
        if (existing.recordset.length > 0) {
            return res.send("Ky email është tashmë i regjistruar! <a href='/login'>Kyçu këtu</a>");
        }

        // Shto userin e ri
        const insertRequest = new sql.Request();
        insertRequest.input('emri', sql.NVarChar, emri);
        insertRequest.input('email', sql.NVarChar, email);
        insertRequest.input('telefoni', sql.NVarChar, telefoni);
        insertRequest.input('fjalekalimi', sql.NVarChar, fjalekalimi);
        insertRequest.input('roli', sql.NVarChar, 'Perdorues');
        await insertRequest.query(`
            INSERT INTO Perdoruesit (Emri, Email, Telefoni, Fjalekalimi, Roli)
            VALUES (@emri, @email, @telefoni, @fjalekalimi, @roli)
        `);
        
        res.send("<h1>Regjistrimi u krye me sukses!</h1><a href='/login'>Kyçu këtu</a>");
    } catch (err) {
        console.log(err);
        res.send("Gabim gjate regjistrit.");
    }
});

// 5. Faqja e Adminit (Leximi i Filmave per Adminin)
app.get('/admin', async (req, res) => {
    if (!req.session.user || req.session.user.Roli !== 'Admin') {
        return res.send("Nuk keni akses! <a href='/login'>Logohuni si Admin</a>");
    }
    
    try {
        await cleanupExpiredShows();
        const request = new sql.Request();
        const result = await request.query('SELECT * FROM Filmat ORDER BY ID DESC');
        const statusFilter = (req.query.status || 'Aktiv').trim();
        const searchQuery = (req.query.q || '').trim();
        const dateFilter = (req.query.date || '').trim();

        const upcomingSet = new Set(UPCOMING_ONLY_TITLES.map(t => t.toLowerCase()));
        const filmatPerShfaqje = (result.recordset || []).filter(f => !upcomingSet.has(String(f.Titulli || '').toLowerCase()));

        const statsReq = new sql.Request();
        const statsResult = await statsReq.query(`
            SELECT
                (SELECT COUNT(*) FROM Filmat) AS FilmatTotal,
                (SELECT COUNT(*) FROM Shfaqjet) AS ShfaqjetTotal,
                (SELECT COUNT(*) FROM Rezervimet WHERE Statusi = 'Aktiv') AS RezervimetAktive,
                (SELECT COUNT(*) FROM Rezervimet WHERE Statusi = 'Anuluar') AS RezervimetAnuluara,
                (SELECT COUNT(*) FROM Rezervimet) AS RezervimetTotal
        `);

        const hallsReq = new sql.Request();
        const hallsResult = await hallsReq.query('SELECT ID, Emri_Salles FROM Sallat ORDER BY ID');

        const showsReq = new sql.Request();
        const showsResult = await showsReq.query(`
            SELECT s.ID, s.Filmi_ID, s.Salla_ID, s.Data_Ora, s.Cmimi_Baze,
                   f.Titulli, sal.Emri_Salles
            FROM Shfaqjet s
            INNER JOIN Filmat f ON s.Filmi_ID = f.ID
            INNER JOIN Sallat sal ON s.Salla_ID = sal.ID
            ORDER BY s.Data_Ora DESC, s.ID DESC
        `);

        const resReq = new sql.Request();
        let whereClause = 'WHERE 1=1';

        if (statusFilter && statusFilter !== 'all') {
            resReq.input('status', sql.NVarChar, statusFilter);
            whereClause += ' AND r.Statusi = @status';
        }

        if (searchQuery) {
            resReq.input('search', sql.NVarChar, `%${searchQuery}%`);
            whereClause += ' AND (f.Titulli LIKE @search OR sall.Emri_Salles LIKE @search)';
        }

        if (dateFilter) {
            resReq.input('date', sql.Date, dateFilter);
            whereClause += ' AND CONVERT(date, s.Data_Ora) = @date';
        }

        const reservations = await resReq.query(`
            SELECT r.ID, r.Shfaqja_ID, r.Rreshti, r.Numri_Karriges, r.Tipi_Uleses, r.Statusi, r.Data_Rezervimit,
                   f.Titulli, s.Data_Ora, sall.Emri_Salles AS Emri_Salles
            FROM Rezervimet r
            INNER JOIN Shfaqjet s ON r.Shfaqja_ID = s.ID
            INNER JOIN Filmat f ON s.Filmi_ID = f.ID
            INNER JOIN Sallat sall ON s.Salla_ID = sall.ID
            ${whereClause}
            ORDER BY s.Data_Ora DESC, r.ID DESC
        `);

        res.render('admin', {
            filmat: result.recordset,
            filmatPerShfaqje,
            rezervimet: reservations.recordset || [],
            stats: statsResult.recordset[0] || {},
            filters: { status: statusFilter, q: searchQuery, date: dateFilter },
            sallat: hallsResult.recordset || [],
            shfaqjet: showsResult.recordset || []
        });
    } catch (err) {
        console.log("Gabim ne admin:", err);
        try {
            fs.appendFileSync('logs_errors.txt', `[${new Date().toISOString()}] ADMIN ERROR: ${err.stack || err}\n\n`);
        } catch (e) {
            console.log('Failed to write admin error log', e);
        }
        res.send("Gabim ne databaze.");
    }
});

// 5a. Shto/Fshi Shfaqje (Admin)
app.post('/admin/shto-shfaqje', async (req, res) => {
    if (!req.session.user || req.session.user.Roli !== 'Admin') return res.redirect('/');

    try {
        const { filmi_id, salla_id, data_date, data_time } = req.body;
        const filmiId = parseInt(filmi_id, 10);
        const sallaId = parseInt(salla_id, 10);
        const startDateTime = parseLocalDateTime(data_date, data_time);

        if (!filmiId || !sallaId || !startDateTime) {
            return res.send("Të dhënat e orarit janë të pavlefshme. <a href='/admin'>Kthehu mbrapa</a>");
        }

        if (startDateTime <= new Date()) {
            return res.send("Nuk lejohet shtimi i shfaqjeve në kohë të kaluar. <a href='/admin'>Kthehu mbrapa</a>");
        }

        if (!isStartTimeAllowed(startDateTime)) {
            return res.send("Shfaqja duhet të fillojë deri në 23:00. <a href='/admin'>Kthehu mbrapa</a>");
        }

        const hallReq = new sql.Request();
        hallReq.input('id', sql.Int, sallaId);
        const hallResult = await hallReq.query('SELECT ID, Emri_Salles FROM Sallat WHERE ID = @id');

        if (hallResult.recordset.length === 0) {
            return res.send("Salla nuk u gjet. <a href='/admin'>Kthehu mbrapa</a>");
        }

        const hall = hallResult.recordset[0];

        const filmReq = new sql.Request();
        filmReq.input('id', sql.Int, filmiId);
        const filmResult = await filmReq.query('SELECT ID, Titulli, Zhanri, Kohezgjatja_Min FROM Filmat WHERE ID = @id');

        if (filmResult.recordset.length === 0) {
            return res.send("Filmi nuk u gjet. <a href='/admin'>Kthehu mbrapa</a>");
        }

        const film = filmResult.recordset[0];

        if (isKidsHall(sallaId, hall.Emri_Salles) && !isAnimatedGenre(film.Zhanri)) {
            return res.send("Salla 4 (Kids) lejohet vetëm për filma të animuar/animacion. <a href='/admin'>Kthehu mbrapa</a>");
        }

        const filmDuration = parseInt(film.Kohezgjatja_Min, 10) || 0;
        const showEnd = addMinutes(startDateTime, filmDuration + 60);

        const conflictReq = new sql.Request();
        conflictReq.input('salla_id', sql.Int, sallaId);
        conflictReq.input('start_dt', sql.DateTime, startDateTime);
        conflictReq.input('end_dt', sql.DateTime, showEnd);
        const conflictResult = await conflictReq.query(`
            SELECT TOP 1 s.ID, s.Data_Ora, f.Titulli, f.Kohezgjatja_Min
            FROM Shfaqjet s
            INNER JOIN Filmat f ON s.Filmi_ID = f.ID
            WHERE s.Salla_ID = @salla_id
              AND @start_dt < DATEADD(minute, ISNULL(f.Kohezgjatja_Min, 0) + 60, s.Data_Ora)
              AND @end_dt > s.Data_Ora
            ORDER BY s.Data_Ora ASC
        `);

        if (conflictResult.recordset.length > 0) {
            const conflict = conflictResult.recordset[0];
            return res.send(`
                <html lang="sq">
                <head>
                    <link rel="stylesheet" href="/style.css">
                    <title>Orari i Zënë</title>
                </head>
                <body>
                    <div class="container">
                        <div class="success-container">
                            <h1>⚠️ Salla është e zënë</h1>
                            <p>Kjo sallë ka tashmë një shfaqje që mbivendoset me këtë orar.</p>
                            <p><strong>Shfaqja ekzistuese:</strong> ${conflict.Titulli}</p>
                            <p><strong>Nis:</strong> ${formatDateTime24(conflict.Data_Ora)}</p>
                            <a href="/admin" class="btn-back" style="display:inline-block; margin-top:20px;">← Kthehu Mbrapa</a>
                        </div>
                    </div>
                </body>
                </html>
            `);
        }

        const insertReq = new sql.Request();
        insertReq.input('filmi_id', sql.Int, filmiId);
        insertReq.input('salla_id', sql.Int, sallaId);
        insertReq.input('data_ora', sql.DateTime, startDateTime);
        const hallPrice = getHallPricing(sallaId, hall.Emri_Salles);
        insertReq.input('cmimi_baze', sql.Decimal(10, 2), hallPrice.regular);
        await insertReq.query(`
            INSERT INTO Shfaqjet (Filmi_ID, Salla_ID, Data_Ora, Cmimi_Baze)
            VALUES (@filmi_id, @salla_id, @data_ora, @cmimi_baze)
        `);

        res.redirect('/admin');
    } catch (err) {
        console.log('Gabim ne shtim te shfaqjes:', err);
        res.send("Gabim gjate shtimit te shfaqjes. <a href='/admin'>Kthehu mbrapa</a>");
    }
});

app.post('/admin/fshi-shfaqje/:id', async (req, res) => {
    if (!req.session.user || req.session.user.Roli !== 'Admin') return res.redirect('/');

    try {
        const id = parseInt(req.params.id, 10);
        const request = new sql.Request();
        request.input('id', sql.Int, id);
        await request.query('DELETE FROM Shfaqjet WHERE ID = @id');
        res.redirect('/admin');
    } catch (err) {
        console.log('Gabim ne fshirje te shfaqjes:', err);
        res.send("Gabim gjate fshirjes se shfaqjes. <a href='/admin'>Kthehu mbrapa</a>");
    }
});

// 5b. Rezervimet e mia
app.get('/my-reservations', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        await cleanupExpiredShows();
        console.log('My reservations: session user ->', req.session.user);

        // Support a few possible ID field names in the session object
        const sessUser = req.session.user || {};
        const userIdCandidate = sessUser.ID || sessUser.Id || sessUser.id || sessUser.Perdoruesi_ID;
        if (!userIdCandidate) {
            console.log('My reservations: missing user ID in session', sessUser);
            return res.send('Gabim: sesioni i përdoruesit nuk përmban ID. Ju lutem hyni përsëri.');
        }
        const userId = parseInt(userIdCandidate, 10);
        if (isNaN(userId)) {
            console.log('My reservations: invalid userId', userIdCandidate);
            return res.send('Gabim: ID e përdoruesit e pasaktë në sesion.');
        }

        const request = new sql.Request();
        request.input('userId', sql.Int, userId);

        const reservations = await request.query(`
            SELECT r.ID, r.Shfaqja_ID, r.Rreshti, r.Numri_Karriges, r.Tipi_Uleses, r.Statusi, r.Data_Rezervimit,
                   f.Titulli, s.Data_Ora, sall.Emri_Salles AS Emri_Salles
            FROM Rezervimet r
            INNER JOIN Shfaqjet s ON r.Shfaqja_ID = s.ID
            INNER JOIN Filmat f ON s.Filmi_ID = f.ID
            INNER JOIN Sallat sall ON s.Salla_ID = sall.ID
            WHERE r.Perdoruesi_ID = @userId
            ORDER BY s.Data_Ora DESC, r.ID DESC
        `);

        const stats = {
            total: reservations.recordset.length,
            aktive: reservations.recordset.filter(r => r.Statusi === 'Aktiv').length,
            anuluara: reservations.recordset.filter(r => r.Statusi === 'Anuluar').length
        };

        res.render('my-reservations', {
            reservations: reservations.recordset || [],
            stats,
            user: req.session.user
        });
    } catch (err) {
        console.log('My reservations error', err);
        res.send('Gabim gjate marrjes se rezervimeve tuaja.');
    }
});

app.get('/rezervimet-e-mia', (req, res) => res.redirect('/my-reservations'));

// 5c. Rreth projektit / si funksionon
app.get('/about', (req, res) => {
    res.render('about', { user: req.session.user });
});

// 8. CRUD: Shto Film të ri (CREATE)
app.post('/admin/shto-film', async (req, res) => {
    if (!req.session.user || req.session.user.Roli !== 'Admin') return res.redirect('/');
    
    try {
        const { titulli, zhanri, kohezgjatja, poster, pershkrimi } = req.body;
        const request = new sql.Request();
        request.input('titulli', sql.NVarChar, titulli);
        request.input('zhanri', sql.NVarChar, zhanri);
        request.input('kohezgjatja', sql.Int, parseInt(kohezgjatja, 10));
        request.input('poster', sql.NVarChar, poster);
        request.input('pershkrimi', sql.NVarChar, pershkrimi);
        await request.query(`
            INSERT INTO Filmat (Titulli, Zhanri, Kohezgjatja_Min, PosterURL, Pershkrimi)
            VALUES (@titulli, @zhanri, @kohezgjatja, @poster, @pershkrimi)
        `);
        res.redirect('/admin'); // Rifreskon faqen e adminit
    } catch (err) {
        console.log(err);
        res.send("Gabim gjate shtimit.");
    }
});

// 9. CRUD: Fshi Film (DELETE)
app.post('/admin/fshi-film/:id', async (req, res) => {
    if (!req.session.user || req.session.user.Roli !== 'Admin') return res.redirect('/');
    
    try {
        const id = req.params.id;
        // Meqenese kemi 'ON DELETE CASCADE' ne databaze, fshirja e filmit 
        // do te fshije automatikisht edhe shfaqjet dhe rezervimet e atij filmi!
        const request = new sql.Request();
        request.input('id', sql.Int, id);
        await request.query(`DELETE FROM Filmat WHERE ID = @id`);
        res.redirect('/admin');
    } catch (err) {
        res.send("Gabim gjate fshirjes.");
    }
});

// 10. CRUD: Ndrysho Film (UPDATE)
app.post('/admin/ndrysho-film', async (req, res) => {
    if (!req.session.user || req.session.user.Roli !== 'Admin') return res.redirect('/');
    
    try {
        const { film_id, titulli, zhanri, kohezgjatja, poster, pershkrimi } = req.body;
        const request = new sql.Request();
        request.input('id', sql.Int, film_id);
        request.input('titulli', sql.NVarChar, titulli);
        request.input('zhanri', sql.NVarChar, zhanri);
        request.input('kohezgjatja', sql.Int, parseInt(kohezgjatja, 10));
        request.input('poster', sql.NVarChar, poster);
        request.input('pershkrimi', sql.NVarChar, pershkrimi);
        await request.query(`
            UPDATE Filmat 
            SET Titulli = @titulli, Zhanri = @zhanri, Kohezgjatja_Min = @kohezgjatja, PosterURL = @poster, Pershkrimi = @pershkrimi
            WHERE ID = @id
        `);
        res.redirect('/admin');
    } catch (err) {
        console.log(err);
        res.send("Gabim gjate ndryshimit.");
    }
});

// 10b. Admin: Anulo Rezervim
app.post('/admin/anulo-rezervim/:id', async (req, res) => {
    if (!req.session.user || req.session.user.Roli !== 'Admin') return res.redirect('/');

    try {
        const id = req.params.id;
        const request = new sql.Request();
        request.input('id', sql.Int, id);
        await request.query(`UPDATE Rezervimet SET Statusi = 'Anuluar' WHERE ID = @id`);
        res.redirect('/admin');
    } catch (err) {
        console.log(err);
        res.send("Gabim gjate anulimit te rezervimit.");
    }
});

// 10c. Anulo Bilete nga Success Page
app.post('/anulo-bilete/:id', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).send("Duhet të kyçeni për të anuluar një rezervim. <a href='/login'>Kyçu këtu</a>");
        }

        const id = req.params.id;
        const request = new sql.Request();
        request.input('id', sql.Int, id);
        
        // Marrim detajet para se ta anulojmë
        const detailsReq = new sql.Request();
        detailsReq.input('id', sql.Int, id);
        const detailsResult = await detailsReq.query(`
            SELECT r.ID, r.Perdoruesi_ID, r.Rreshti, r.Numri_Karriges, f.Titulli, s.Data_Ora, sal.Emri_Salles AS Emri_Salles, r.Statusi
            FROM Rezervimet r
            INNER JOIN Shfaqjet s ON r.Shfaqja_ID = s.ID
            INNER JOIN Filmat f ON s.Filmi_ID = f.ID
            INNER JOIN Sallat sal ON s.Salla_ID = sal.ID
            WHERE r.ID = @id
        `);

        if (detailsResult.recordset.length === 0) {
            return res.send("Bileta nuk u gjet!");
        }

        const details = detailsResult.recordset[0];

        if (req.session.user.Roli !== 'Admin' && details.Perdoruesi_ID !== req.session.user.ID) {
            return res.status(403).send("Nuk keni autorizim për ta anuluar këtë rezervim.");
        }

        if (details.Statusi !== 'Aktiv') {
            return res.send("Ky rezervim është tashmë i anuluar.");
        }
        
        // Anulo rezervimin
        await request.query(`UPDATE Rezervimet SET Statusi = 'Anuluar' WHERE ID = @id`);

        res.render('cancelled', {
            filmi: details.Titulli,
            salla: details.Emri_Salles,
            ulesa: String(details.Rreshti) + String(details.Numri_Karriges)
        });
    } catch (err) {
        console.log(err);
        res.send("Gabim gjate anulimit te biletave. <a href='/'>Kthehu mbrapa</a>");
    }
});

// 6. Rruga për Rezervim (POST)
app.post('/rezervo', async (req, res) => {
    try {
        await cleanupExpiredShows();
        const { shfaqja_id, uleset, email, telefoni } = req.body;
        
        let perdoruesi_id = null;
        let kontakti = null;

        if (req.session.user) {
            perdoruesi_id = req.session.user.ID;
            kontakti = req.session.user.Email;
        } else if (telefoni) {
            kontakti = telefoni;
        } else {
            return res.send("Duhet të jeni të loguar ose të dhënë numrin e telefonit! <a href='/login'>Kyçu këtu</a>");
        }

        const ulesetArray = uleset.split(',').filter(u => u.trim());
        
        if (ulesetArray.length === 0) {
            return res.send("Ju duhet të zgjidhni të paktën një ulëse! <a href='/'>Kthehu mbrapa</a>");
        }

        // Marrim detajet e shfaqjes
        const detailsReq = new sql.Request();
        detailsReq.input('shfaqja_id', sql.Int, parseInt(shfaqja_id, 10));
        const shfaqjaData = await detailsReq.query(`
            SELECT s.ID, s.Salla_ID, s.Data_Ora, f.Titulli, sal.Emri_Salles AS Emri_Salles
            FROM Shfaqjet s
            INNER JOIN Filmat f ON s.Filmi_ID = f.ID
            INNER JOIN Sallat sal ON s.Salla_ID = sal.ID
            WHERE s.ID = @shfaqja_id
        `);

        if (shfaqjaData.recordset.length === 0) {
            return res.send("Shfaqja nuk u gjet!");
        }

        const shfaqje = shfaqjaData.recordset[0];
        const filmi = shfaqje.Titulli;
        const salla = shfaqje.Emri_Salles;
        const showStart = new Date(shfaqje.Data_Ora);
        const showDurationReq = new sql.Request();
        showDurationReq.input('shfaqja_id', sql.Int, parseInt(shfaqja_id, 10));
        const showDurationResult = await showDurationReq.query(`
            SELECT ISNULL(f.Kohezgjatja_Min, 0) AS Kohezgjatja_Min
            FROM Shfaqjet s
            INNER JOIN Filmat f ON s.Filmi_ID = f.ID
            WHERE s.ID = @shfaqja_id
        `);
        const filmDuration = showDurationResult.recordset.length > 0 ? parseInt(showDurationResult.recordset[0].Kohezgjatja_Min, 10) || 0 : 0;
        const bookingCutoff = getBookingCutoff(showStart);
        const showEnd = addMinutes(showStart, filmDuration + 60);
        const now = new Date();

        if (now >= bookingCutoff || now >= showEnd) {
            return res.send(`
                <html lang="sq">
                <head>
                    <link rel="stylesheet" href="/style.css">
                    <title>Rezervimi është mbyllur</title>
                </head>
                <body>
                    <header>
                        <a href="/" class="logo">Kinema AAB</a>
                    </header>
                    <div class="container">
                        <div class="success-container">
                            <h1>⚠️ Rezervimi është mbyllur</h1>
                            <p>Ky termin nuk mund të rezervohet më.</p>
                            <p>Rezervimet mbyllen 1 minutë para fillimit të filmit.</p>
                            <a href="javascript:history.back()" class="btn-back" style="display:inline-block; margin-top:20px;">← Kthehu Mbrapa</a>
                        </div>
                    </div>
                </body>
                </html>
            `);
        }

        const termin = new Date(shfaqje.Data_Ora).toLocaleString('sq-AL', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        let lastInsertedId = null;

        // Rezervim atomik me transaksion: parandalon race condition kur dy usera klikojnë njëkohësisht.
        const conflictSeats = [];
        let transaction = null;
        try {
            transaction = new sql.Transaction();
            await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

            for (const ulesja of ulesetArray) {
                const rreshti = ulesja[0];
                const numri = parseInt(ulesja.substring(1), 10);
                const tipi = (rreshti === 'E') ? 'VIP' : 'Regular';

                const insertReq = new sql.Request(transaction);
                insertReq.input('perdoruesi_id', sql.Int, perdoruesi_id);
                insertReq.input('shfaqja_id', sql.Int, parseInt(shfaqja_id, 10));
                insertReq.input('rreshti', sql.Char, rreshti);
                insertReq.input('numri', sql.Int, numri);
                insertReq.input('tipi', sql.NVarChar, tipi);

                const insertResult = await insertReq.query(`
                    INSERT INTO Rezervimet (Perdoruesi_ID, Shfaqja_ID, Rreshti, Numri_Karriges, Tipi_Uleses, Statusi)
                    OUTPUT inserted.ID
                    SELECT @perdoruesi_id, @shfaqja_id, @rreshti, @numri, @tipi, 'Aktiv'
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM Rezervimet WITH (UPDLOCK, HOLDLOCK)
                        WHERE Shfaqja_ID = @shfaqja_id
                          AND Rreshti = @rreshti
                          AND Numri_Karriges = @numri
                          AND Statusi = 'Aktiv'
                    )
                `);

                if (!insertResult.rowsAffected || insertResult.rowsAffected[0] === 0) {
                    conflictSeats.push(ulesja);
                    break;
                }

                lastInsertedId = insertResult.recordset[0].ID;
            }

            if (conflictSeats.length > 0) {
                await transaction.rollback();
                return res.send(`
                    <html lang="sq">
                    <head>
                        <link rel="stylesheet" href="/style.css">
                        <title>Gabim Rezervimi</title>
                    </head>
                    <body>
                        <header>
                            <a href="/" class="logo">Kinema AAB</a>
                        </header>
                        <div class="container">
                            <div class="success-container">
                                <h1>⚠️ Gabim - Ulëset e Zëna</h1>
                                <p>Një user tjetër i rezervoi para jush këto ulëse:</p>
                                <p style="color: #ff1a1a; font-weight: 600; font-size: 18px;">${conflictSeats.join(', ')}</p>
                                <p>Ju lutem rifreskoni ulëset dhe provoni përsëri.</p>
                                <a href="javascript:history.back()" class="btn-back" style="display: inline-block; margin-top: 20px;">← Kthehu Mbrapa</a>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
            }

            await transaction.commit();
        } catch (txErr) {
            if (transaction) {
                try {
                    await transaction.rollback();
                } catch (rollbackErr) {
                    console.log('Rollback error:', rollbackErr);
                }
            }
            throw txErr;
        }

        // Kalkuloj çmimin (EUR) sipas sallës dhe tipit të ulëses
        const hallPricing = getHallPricing(parseInt(shfaqje.Salla_ID, 10), shfaqje.Emri_Salles);
        let cmimi = 0;
        for (let u of ulesetArray) {
            cmimi += (u[0] === 'E') ? hallPricing.vip : hallPricing.regular;
        }

        res.render('success', {
            kontakti: kontakti,
            filmi: filmi,
            salla: salla,
            termin: termin,
            uleset: ulesetArray.join(', '),
            cmimi: cmimi,
            rezervimiID: lastInsertedId || 0,
            allowCancel: !!req.session.user
        }, (err, html) => {
            if (err) {
                console.log('Render Error:', err);
                return res.send(`<h1>Error rendering page</h1><p>${err.message}</p>`);
            }
            res.send(html);
        });
    } catch (err) {
        console.log('Catch Error:', err);
        console.log('Error Stack:', err.stack);
        res.send("Gabim gjatë rezervimit. Sigurohuni që keni zgjedhur ulëset. <a href='/'>Kthehu mbrapa</a>");
    }
});

// 7. Rruga për Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Ndezja e Serverit
app.listen(3000, () => {
    console.log('Serveri po punon ne http://localhost:3000');
});

// 1e. Search
app.get('/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        const request = new sql.Request();
        request.input('q', sql.NVarChar, `%${q}%`);
        const result = await request.query('SELECT * FROM Filmat WHERE Titulli LIKE @q');
        res.render('search', { filmat: result.recordset, q, user: req.session.user });
    } catch (err) {
        console.log(err);
        res.send("Gabim gjatë kërkimit.");
    }
});

// API: list available categories (distinct genres)
app.get('/api/kategorit', async (req, res) => {
    try {
        const request = new sql.Request();
        const result = await request.query('SELECT DISTINCT Zhanri FROM Filmat');
        const raw = result.recordset.map(r => r.Zhanri).filter(Boolean);

        // Flatten zhanre qe jane te ndara me '/' dhe ruaj si set unike
        const set = new Set();
        for (const z of raw) {
            const parts = String(z).split('/').map(p => p.trim()).filter(Boolean);
            for (const p of parts) {
                const norm = p.normalize('NFC').trim();
                const lower = norm.toLowerCase();

                // Remove any 'Dramë' variant entirely, but keep plain 'Drama'
                if (lower === 'dramë') {
                    continue; // drop this variant
                }

                // Normalize 'Aventur' to 'Aventure' (no diacritic)
                if (lower === 'aventur') {
                    set.add('Aventure');
                    continue;
                }

                // Normalize plain 'drama' to capitalized 'Drama'
                if (lower === 'drama') {
                    set.add('Drama');
                    continue;
                }

                // Otherwise keep the original trimmed value (preserve accents/casing)
                set.add(norm);
            }
        }
        const genres = Array.from(set).sort((a,b) => a.localeCompare(b, 'sq'));
        res.json(genres);
    } catch (err) {
        console.log('API kategorit error', err);
        res.status(500).json({ error: 'Gabim ne server' });
    }
});