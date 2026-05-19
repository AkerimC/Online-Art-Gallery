const express = require('express');
const sqlite3 = require('sqlite3').verbose();


const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
    if (err) console.error(err.message);
});

db.run('PRAGMA foreign_keys = ON;');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS Artworks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, artist TEXT, price REAL, category TEXT, image TEXT, description TEXT, views INTEGER DEFAULT 0, is_sold INTEGER DEFAULT 0, is_campaign INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS Workshops (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, date TEXT, time TEXT, price REAL, capacity INTEGER, booked INTEGER DEFAULT 0, instructor TEXT, description TEXT, views INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS Orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, total REAL, status TEXT, payment_method TEXT, FOREIGN KEY (user_id) REFERENCES Users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS OrderItems (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, item_type TEXT, item_id INTEGER, title TEXT, price REAL, FOREIGN KEY (order_id) REFERENCES Orders(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS Reservations (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, workshop_id INTEGER, title TEXT, date TEXT, time TEXT, participants INTEGER, total REAL, status TEXT, FOREIGN KEY (user_id) REFERENCES Users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS Comments (id INTEGER PRIMARY KEY AUTOINCREMENT, refId INTEGER, type TEXT, user_id INTEGER, user_name TEXT, text TEXT, rating INTEGER, upvotes INTEGER DEFAULT 0, downvotes INTEGER DEFAULT 0, admin_reply TEXT, FOREIGN KEY (user_id) REFERENCES Users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS Favorites (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, artwork_id INTEGER, FOREIGN KEY (user_id) REFERENCES Users(id), FOREIGN KEY (artwork_id) REFERENCES Artworks(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS Coupons (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, discount_percent INTEGER, is_active INTEGER DEFAULT 1)`);
    db.run(`CREATE TABLE IF NOT EXISTS Tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, subject TEXT, message TEXT, status TEXT DEFAULT 'Open', admin_reply TEXT, created_at TEXT DEFAULT (datetime('now')))`);
    db.run(`CREATE TABLE IF NOT EXISTS Comparisons (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, item_ids TEXT)`);

    // Seed Admin
    db.get('SELECT id FROM Users WHERE email = ?', ['admin@aura.com'], (err, row) => {
        if (!row) db.run(`INSERT INTO Users (name, email, password, role) VALUES ('Admin', 'admin@aura.com', 'admin123', 'admin')`);
    });
    // Seed a coupon
    db.get('SELECT id FROM Coupons WHERE code = ?', ['AURA20'], (err, row) => {
        if (!row) db.run(`INSERT INTO Coupons (code, discount_percent, is_active) VALUES ('AURA20', 20, 1)`);
    });
    // Ensure admin password is deterministic during tests
    if (process.env.NODE_ENV === 'test') {
        db.run(`UPDATE Users SET password = 'admin123' WHERE email = 'admin@aura.com'`);
    }
});

// --- API ENDPOINTS ---

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM Users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
        if (!row) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ user: row });
    });
});

app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    db.run(`INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, 'customer')`, [name, email, password], (err) => {
        if (err) return res.status(400).json({ error: 'Email exists' });
        res.json({ success: true });
    });
});

app.get('/api/artworks', (req, res) => {
    db.all(`SELECT * FROM Artworks`, (err, rows) => res.json(rows || []));
});

// Artwork rating summary
app.get('/api/artworks/:id/rating', (req, res) => {
    const id = req.params.id;
    db.get(`SELECT AVG(rating) as average, COUNT(*) as count FROM Comments WHERE refId = ? AND type = 'artwork'`, [id], (err, row) => {
        res.json(row || { average: 0, count: 0 });
    });
});

app.get('/api/artworks/:id', (req, res) => {
    db.run(`UPDATE Artworks SET views = views + 1 WHERE id = ?`, [req.params.id]);
    db.get(`SELECT * FROM Artworks WHERE id = ?`, [req.params.id], (err, row) => res.json(row || {}));
});

app.get('/api/workshops', (req, res) => {
    db.all(`SELECT * FROM Workshops`, (err, rows) => res.json(rows || []));
});

// M15: Verified Reviews Logic
app.post('/api/comments', (req, res) => {
    const { refId, type, user_id, user_name, text, rating } = req.body;
    const checkQuery = type === 'artwork'
        ? `SELECT id FROM OrderItems WHERE item_id = ? AND order_id IN (SELECT id FROM Orders WHERE user_id = ?)`
        : `SELECT id FROM Reservations WHERE workshop_id = ? AND user_id = ? AND status = 'Active'`;

    db.get(checkQuery, [refId, user_id], (err, row) => {
        if (!row) return res.status(403).json({ error: 'Purchase/Reservation required to comment.' });
        db.run(`INSERT INTO Comments (refId, type, user_id, user_name, text, rating) VALUES (?, ?, ?, ?, ?, ?)`,
            [refId, type, user_id, user_name, text, rating], () => res.json({ success: true }));
    });
});

app.get('/api/comments/:type/:refId', (req, res) => {
    const { type, refId } = req.params;
    const sort = req.query.sort || '';
    let order = 'id DESC';
    if (type === 'artwork') {
        if (sort === 'highest') order = 'rating DESC';
        else if (sort === 'lowest') order = 'rating ASC';
        else if (sort === 'recent') order = 'id DESC';
        else if (sort === 'oldest') order = 'id ASC';
        else if (sort === 'helpful') order = 'upvotes DESC';
    }
    db.all(`SELECT * FROM Comments WHERE type = ? AND refId = ? ORDER BY ${order}`, [type, refId], (err, rows) => res.json(rows || []));
});

// Upvote / Downvote comment
app.post('/api/comments/:id/vote', (req, res) => {
    const { action } = req.body; // 'up' or 'down'
    const column = action === 'up' ? 'upvotes' : 'downvotes';
    db.run(`UPDATE Comments SET ${column} = ${column} + 1 WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Admin reply to comment
app.post('/api/comments/:id/reply', (req, res) => {
    const { reply } = req.body;
    db.run(`UPDATE Comments SET admin_reply = ? WHERE id = ?`, [reply, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/orders', (req, res) => {
    const { user_id, total, items, payment_method } = req.body;
    if (!payment_method) return res.status(400).json({ error: 'Payment method required' });
    db.run(`INSERT INTO Orders (user_id, total, status, payment_method) VALUES (?, ?, 'Paid', ?)`, [user_id, total, payment_method], function (err) {
        const orderId = this.lastID;
        items.forEach(item => {
            db.run(`INSERT INTO OrderItems (order_id, item_type, item_id, title, price) VALUES (?, ?, ?, ?, ?)`, [orderId, item.type, item.id, item.title, item.price]);
            if (item.type.toLowerCase() === 'artwork') db.run(`UPDATE Artworks SET is_sold = 1 WHERE id = ?`, [item.id]);
        });
        res.json({ success: true });
    });
});

app.get('/api/orders/:userId', (req, res) => {
    db.all(`SELECT * FROM Orders WHERE user_id = ? ORDER BY id DESC`, [req.params.userId], (err, orders) => {
        if (err || !orders) return res.json([]);
        db.all(`SELECT * FROM OrderItems WHERE order_id IN (SELECT id FROM Orders WHERE user_id = ?)`, [req.params.userId], (err2, items) => {
            const itemsByOrder = {};
            if (items) {
                items.forEach(item => {
                    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
                    itemsByOrder[item.order_id].push(item);
                });
            }
            orders.forEach(o => o.items = itemsByOrder[o.id] || []);
            res.json(orders);
        });
    });
});

// Coupons validate
app.post('/api/coupons/validate', (req, res) => {
    const { code } = req.body;
    db.get(`SELECT discount_percent, is_active FROM Coupons WHERE code = ?`, [code], (err, row) => {
        if (!row || row.is_active === 0) return res.json({ discount: 0 });
        res.json({ discount: row.discount_percent });
    });
});

app.get('/api/admin/coupons', (req, res) => {
    db.all(`SELECT * FROM Coupons ORDER BY id DESC`, (err, rows) => res.json(rows || []));
});

app.post('/api/admin/coupons', (req, res) => {
    const { code, discount_percent } = req.body;
    db.run(`INSERT INTO Coupons (code, discount_percent, is_active) VALUES (?, ?, 1)`, [code, discount_percent], function(err) {
        if (err) return res.status(400).json({ error: 'Coupon code might already exist.' });
        res.json({ success: true, id: this.lastID });
    });
});

// Campaign artworks
app.get('/api/artworks/campaigns', (req, res) => {
    db.all(`SELECT * FROM Artworks WHERE is_campaign = 1`, (err, rows) => res.json(rows || []));
});

// Tickets
app.post('/api/tickets', (req, res) => {
    const { user_id, subject, message } = req.body;
    db.run(`INSERT INTO Tickets (user_id, subject, message, status) VALUES (?, ?, ?, 'Open')`, [user_id, subject, message], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/tickets', (req, res) => {
    db.all(`SELECT * FROM Tickets ORDER BY id DESC`, (err, rows) => res.json(rows || []));
});

app.post('/api/tickets/:id/reply', (req, res) => {
    const { reply } = req.body;
    db.run(`UPDATE Tickets SET admin_reply = ?, status = 'Answered' WHERE id = ?`, [reply, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/tickets/user/:id', (req, res) => {
    db.all(`SELECT * FROM Tickets WHERE user_id = ?`, [req.params.id], (err, rows) => res.json(rows || []));
});

// Comparisons
app.post('/api/comparisons', (req, res) => {
    const { user_id, type, item_ids } = req.body;
    db.run(`INSERT INTO Comparisons (user_id, type, item_ids) VALUES (?, ?, ?)`, [user_id, type, JSON.stringify(item_ids)], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/comparisons/:userId', (req, res) => {
    db.all(`SELECT * FROM Comparisons WHERE user_id = ? ORDER BY id DESC`, [req.params.userId], (err, rows) => res.json(rows || []));
});

// User update & password change
app.put('/api/users/:id', (req, res) => {
    const { name, email } = req.body;
    db.run(`UPDATE Users SET name = ?, email = ? WHERE id = ?`, [name, email, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.put('/api/users/:id/password', (req, res) => {
    const { currentPassword, newPassword } = req.body;
    db.get(`SELECT * FROM Users WHERE id = ?`, [req.params.id], (err, row) => {
        if (!row) return res.status(404).json({ error: 'User not found' });
        if (row.password !== currentPassword) return res.status(403).json({ error: 'Current password incorrect' });
        db.run(`UPDATE Users SET password = ? WHERE id = ?`, [newPassword, req.params.id], (e) => res.json({ success: true }));
    });
});

app.post('/api/reservations', (req, res) => {
    const { user_id, workshop_id, participants, total, date, time } = req.body;
    db.run(`INSERT INTO Reservations (user_id, workshop_id, participants, total, status, date, time) VALUES (?, ?, ?, ?, 'Active', ?, ?)`,
        [user_id, workshop_id, participants, total, date, time], () => {
            db.run(`UPDATE Workshops SET booked = booked + ? WHERE id = ?`, [participants, workshop_id]);
            res.json({ success: true });
        });
});

app.get('/api/reservations/:userId', (req, res) => {
    db.all(`SELECT * FROM Reservations WHERE user_id = ? ORDER BY id DESC`, [req.params.userId], (err, rows) => res.json(rows || []));
});

app.put('/api/reservations/:id', (req, res) => {
    const { participants, total, date, time } = req.body;
    db.get(`SELECT * FROM Reservations WHERE id = ?`, [req.params.id], (err, row) => {
        if (!row) return res.status(404).json({ error: 'Reservation not found' });
        const oldParticipants = row.participants || 0;
        const delta = (participants || oldParticipants) - oldParticipants;
        db.run(`UPDATE Reservations SET participants = ?, total = ?, date = ?, time = ? WHERE id = ?`, [participants || oldParticipants, total || row.total, date || row.date, time || row.time, req.params.id], (e) => {
            if (delta !== 0) db.run(`UPDATE Workshops SET booked = booked + ? WHERE id = ?`, [delta, row.workshop_id]);
            res.json({ success: true });
        });
    });
});

app.put('/api/reservations/cancel/:id', (req, res) => {
    db.get(`SELECT * FROM Reservations WHERE id = ?`, [req.params.id], (err, row) => {
        if (!row) return res.status(404).json({ error: 'Reservation not found' });
        db.run(`UPDATE Reservations SET status = 'Cancelled' WHERE id = ?`, [req.params.id], () => {
            db.run(`UPDATE Workshops SET booked = booked - ? WHERE id = ?`, [row.participants || 0, row.workshop_id]);
            res.json({ success: true });
        });
    });
});

// M16: Admin Reports
app.get('/api/admin/reports', (req, res) => {
    const report = {};
    db.all(`SELECT title, views, (SELECT COUNT(*) FROM Favorites WHERE artwork_id = Artworks.id) as favs, (SELECT COUNT(*) FROM Comments WHERE refId = Artworks.id AND type='artwork') as comment_count, (SELECT AVG(rating) FROM Comments WHERE refId = Artworks.id AND type='artwork') as avg_rating FROM Artworks`, (err, arts) => {
        report.artwork_stats = arts;
        db.all(`SELECT title, capacity, booked, (booked * 100.0 / capacity) as occupancy_rate, (SELECT COUNT(*) FROM Comments WHERE refId = Workshops.id AND type='workshop') as comment_count, (SELECT AVG(rating) FROM Comments WHERE refId = Workshops.id AND type='workshop') as avg_rating, (SELECT COUNT(*) FROM Reservations WHERE workshop_id = Workshops.id) as total_reservations FROM Workshops`, (err2, works) => {
            report.workshop_stats = works;
            db.get(`SELECT SUM(total) as total_sales FROM Orders`, (err3, sales) => {
                report.financials = sales;
                res.json(report);
            });
        });
    });
});

app.get('/api/favorites/:userId', (req, res) => {
    db.all(`SELECT artwork_id FROM Favorites WHERE user_id = ?`, [req.params.userId], (err, rows) => res.json(rows ? rows.map(r => r.artwork_id) : []));
});

app.post('/api/favorites', (req, res) => {
    const { user_id, artwork_id } = req.body;
    db.run(`INSERT INTO Favorites (user_id, artwork_id) VALUES (?, ?)`, [user_id, artwork_id], () => res.json({ success: true }));
});

app.delete('/api/favorites/:userId/:artworkId', (req, res) => {
    db.run(`DELETE FROM Favorites WHERE user_id = ? AND artwork_id = ?`, [req.params.userId, req.params.artworkId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
module.exports = app;
