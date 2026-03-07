const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDB, registerStudent, loginStudent, getStudent } = require('./database');
const { fetchStudentAttendance, getTodayAttendance } = require('./scraper');
const { getAllResults } = require('./examScraper');

const app = express();
const PORT = 3000;

// Initialize database
initDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'vignan-student-portal-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
}));

// Auth middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.student) {
        next();
    } else {
        res.status(401).json({ error: 'Please login first' });
    }
}

// ============ API ROUTES ============

// Register
app.post('/api/register', (req, res) => {
    try {
        const { roll_number, name, department, year, section, email, password } = req.body;

        if (!roll_number || !name || !department || !year || !section || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const result = registerStudent({ roll_number, name, department, year, section, email, password });
        res.json({ success: true, message: 'Registration successful! Please login.', data: result });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login
app.post('/api/login', (req, res) => {
    try {
        const { roll_number, password } = req.body;

        if (!roll_number || !password) {
            return res.status(400).json({ error: 'Roll number and password are required' });
        }

        const student = loginStudent(roll_number, password);
        req.session.student = student;
        res.json({ success: true, student });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Logout
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Get current student info
app.get('/api/me', requireAuth, (req, res) => {
    res.json({ student: req.session.student });
});

// Get overall attendance
app.get('/api/attendance/overview', requireAuth, async (req, res) => {
    try {
        const { roll_number } = req.session.student;
        const fromDate = req.query.from || getDefaultFromDate();
        const toDate = req.query.to || new Date().toISOString().split('T')[0];

        const data = await fetchStudentAttendance(roll_number, fromDate, toDate);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Overview error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance data. Please try again.' });
    }
});

// Get today's hour-wise attendance
app.get('/api/attendance/today', requireAuth, async (req, res) => {
    try {
        const { roll_number, department, year, section } = req.session.student;
        const date = req.query.date || new Date().toISOString().split('T')[0];

        const data = await getTodayAttendance(roll_number, department, year, section);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Today attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch today\'s attendance. Please try again.' });
    }
});

// Get attendance for custom date range
app.get('/api/attendance/range', requireAuth, async (req, res) => {
    try {
        const { roll_number } = req.session.student;
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ error: 'Please provide from and to dates' });
        }

        const data = await fetchStudentAttendance(roll_number, from, to);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Range attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance data. Please try again.' });
    }
});

// Get exam results
app.get('/api/results', requireAuth, async (req, res) => {
    try {
        const { roll_number } = req.session.student;
        const data = await getAllResults(roll_number);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Results error:', error);
        res.status(500).json({ error: 'Failed to fetch exam results. Please try again.' });
    }
});

// ============ PAGE ROUTES ============

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/results', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Helper
function getDefaultFromDate() {
    const now = new Date();
    // Default to start of current semester (Dec 22 for II sem)
    const month = now.getMonth(); // 0-indexed
    if (month >= 5) {
        // June onwards - II sem started around Dec of previous year
        return `${now.getFullYear() - 1}-12-22`;
    } else {
        // Jan-May - II sem started Dec of previous year
        return `${now.getFullYear() - 1}-12-22`;
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`\n🎓 Student Portal running at http://localhost:${PORT}`);
    console.log(`   Login: http://localhost:${PORT}/`);
    console.log(`   Register: http://localhost:${PORT}/register`);
    console.log(`   Dashboard: http://localhost:${PORT}/dashboard\n`);
});
