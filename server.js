const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'jfllmcrm',
  api_key: process.env.CLOUDINARY_API_KEY || '886524937592756',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'I3sA0GsS29SuDRKEvbJE6hkCPOg'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'parekh_consultancy_uploads',
    allowed_formats: ['jpg', 'png', 'pdf', 'jpeg']
  },
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

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Kept for legacy fallback

// Database setup (PostgreSQL via Supabase/Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/parekh',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const initDB = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            dp TEXT,
            is_verified BOOLEAN DEFAULT false,
            otp_code TEXT,
            otp_expires_at TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            name TEXT NOT NULL,
            dp TEXT,
            rating INTEGER NOT NULL,
            text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS appointments (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            service TEXT NOT NULL,
            message TEXT,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS blogs (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            excerpt TEXT NOT NULL,
            content TEXT NOT NULL,
            image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            status TEXT DEFAULT 'Uploaded',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log("Connected to PostgreSQL Database and verified tables.");
    } catch (err) {
        console.error("Database initialization error. Please check your Supabase DATABASE_URL.");
    }
};
initDB();

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

// SIGNUP
app.post('/api/signup', async (req, res) => {
    const { name, email, password, dp } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Missing required fields" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        const row = rows[0];
            
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
            await pool.query(
                `UPDATE users SET name=$1, password=$2, dp=$3, otp_code=$4, otp_expires_at=$5 WHERE id=$6`, 
                [name, hashedPassword, dp, otpCode, otpExpiresAt, row.id]
            );
            sendOtpEmail(row.id);
        } else {
            const result = await pool.query(
                `INSERT INTO users (name, email, password, dp, otp_code, otp_expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, 
                [name, email, hashedPassword, dp, otpCode, otpExpiresAt]
            );
            sendOtpEmail(result.rows[0].id);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// VERIFY OTP
app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    try {
        const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        const row = rows[0];
        
        if (!row) return res.status(400).json({ error: "User not found" });
        if (row.is_verified) return res.status(400).json({ error: "User already verified" });
        if (row.otp_code !== otp) return res.status(400).json({ error: "Invalid OTP" });
        if (new Date() > new Date(row.otp_expires_at)) {
            return res.status(400).json({ error: "OTP has expired. Please sign up again." });
        }

        await pool.query(`UPDATE users SET is_verified = true, otp_code = NULL, otp_expires_at = NULL WHERE id = $1`, [row.id]);
        
        const isAdmin = row.email === 'parekh@consultancy.com';
        const user = { id: row.id, name: row.name, email: row.email, dp: row.dp, isAdmin };
        const token = jwt.sign(user, SECRET_KEY);
        res.json({ message: "Verification successful!", token, user: { id: user.id, name: user.name, email: user.email, dp: user.dp } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing required fields" });

    try {
        const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        const row = rows[0];
        if (!row) return res.status(400).json({ error: "Invalid email or password" });
        if (!row.is_verified) return res.status(400).json({ error: "Account not verified." });

        const isMatch = await bcrypt.compare(password, row.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

        const isAdmin = email === 'parekh@consultancy.com';
        const user = { id: row.id, name: row.name, email: row.email, dp: row.dp, isAdmin };
        const token = jwt.sign(user, SECRET_KEY);
        res.json({ message: "Login successful!", token, user: { id: user.id, name: user.name, email: user.email, dp: user.dp } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload a document (Client) - Goes to Cloudinary now!
app.post('/api/documents/upload', authenticateToken, upload.single('document'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        // req.file.path is now the secure Cloudinary URL from multer-storage-cloudinary
        const result = await pool.query(
            `INSERT INTO documents (user_id, filename, filepath) VALUES ($1, $2, $3) RETURNING id`,
            [req.user.id, req.file.originalname, req.file.path]
        );
        res.json({ message: "Document uploaded to Cloudinary successfully", id: result.rows[0].id, filename: req.file.originalname, status: 'Uploaded' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get my documents (Client)
app.get('/api/documents/my-documents', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all documents (Admin)
app.get('/api/admin/documents', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT d.*, u.name as user_name, u.email as user_email 
            FROM documents d 
            JOIN users u ON d.user_id = u.id 
            ORDER BY d.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update document status (Admin)
app.put('/api/admin/documents/:id/status', express.json(), async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query(`UPDATE documents SET status = $1 WHERE id = $2`, [status, req.params.id]);
        res.json({ message: "Status updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE PROFILE
app.post('/api/profile', async (req, res) => {
    const { email, name, dp } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        await pool.query(`UPDATE users SET name = $1, dp = $2 WHERE email = $3`, [name, dp, email]);
        await pool.query(`UPDATE reviews SET name = $1, dp = $2 WHERE user_id = (SELECT id FROM users WHERE email = $3)`, [name, dp, email]);
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD REVIEW
app.post('/api/reviews', async (req, res) => {
    const { email, rating, text } = req.body;
    if (!email || !rating || !text) return res.status(400).json({ error: "Missing required fields" });

    try {
        const { rows } = await pool.query(`SELECT id, name, dp FROM users WHERE email = $1`, [email]);
        const user = rows[0];
        if (!user) return res.status(400).json({ error: "User not found" });

        const result = await pool.query(
            `INSERT INTO reviews (user_id, name, dp, rating, text) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [user.id, user.name, user.dp, rating, text]
        );
        const newReview = await pool.query(`SELECT * FROM reviews WHERE id = $1`, [result.rows[0].id]);
        res.json(newReview.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET REVIEWS
app.get('/api/reviews', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM reviews ORDER BY created_at DESC`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// BOOK APPOINTMENT
app.post('/api/book', async (req, res) => {
    const { name, email, phone, date, time, service, message } = req.body;
    if (!name || !email || !date || !time || !service) return res.status(400).json({ error: "Missing required fields" });

    try {
        const result = await pool.query(
            `INSERT INTO appointments (name, email, phone, date, time, service, message) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [name, email, phone, date, time, service, message]
        );
        
        if (transporter) {
            let mailOptions = {
                from: '"Parekh Consultancy" <sharmapanjak231@gmail.com>',
                to: email,
                subject: 'Consultation Booking Confirmed!',
                html: `<div style="font-family: Arial; padding: 20px;">
                        <h2>Booking Confirmed, ${name}!</h2>
                        <p>Service: ${service}</p>
                        <p>Date: ${date}</p>
                        <p>Time: ${time}</p>
                       </div>`
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (!error) console.log('Email sent: %s', info.messageId);
            });
        }
        res.json({ message: "Appointment booked successfully!", id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET BLOGS
app.get('/api/blogs', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM blogs ORDER BY created_at DESC`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const u = await pool.query("SELECT COUNT(*) as count FROM users");
        const a = await pool.query("SELECT COUNT(*) as count FROM appointments");
        const r = await pool.query("SELECT COUNT(*) as count FROM reviews");
        res.json({ 
            users: parseInt(u.rows[0].count), 
            appointments: parseInt(a.rows[0].count), 
            reviews: parseInt(r.rows[0].count) 
        });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/appointments', authenticateAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM appointments ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT id, name, email, dp FROM users ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/blogs', authenticateAdmin, async (req, res) => {
    const { title, excerpt, content, image } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO blogs (title, excerpt, content, image) VALUES ($1, $2, $3, $4) RETURNING id`, 
            [title, excerpt, content, image]
        );
        res.json({ message: "Blog created", id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running globally at http://localhost:${PORT}`);
});
