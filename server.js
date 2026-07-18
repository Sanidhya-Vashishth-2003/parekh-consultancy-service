const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8000;
const SECRET_KEY = process.env.JWT_SECRET || 'parekh_super_secret_key';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support large base64 strings for DP
app.use(express.static(path.join(__dirname, 'public'))); // Serve our static site

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error("Error opening database " + err.message);
    } else {
        console.log("Connected to SQLite Database");
        
        // Create Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            dp TEXT
        )`, (err) => {
            if(err) console.error("Error creating users table", err);
        });

        // Create Reviews Table
        db.run(`CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            dp TEXT,
            rating INTEGER NOT NULL,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`, (err) => {
            if(err) console.error("Error creating reviews table", err);
        });

        // Create Appointments Table
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            service TEXT NOT NULL,
            message TEXT,
            status TEXT DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create Blogs Table
        db.run(`CREATE TABLE IF NOT EXISTS blogs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            excerpt TEXT NOT NULL,
            content TEXT NOT NULL,
            image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// --- API ENDPOINTS ---

// SIGNUP
app.post('/api/signup', async (req, res) => {
    const { name, email, password, dp } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Missing required fields" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (name, email, password, dp) VALUES (?, ?, ?, ?)`;
        
        db.run(sql, [name, email, hashedPassword, dp], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: "An account with this email already exists" });
                }
                return res.status(500).json({ error: err.message });
            }
            
            // Generate token
            const user = { id: this.lastID, name, email, dp };
            const token = jwt.sign(user, SECRET_KEY);
            res.json({ message: "Signup successful", user, token });
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// LOGIN
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing required fields" });

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(400).json({ error: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, row.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

        const isAdmin = email === 'parekh@consultancy.com';
        const user = { id: row.id, name: row.name, email: row.email, dp: row.dp, isAdmin };
        const token = jwt.sign(user, SECRET_KEY);
        res.json({ message: "Login successful", user, token });
    });
});

// UPDATE PROFILE
app.post('/api/profile', (req, res) => {
    const { email, name, dp } = req.body;
    if (!email) return res.status(400).json({ error: "Email required to identify user" });

    db.run(`UPDATE users SET name = ?, dp = ? WHERE email = ?`, [name, dp, email], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Also update reviews by this user to keep their DP and Name in sync on the page
        db.run(`UPDATE reviews SET name = ?, dp = ? WHERE user_id = (SELECT id FROM users WHERE email = ?)`, [name, dp, email]);
        
        res.json({ message: "Profile updated successfully" });
    });
});

// ADD REVIEW
app.post('/api/reviews', (req, res) => {
    const { email, rating, text } = req.body;
    if (!email || !rating || !text) return res.status(400).json({ error: "Missing required fields" });

    // First get the user to attach their name and DP
    db.get(`SELECT id, name, dp FROM users WHERE email = ?`, [email], (err, user) => {
        if (err || !user) return res.status(400).json({ error: "User not found" });

        const sql = `INSERT INTO reviews (user_id, name, dp, rating, text) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [user.id, user.name, user.dp, rating, text], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Return the newly created review
            db.get(`SELECT * FROM reviews WHERE id = ?`, [this.lastID], (err, review) => {
                res.json(review);
            });
        });
    });
});

// GET REVIEWS
app.get('/api/reviews', (req, res) => {
    // Fetch latest reviews first
    db.all(`SELECT * FROM reviews ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// BOOK APPOINTMENT
app.post('/api/book', (req, res) => {
    const { name, email, phone, date, time, service, message } = req.body;
    if (!name || !email || !date || !time || !service) return res.status(400).json({ error: "Missing required fields" });

    const sql = `INSERT INTO appointments (name, email, phone, date, time, service, message) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [name, email, phone, date, time, service, message], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Appointment booked successfully!", id: this.lastID });
    });
});

// GET BLOGS
app.get('/api/blogs', (req, res) => {
    db.all(`SELECT * FROM blogs ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- ADMIN ENDPOINTS ---

// Middleware to verify Admin
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err || !decoded.isAdmin) return res.status(403).json({ error: "Unauthorized. Admin only." });
        req.user = decoded;
        next();
    });
};

app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
    db.serialize(() => {
        let stats = {};
        db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => { stats.users = row.count; });
        db.get("SELECT COUNT(*) as count FROM appointments", [], (err, row) => { stats.appointments = row.count; });
        db.get("SELECT COUNT(*) as count FROM reviews", [], (err, row) => { 
            stats.reviews = row.count; 
            res.json(stats);
        });
    });
});

app.get('/api/admin/appointments', authenticateAdmin, (req, res) => {
    db.all("SELECT * FROM appointments ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    db.all("SELECT id, name, email, dp FROM users ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/blogs', authenticateAdmin, (req, res) => {
    const { title, excerpt, content, image } = req.body;
    db.run(`INSERT INTO blogs (title, excerpt, content, image) VALUES (?, ?, ?, ?)`, 
    [title, excerpt, content, image], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Blog created", id: this.lastID });
    });
});

// Fallback handled by express.static on root

app.listen(PORT, () => {
    console.log(`🚀 Server running globally at http://localhost:${PORT}`);
});
