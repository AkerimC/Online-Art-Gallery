const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
// Statik dosyaları src/public klasöründen sun
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Database - src/server klasörü içinde oluştur
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to SQLite database.');
});

// SQLite'ta Foreign Key desteğini açmak için
db.run('PRAGMA foreign_keys = ON;');

// Seed DB
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Artworks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, artist TEXT, price REAL, category TEXT, image TEXT, description TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Workshops (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, date TEXT, time TEXT, price REAL, capacity INTEGER, booked INTEGER, instructor TEXT, description TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, subject TEXT, message TEXT, status TEXT,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, refId INTEGER, type TEXT, user_id INTEGER, user_name TEXT, text TEXT, rating INTEGER, upvotes INTEGER DEFAULT 0, downvotes INTEGER DEFAULT 0, admin_reply TEXT,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, artwork_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (artwork_id) REFERENCES Artworks(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, workshop_id INTEGER, title TEXT, date TEXT, time TEXT, participants INTEGER, total REAL, status TEXT,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (workshop_id) REFERENCES Workshops(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, total REAL, status TEXT,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS OrderItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, item_type TEXT, item_id INTEGER, title TEXT, price REAL,
        FOREIGN KEY (order_id) REFERENCES Orders(id) ON DELETE CASCADE
    )`);

    // --- YENİ EKLENEN TABLOLAR (Kuponlar ve Karşılaştırmalar) ---
    db.run(`CREATE TABLE IF NOT EXISTS Coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, discount_percent INTEGER, is_active INTEGER DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS SavedComparisons (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, item_ids_json TEXT,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )`);

    // Insert Default Admin if not exists
    db.get('SELECT id FROM Users WHERE email = ?', ['admin@aura.com'], (err, row) => {
        if (!row && !err) {
            db.run(`INSERT INTO Users (name, email, password, role) VALUES ('Admin', 'admin@aura.com', 'admin123', 'admin')`);
            console.log("Seeding mock admin.");
        }
    });

    // Örnek bir İndirim Kuponu ekleyelim (%20 indirim sağlayan AURA20 kodu)
    db.get('SELECT id FROM Coupons WHERE code = ?', ['AURA20'], (err, row) => {
        if (!row && !err) {
            db.run(`INSERT INTO Coupons (code, discount_percent) VALUES ('AURA20', 20)`);
        }
    });

    db.get('SELECT COUNT(*) as count FROM Artworks', [], (err, row) => {
        if(row && row.count === 0) {
            db.run(`INSERT INTO Artworks (title, artist, price, category, image, description) VALUES
            ('Neon Dreams', 'Elena R.', 1200, 'Digital', 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80', 'A vibrant exploration of neon lights.'),
            ('Abstract Silence', 'Michael T.', 850, 'Painting', 'https://images.unsplash.com/photo-1501472312651-726afe119ff1?auto=format&fit=crop&w=600&q=80', 'Deep textures that evoke quiet.'),
            ('Urban Geometry', 'Sarah L.', 2100, 'Photography', 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=600&q=80', 'Architectural lines capturing the essence of the city.')
            `);
            
            db.run(`INSERT INTO Workshops (title, date, time, price, capacity, booked, instructor, description) VALUES
            ('Mastering Digital Art', '2026-05-10', '14:00', 150, 20, 5, 'Elena R.', 'Learn advanced techniques.'),
            ('Photography Basics', '2026-05-15', '10:00', 100, 15, 15, 'Sarah L.', 'Understand lighting and camera.')
            `);
            
            db.run(`INSERT INTO Tickets (subject, message, status) VALUES ('Where is my painting?', 'I bought Neon dreams yesterday!', 'open')`);
        }
    });
});

// ==== ENDPOINTS ====

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT id, name, email, role FROM Users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
        if(err) return res.status(500).json({error: err.message});
        if(!row) return res.status(401).json({error: 'Invalid credentials'});
        res.json({ user: row });
    });
});

app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    db.run(`INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, 'customer')`, [name, email, password], function(err) {
        if(err) return res.status(400).json({error: 'Email already exists'});
        res.json({ message: 'User registered successfully!' });
    });
});
// --- PROFIL VE ŞİFRE GÜNCELLEME (Madde 7) ---

// Profil Bilgilerini Güncelleme
app.put('/api/users/:id', (req, res) => {
    const { name, email } = req.body;
    db.run(`UPDATE Users SET name = ?, email = ? WHERE id = ?`, [name, email, req.params.id], function(err) {
        if(err) return res.status(400).json({error: 'E-posta zaten kullanımda olabilir veya bir hata oluştu.'});
        res.json({ success: true, name, email });
    });
});

// Şifre Değiştirme
app.put('/api/users/:id/password', (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    db.get(`SELECT password FROM Users WHERE id = ?`, [req.params.id], (err, row) => {
        if (err || !row) return res.status(500).json({error: 'Kullanıcı bulunamadı'});
        if (row.password !== currentPassword) return res.status(401).json({error: 'Mevcut şifreniz yanlış!'});
        
        db.run(`UPDATE Users SET password = ? WHERE id = ?`, [newPassword, req.params.id], function(err) {
            if(err) return res.status(500).json({error: 'Şifre güncellenemedi'});
            res.json({ success: true });
        });
    });
});
// --- KUPON VE İNDİRİM (Madde 9) ---
app.post('/api/coupons/validate', (req, res) => {
    const { code } = req.body;
    db.get(`SELECT discount_percent FROM Coupons WHERE code = ? AND is_active = 1`, [code], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Invalid or expired coupon' });
        
        res.json({ success: true, discount: row.discount_percent });
    });
});
// --- KARŞILAŞTIRMA SİSTEMİ (Madde 11) ---

// 1. Karşılaştırma Sonucunu Kaydetme
app.post('/api/comparisons', (req, res) => {
    const { user_id, type, item_ids } = req.body;
    const item_ids_json = JSON.stringify(item_ids); // ID dizisini metne çevirip saklıyoruz
    
    db.run(`INSERT INTO SavedComparisons (user_id, type, item_ids_json) VALUES (?, ?, ?)`, 
    [user_id, type, item_ids_json], function(err) {
        if(err) return res.status(500).json({error: 'Karşılaştırma kaydedilemedi.'});
        res.json({ success: true });
    });
});

// 2. Kullanıcının Kayıtlı Karşılaştırmalarını Listeleme (Profil sayfası için)
app.get('/api/comparisons/:userId', (req, res) => {
    db.all(`SELECT * FROM SavedComparisons WHERE user_id = ?`, [req.params.userId], (err, rows) => {
        if(err) return res.status(500).json({error: 'Veritabanı hatası.'});
        res.json(rows || []);
    });
});
// --- YORUM, DEĞERLENDİRME VE YANIT SİSTEMİ (Madde 13 & 14) ---

// 1. Bir esere/atölyeye ait yorumları getirme
app.get('/api/comments/:type/:refId', (req, res) => {
    db.all(`SELECT * FROM Comments WHERE type = ? AND refId = ? ORDER BY id DESC`, 
    [req.params.type, req.params.refId], (err, rows) => {
        if(err) return res.status(500).json({error: 'Veritabanı hatası'});
        res.json(rows || []);
    });
});

// 2. Yeni Yorum ve Puan (Rating) Ekleme
app.post('/api/comments', (req, res) => {
    const { refId, type, user_id, user_name, text, rating } = req.body;
    db.run(`INSERT INTO Comments (refId, type, user_id, user_name, text, rating) VALUES (?, ?, ?, ?, ?, ?)`,
    [refId, type, user_id, user_name, text, rating], function(err) {
        if(err) return res.status(500).json({error: 'Yorum eklenemedi'});
        res.json({ success: true, commentId: this.lastID });
    });
});

// 3. Yorumu Faydalı Bulma (Upvote / Downvote)
app.post('/api/comments/:id/vote', (req, res) => {
    const { voteType } = req.body; // 'up' veya 'down' gelecek
    const column = voteType === 'up' ? 'upvotes' : 'downvotes';
    
    db.run(`UPDATE Comments SET ${column} = ${column} + 1 WHERE id = ?`, [req.params.id], function(err) {
        if(err) return res.status(500).json({error: 'Oylama başarısız'});
        res.json({ success: true });
    });
});

// 4. Yöneticinin (Admin) Yoruma Yanıt Vermesi
app.post('/api/comments/:id/reply', (req, res) => {
    const { reply } = req.body;
    db.run(`UPDATE Comments SET admin_reply = ? WHERE id = ?`, [reply, req.params.id], function(err) {
        if(err) return res.status(500).json({error: 'Yanıt eklenemedi'});
        res.json({ success: true });
    });
});

app.get('/api/artworks', (req, res) => {
    db.all(`SELECT * FROM Artworks`, [], (err, rows) => {
        res.json(rows || []);
    });
});

app.get('/api/workshops', (req, res) => {
    db.all(`SELECT * FROM Workshops`, [], (err, rows) => {
        res.json(rows || []);
    });
});

app.get('/api/comments/:type/:id', (req, res) => {
    db.all(`SELECT * FROM Comments WHERE type = ? AND refId = ?`, [req.params.type, req.params.id], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/comments', (req, res) => {
    const { refId, type, user, text, rating } = req.body;
    db.run(`INSERT INTO Comments (refId, type, user, text, rating) VALUES (?, ?, ?, ?, ?)`, [refId, type, user, text, rating], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ success: true });
    });
});

// --- DESTEK TALEBİ (TICKETS) SİSTEMİ ---

// 1. Yeni Destek Talebi Oluşturma (user_id eklendi)
app.post('/api/tickets', (req, res) => {
    const { user_id, subject, message } = req.body;
    db.run(`INSERT INTO Tickets (user_id, subject, message, status) VALUES (?, ?, ?, 'Open')`, 
    [user_id, subject, message], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ success: true });
    });
});

// 2. Admin İçin Tüm Talepleri Getirme
app.get('/api/tickets', (req, res) => {
    db.all(`SELECT * FROM Tickets ORDER BY id DESC`, [], (err, rows) => {
        res.json(rows || []);
    });
});

// 3. Sadece O Kullanıcıya Ait Talepleri Getirme (Profil için)
app.get('/api/tickets/user/:userId', (req, res) => {
    db.all(`SELECT * FROM Tickets WHERE user_id = ? ORDER BY id DESC`, [req.params.userId], (err, rows) => {
        res.json(rows || []);
    });
});


// Favorites endpoints
app.get('/api/favorites/:userId', (req, res) => {
    db.all(`SELECT artwork_id FROM Favorites WHERE user_id = ?`, [req.params.userId], (err, rows) => {
        res.json(rows ? rows.map(r => r.artwork_id) : []);
    });
});

app.post('/api/favorites', (req, res) => {
    const { user_id, artwork_id } = req.body;
    db.run(`INSERT INTO Favorites (user_id, artwork_id) VALUES (?, ?)`, [user_id, artwork_id], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ success: true, id: this.lastID });
    });
});

app.delete('/api/favorites/:userId/:artworkId', (req, res) => {
    db.run(`DELETE FROM Favorites WHERE user_id = ? AND artwork_id = ?`, [req.params.userId, req.params.artworkId], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ success: true });
    });
});

// Reservations endpoints
app.get('/api/reservations/:userId', (req, res) => {
    db.all(`SELECT * FROM Reservations WHERE user_id = ?`, [req.params.userId], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/reservations', (req, res) => {
    const { user_id, workshop_id, title, date, time, participants, total } = req.body;
    db.run(`INSERT INTO Reservations (user_id, workshop_id, title, date, time, participants, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')`, 
        [user_id, workshop_id, title, date, time, participants, total], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ success: true, id: this.lastID });
    });
});

app.put('/api/reservations/:id', (req, res) => {
    const { participants, total, date, time } = req.body;
    db.run(`UPDATE Reservations SET participants = ?, total = ?, date = ?, time = ? WHERE id = ?`, [participants, total, date, time, req.params.id], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ success: true });
    });
});

app.put('/api/reservations/cancel/:id', (req, res) => {
    db.run(`UPDATE Reservations SET status = 'Cancelled' WHERE id = ?`, [req.params.id], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({ success: true });
    });
});

// Orders endpoints
// --- KULLANICININ SİPARİŞLERİNİ GETİRME ---
app.get('/api/orders/:userId', (req, res) => {
    db.all(`SELECT * FROM Orders WHERE user_id = ? ORDER BY id DESC`, [req.params.userId], (err, rows) => {
        if(err) return res.status(500).json({error: 'Veritabanı hatası'});
        res.json(rows || []);
    });
});
app.post('/api/orders', (req, res) => {
    const { user_id, total, items } = req.body; 
    db.run(`INSERT INTO Orders (user_id, total, status) VALUES (?, ?, 'Paid')`, [user_id, total], function(err) {
        if(err) return res.status(500).json({error: err.message});
        const orderId = this.lastID;
        const stmt = db.prepare(`INSERT INTO OrderItems (order_id, item_type, item_id, title, price) VALUES (?, ?, ?, ?, ?)`);
        items.forEach(item => {
            stmt.run(orderId, item.type, item.id, item.title, item.price);
        });
        stmt.finalize();
        res.json({ success: true, orderId });
    });
});

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
    let stats = { sales: 0, reservations: 0 };
    db.get(`SELECT SUM(total) as t FROM Orders WHERE status = 'Paid'`, [], (err, row) => {
        if(row && row.t) stats.sales = row.t;
        db.get(`SELECT COUNT(*) as c FROM Reservations WHERE status = 'Active'`, [], (err2, row2) => {
            if(row2 && row2.c) stats.reservations = row2.c;
            res.json(stats);
        });
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;