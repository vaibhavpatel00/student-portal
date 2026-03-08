const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-portal';
let db = null;
let client = null;

async function initDB() {
  if (db) return db;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();

    // Create indexes
    await db.collection('students').createIndex({ roll_number: 1 }, { unique: true });
    await db.collection('students').createIndex({ email: 1 }, { unique: true });

    console.log('✅ MongoDB connected');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

async function getDB() {
  if (!db) await initDB();
  return db;
}

async function registerStudent({ roll_number, name, department, year, section, email, password }) {
  const database = await getDB();
  const students = database.collection('students');

  const existing = await students.findOne({ roll_number: roll_number.toUpperCase() });
  if (existing) {
    throw new Error('Roll number already registered');
  }

  const existingEmail = await students.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    throw new Error('Email already registered');
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(password, salt);

  const result = await students.insertOne({
    roll_number: roll_number.toUpperCase(),
    name,
    department,
    year,
    section,
    email: email.toLowerCase(),
    password_hash,
    created_at: new Date(),
  });

  return { id: result.insertedId, roll_number: roll_number.toUpperCase() };
}

async function loginStudent(roll_number, password) {
  const database = await getDB();
  const student = await database.collection('students').findOne({
    roll_number: roll_number.toUpperCase()
  });

  if (!student) {
    throw new Error('Roll number not found. Please register first.');
  }

  const isMatch = bcrypt.compareSync(password, student.password_hash);
  if (!isMatch) {
    throw new Error('Invalid password');
  }

  const { password_hash, _id, ...safeStudent } = student;
  safeStudent.id = _id.toString();
  return safeStudent;
}

async function getStudent(roll_number) {
  const database = await getDB();
  const student = await database.collection('students').findOne({
    roll_number: roll_number.toUpperCase()
  });

  if (!student) return null;
  const { password_hash, _id, ...safeStudent } = student;
  safeStudent.id = _id.toString();
  return safeStudent;
}

async function findStudentByEmail(email) {
  const database = await getDB();
  const student = await database.collection('students').findOne({
    email: email.toLowerCase()
  });

  if (!student) return null;
  const { password_hash, _id, ...safeStudent } = student;
  safeStudent.id = _id.toString();
  return safeStudent;
}

async function updatePassword(email, newPassword) {
  const database = await getDB();
  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(newPassword, salt);

  const result = await database.collection('students').updateOne(
    { email: email.toLowerCase() },
    { $set: { password_hash } }
  );

  return result.modifiedCount > 0;
}

module.exports = { initDB, getDB, registerStudent, loginStudent, getStudent, findStudentByEmail, updatePassword };
