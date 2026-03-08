const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const {
    initDB, registerStudent, loginStudent, getStudent, findStudentByEmail, updatePassword,
    updateStudentName, saveProfilePhoto, getProfilePhoto,
    createAnnouncement, getAnnouncements, deleteAnnouncement,
    ADMIN_ROLL
} = require('./database');
const { fetchStudentAttendance, getTodayAttendance } = require('./scraper');
const { getAllResults } = require('./examScraper');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'vignan-student-portal-jwt-secret-2025';
const PRODUCTION_URL = 'https://student-portal-r2tp.vercel.app';

// Initialize database
initDB().catch(err => console.error('DB init error:', err));

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Please login first' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.student = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
}

// Admin middleware
function requireAdmin(req, res, next) {
    if (req.student.roll_number !== ADMIN_ROLL) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ============ AUTH ROUTES ============

app.post('/api/register', async (req, res) => {
    try {
        const { roll_number, name, department, year, section, email, password } = req.body;
        if (!roll_number || !name || !department || !year || !section || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        const result = await registerStudent({ roll_number, name, department, year, section, email, password });
        res.json({ success: true, message: 'Registration successful! Please login.', data: result });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { roll_number, password } = req.body;
        const identifier = roll_number; // can be roll number or email
        if (!identifier || !password) {
            return res.status(400).json({ error: 'Roll number/email and password are required' });
        }
        const student = await loginStudent(identifier, password);
        const token = jwt.sign(
            {
                roll_number: student.roll_number,
                name: student.name,
                department: student.department,
                year: student.year,
                section: student.section,
                email: student.email,
                id: student.id,
                is_admin: student.is_admin || false
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({ success: true, token, student });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/logout', (req, res) => {
    res.json({ success: true });
});

app.get('/api/me', requireAuth, async (req, res) => {
    // Fetch fresh data from DB to get updated name/photo
    try {
        const student = await getStudent(req.student.roll_number);
        if (student) {
            student.is_admin = student.roll_number === ADMIN_ROLL;
            res.json({ student });
        } else {
            res.json({ student: req.student });
        }
    } catch (err) {
        res.json({ student: req.student });
    }
});

// ============ ATTENDANCE ROUTES ============

app.get('/api/attendance/overview', requireAuth, async (req, res) => {
    try {
        const { roll_number } = req.student;
        const fromDate = req.query.from || getDefaultFromDate();
        const toDate = req.query.to || new Date().toISOString().split('T')[0];
        const data = await fetchStudentAttendance(roll_number, fromDate, toDate);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Overview error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance data. Please try again.' });
    }
});

app.get('/api/attendance/today', requireAuth, async (req, res) => {
    try {
        const { roll_number, department, year, section } = req.student;
        const data = await getTodayAttendance(roll_number, department, year, section);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Today attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch today\'s attendance. Please try again.' });
    }
});

app.get('/api/attendance/range', requireAuth, async (req, res) => {
    try {
        const { roll_number } = req.student;
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'Please provide from and to dates' });
        const data = await fetchStudentAttendance(roll_number, from, to);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Range attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance data. Please try again.' });
    }
});

app.get('/api/results', requireAuth, async (req, res) => {
    try {
        const { roll_number } = req.student;
        const data = await getAllResults(roll_number);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Results error:', error);
        res.status(500).json({ error: 'Failed to fetch exam results. Please try again.' });
    }
});

// ============ PROFILE ROUTES ============

app.put('/api/profile/update', requireAuth, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const updated = await updateStudentName(req.student.roll_number, name.trim());
        if (updated) {
            res.json({ success: true, message: 'Profile updated!' });
        } else {
            res.status(400).json({ error: 'Failed to update profile' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

app.post('/api/profile/photo', requireAuth, async (req, res) => {
    try {
        const { photo } = req.body;
        if (!photo) return res.status(400).json({ error: 'Photo data is required' });

        // Check size (~500KB limit for base64)
        if (photo.length > 700000) {
            return res.status(400).json({ error: 'Photo is too large. Please use a smaller image.' });
        }

        const saved = await saveProfilePhoto(req.student.roll_number, photo);
        if (saved) {
            res.json({ success: true, message: 'Photo updated!' });
        } else {
            res.status(400).json({ error: 'Failed to save photo' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

app.get('/api/profile/photo/:roll', requireAuth, async (req, res) => {
    try {
        const photo = await getProfilePhoto(req.params.roll);
        res.json({ success: true, photo });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get photo' });
    }
});

// ============ ANNOUNCEMENTS ROUTES ============

app.get('/api/announcements', requireAuth, async (req, res) => {
    try {
        const announcements = await getAnnouncements(50);
        res.json({ success: true, data: announcements });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load announcements' });
    }
});

app.post('/api/announcements', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { title, message } = req.body;
        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }
        const result = await createAnnouncement({
            title: title.trim(),
            message: message.trim(),
            posted_by: req.student.roll_number,
            posted_by_name: req.student.name,
        });
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ error: 'Failed to post announcement' });
    }
});

app.delete('/api/announcements/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const deleted = await deleteAnnouncement(req.params.id);
        if (deleted) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Announcement not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

// ============ FORGOT PASSWORD ============

app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const student = await findStudentByEmail(email);
        if (!student) return res.status(400).json({ error: 'No account found with this email address' });

        const resetToken = jwt.sign(
            { email: student.email, roll_number: student.roll_number, purpose: 'password-reset' },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        const baseUrl = process.env.VERCEL ? PRODUCTION_URL : `http://localhost:${PORT}`;
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;

        if (!emailUser || !emailPass) {
            return res.status(500).json({ error: 'Email service not configured. Please contact admin.' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: emailUser, pass: emailPass },
        });

        await transporter.sendMail({
            from: `"Vignan Portal" <${emailUser}>`,
            to: student.email,
            subject: 'Password Reset - Vignan Student Portal',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
                    <h2 style="color:#1e3a8a;">Password Reset</h2>
                    <p>Hi <strong>${student.name}</strong>,</p>
                    <p>You requested a password reset for your Vignan Student Portal account (${student.roll_number}).</p>
                    <p>Click the button below to set a new password. This link expires in <strong>15 minutes</strong>.</p>
                    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Reset Password</a>
                    <p style="color:#666;font-size:13px;">If you didn't request this, please ignore this email.</p>
                </div>
            `,
        });

        res.json({ success: true, message: 'Password reset link sent to your email!' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ error: 'Token and new password are required' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        let decoded;
        try { decoded = jwt.verify(token, JWT_SECRET); }
        catch (err) { return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' }); }

        if (decoded.purpose !== 'password-reset') return res.status(400).json({ error: 'Invalid reset token' });

        const updated = await updatePassword(decoded.email, password);
        if (!updated) return res.status(400).json({ error: 'Failed to update password.' });

        res.json({ success: true, message: 'Password updated successfully! You can now login.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset password. Please try again.' });
    }
});

// ============ PAGE ROUTES ============

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/results', (req, res) => res.sendFile(path.join(__dirname, 'public', 'results.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, 'public', 'forgot-password.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, 'public', 'reset-password.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/announcements', (req, res) => res.sendFile(path.join(__dirname, 'public', 'announcements.html')));

function getDefaultFromDate() {
    const now = new Date();
    const month = now.getMonth();
    return month >= 5 ? `${now.getFullYear() - 1}-12-22` : `${now.getFullYear() - 1}-12-22`;
}

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`\n🎓 Student Portal running at http://localhost:${PORT}\n`);
    });
}
module.exports = app;
