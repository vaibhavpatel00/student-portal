const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'students.db');
let db;

function initDB() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      year TEXT NOT NULL,
      section TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database initialized');
  return db;
}

function registerStudent({ roll_number, name, department, year, section, email, password }) {
  const existing = db.prepare('SELECT id FROM students WHERE roll_number = ?').get(roll_number);
  if (existing) {
    throw new Error('Roll number already registered');
  }

  const existingEmail = db.prepare('SELECT id FROM students WHERE email = ?').get(email);
  if (existingEmail) {
    throw new Error('Email already registered');
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(password, salt);

  const stmt = db.prepare(`
    INSERT INTO students (roll_number, name, department, year, section, email, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(roll_number.toUpperCase(), name, department, year, section, email, password_hash);
  return { id: result.lastInsertRowid, roll_number: roll_number.toUpperCase() };
}

function loginStudent(roll_number, password) {
  const student = db.prepare('SELECT * FROM students WHERE roll_number = ?').get(roll_number.toUpperCase());
  if (!student) {
    throw new Error('Roll number not found. Please register first.');
  }

  const isMatch = bcrypt.compareSync(password, student.password_hash);
  if (!isMatch) {
    throw new Error('Invalid password');
  }

  const { password_hash, ...safeStudent } = student;
  return safeStudent;
}

function getStudent(roll_number) {
  const student = db.prepare('SELECT * FROM students WHERE roll_number = ?').get(roll_number.toUpperCase());
  if (!student) return null;
  const { password_hash, ...safeStudent } = student;
  return safeStudent;
}

module.exports = { initDB, registerStudent, loginStudent, getStudent };
