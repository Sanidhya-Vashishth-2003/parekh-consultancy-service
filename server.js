const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');

// Ensure uploads directory exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Email Transporter Setup
let transporter;
nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return;
    }
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });
    console.log('Ethereal Email transporter is ready.');
});

const app = express();
const PORT = process.env.PORT || 8000;
const SECRET_KEY = process.env.JWT_SECRET || 'parekh_super_secret_key';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support large base64 strings for DP
app.use(express.static(path.join(__dirname, 'public'))); // Serve our static site
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded documents

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
            dp TEXT,
            is_verified BOOLEAN DEFAULT 0,
            otp_code TEXT,
            otp_expires_at DATETIME
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

        // Create Documents Table for Client Portal
        db.run(`CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            status TEXT DEFAULT 'Uploaded',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);
    }
});

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token." });
        req.user = user;
        next();
    });
};

// --- API ENDPOINTS ---

// SIGNUP
app.post('/api/signup', async (req, res) => {
    const { name, email, password, dp } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Missing required fields" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

        db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (row && row.is_verified) {
                return res.status(400).json({ error: "An account with this email already exists" });
            }

            const sendOtpEmail = (userId) => {
                if (transporter) {
                    let mailOptions = {
                        from: '"Parekh Consultancy" <sharmapanjak231@gmail.com>',
                        to: email,
                        subject: 'Your Verification Code',
                        html: `<div style="font-family: Arial; padding: 20px;">
                                <h2>Welcome, ${name}!</h2>
                                <p>Your verification code is: <strong style="font-size: 24px;">${otpCode}</strong></p>
                                <p>This code will expire in 10 minutes.</p>
                               </div>`
                    };
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) console.log('Error sending OTP:', error);
                        else console.log('OTP Preview URL: %s', nodemailer.getTestMessageUrl(info));
                    });
                }
                res.json({ message: "OTP sent to email. Please verify." });
            };

            if (row && !row.is_verified) {
                // Update unverified user
                db.run(`UPDATE users SET name=?, password=?, dp=?, otp_code=?, otp_expires_at=? WHERE id=?`, 
                    [name, hashedPassword, dp, otpCode, otpExpiresAt, row.id], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    sendOtpEmail(row.id);
                });
            } else {
                // Insert new unverified user
                db.run(`INSERT INTO users (name, email, password, dp, otp_code, otp_expires_at) VALUES (?, ?, ?, ?, ?, ?)`, 
                    [name, email, hashedPassword, dp, otpCode, otpExpiresAt], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    sendOtpEmail(this.lastID);
                });
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// VERIFY OTP
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(400).json({ error: "User not found" });
        if (row.is_verified) return res.status(400).json({ error: "User already verified" });

        if (row.otp_code !== otp) return res.status(400).json({ error: "Invalid OTP" });
        
        if (new Date() > new Date(row.otp_expires_at)) {
            return res.status(400).json({ error: "OTP has expired. Please sign up again to receive a new code." });
        }

        db.run(`UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = ?`, [row.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });

            const isAdmin = row.email === 'parekh@consultancy.com';
            const user = { id: row.id, name: row.name, email: row.email, dp: row.dp, isAdmin };
            const token = jwt.sign(user, SECRET_KEY);
            res.json({ message: "Verification successful!", token, user: { id: user.id, name: user.name, email: user.email, dp: user.dp } });
        });
    });
});

// LOGIN
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing required fields" });

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(400).json({ error: "Invalid email or password" });
        if (!row.is_verified) return res.status(400).json({ error: "Account not verified. Please sign up again to complete verification." });

        const isMatch = await bcrypt.compare(password, row.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

        const isAdmin = email === 'parekh@consultancy.com';
        const user = { id: row.id, name: row.name, email: row.email, dp: row.dp, isAdmin };
        const token = jwt.sign(user, SECRET_KEY);
        res.json({ message: "Login successful!", token, user: { id: user.id, name: user.name, email: user.email, dp: user.dp } });
    });
});

// --- DOCUMENT PORTAL ENDPOINTS ---

// Upload a document (Client)
app.post('/api/documents/upload', authenticateToken, upload.single('document'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const sql = `INSERT INTO documents (user_id, filename, filepath) VALUES (?, ?, ?)`;
    db.run(sql, [req.user.id, req.file.originalname, req.file.path], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Document uploaded successfully", id: this.lastID, filename: req.file.originalname, status: 'Uploaded' });
    });
});

// Get my documents (Client)
app.get('/api/documents/my-documents', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get all documents (Admin)
app.get('/api/admin/documents', (req, res) => {
    // Note: Should have proper admin auth, simplified for this scope
    db.all(`
        SELECT d.*, u.name as user_name, u.email as user_email 
        FROM documents d 
        JOIN users u ON d.user_id = u.id 
        ORDER BY d.created_at DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update document status (Admin)
app.put('/api/admin/documents/:id/status', express.json(), (req, res) => {
    const { status } = req.body;
    db.run(`UPDATE documents SET status = ? WHERE id = ?`, [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Status updated successfully!" });
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
        
        // Send Email using Ethereal Transporter
        if (transporter) {
            let mailOptions = {
                from: '"Parekh Consultancy" <sharmapanjak231@gmail.com>',
                to: email,
                subject: 'Consultation Booking Confirmed!',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            @keyframes pulse {
                                0% { transform: scale(1); opacity: 1; }
                                50% { transform: scale(1.05); opacity: 0.8; }
                                100% { transform: scale(1); opacity: 1; }
                            }
                            @keyframes slideUp {
                                from { transform: translateY(20px); opacity: 0; }
                                to { transform: translateY(0); opacity: 1; }
                            }
                            .animated-icon {
                                animation: pulse 2s infinite ease-in-out;
                            }
                            .content-box {
                                animation: slideUp 0.6s ease-out forwards;
                            }
                        </style>
                    </head>
                    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f0f4f8; padding: 40px 20px; color: #1a202c;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); overflow: hidden;" class="content-box">
                            
                            <!-- Header with Animated SVG -->
                            <div style="background: linear-gradient(135deg, #0a4f4f 0%, #0d6e6e 100%); padding: 40px 30px; text-align: center; position: relative;">
                                <div style="width: 80px; height: 80px; margin: 0 auto 15px auto; background-color: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center;" class="animated-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                </div>
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">Parekh Consultancy</h1>
                                <p style="color: #cbd5e1; margin: 8px 0 0 0; font-size: 15px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase;">Booking Confirmed</p>
                            </div>

                            <!-- Body -->
                            <div style="padding: 40px 30px;">
                                <h2 style="color: #0d6e6e; margin-top: 0; font-size: 24px; font-weight: 700;">Hello <span style="color: #1a202c;">${name}</span>,</h2>
                                <p style="font-size: 16px; line-height: 1.6; color: #475569;">
                                    Thank you for trusting Parekh Consultancy. Your appointment has been successfully scheduled and locked into our calendar. We look forward to providing you with expert financial advisory.
                                </p>

                                <!-- Beautiful Details Box -->
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid #c8a84e; padding: 25px; border-radius: 8px; margin: 35px 0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                                    <h3 style="margin: 0 0 20px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Appointment Details</h3>
                                    
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 100px;"><strong>Service:</strong></td>
                                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0d6e6e; font-weight: 700;">${service}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Date:</strong></td>
                                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${date}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 10px 0; color: #64748b;"><strong>Time:</strong></td>
                                            <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${time}</td>
                                        </tr>
                                    </table>
                                </div>

                                <!-- Call to action button -->
                                <div style="text-align: center; margin: 35px 0 20px 0;">
                                    <a href="#" style="background-color: #0d6e6e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Manage Appointment</a>
                                </div>

                                <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 0; text-align: center;">
                                    Need to reschedule? Please reply directly to this email or call us at <strong>+91 9934593000</strong> at least 24 hours in advance.
                                </p>
                            </div>

                            <!-- Footer -->
                            <div style="background-color: #1e293b; padding: 25px; text-align: center;">
                                <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                                    &copy; 2026 Parekh Consultancy Service. All rights reserved.<br>
                                    <a href="mailto:sharmapanjak231@gmail.com" style="color: #38bdf8; text-decoration: none;">sharmapanjak231@gmail.com</a>
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error occurred sending email:', error);
                } else {
                    console.log('Email sent: %s', info.messageId);
                    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
                }
            });
        }

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
