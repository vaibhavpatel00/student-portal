const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://vaibhav:VignanPortal2026@cluster0.3dtfo7d.mongodb.net/student-portal?appName=Cluster0';
const ADMIN_ROLL = '24891A0541';
let db = null;
let client = null;

async function initDB() {
  if (db) return db;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('student-portal');

    await db.collection('students').createIndex({ roll_number: 1 }, { unique: true });
    await db.collection('students').createIndex({ email: 1 }, { unique: true });
    await db.collection('announcements').createIndex({ created_at: -1 });

    console.log('✅ MongoDB Atlas connected');
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

// ===== STUDENT OPERATIONS =====

async function registerStudent({ roll_number, name, department, year, section, email, password }) {
  const database = await getDB();
  const students = database.collection('students');

  const existing = await students.findOne({ roll_number: roll_number.toUpperCase() });
  if (existing) throw new Error('Roll number already registered');

  const existingEmail = await students.findOne({ email: email.toLowerCase() });
  if (existingEmail) throw new Error('Email already registered');

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
    is_admin: roll_number.toUpperCase() === ADMIN_ROLL,
    profile_photo: null,
    created_at: new Date(),
  });

  return { id: result.insertedId, roll_number: roll_number.toUpperCase() };
}

async function loginStudent(identifier, password) {
  const database = await getDB();
  const id = identifier.trim();

  // Try roll number first, then email
  const student = await database.collection('students').findOne({
    $or: [
      { roll_number: id.toUpperCase() },
      { email: id.toLowerCase() }
    ]
  });

  if (!student) throw new Error('Account not found. Please register first.');

  const isMatch = bcrypt.compareSync(password, student.password_hash);
  if (!isMatch) throw new Error('Invalid password');

  const { password_hash, _id, profile_photo, ...safeStudent } = student;
  safeStudent.id = _id.toString();
  safeStudent.is_admin = student.roll_number === ADMIN_ROLL;
  return safeStudent;
}

async function getStudent(roll_number) {
  const database = await getDB();
  const student = await database.collection('students').findOne({
    roll_number: roll_number.toUpperCase()
  });
  if (!student) return null;
  const { password_hash, _id, profile_photo, ...safeStudent } = student;
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

// ===== PROFILE OPERATIONS =====

async function updateStudentName(roll_number, newName) {
  const database = await getDB();
  const result = await database.collection('students').updateOne(
    { roll_number: roll_number.toUpperCase() },
    { $set: { name: newName } }
  );
  return result.modifiedCount > 0;
}

async function saveProfilePhoto(roll_number, photoBase64) {
  const database = await getDB();
  const result = await database.collection('students').updateOne(
    { roll_number: roll_number.toUpperCase() },
    { $set: { profile_photo: photoBase64 } }
  );
  return result.modifiedCount > 0;
}

async function getProfilePhoto(roll_number) {
  const database = await getDB();
  const student = await database.collection('students').findOne(
    { roll_number: roll_number.toUpperCase() },
    { projection: { profile_photo: 1 } }
  );
  return student ? student.profile_photo : null;
}

// ===== ANNOUNCEMENT OPERATIONS =====

async function createAnnouncement({ title, message, attachments, posted_by, posted_by_name }) {
  const database = await getDB();
  const result = await database.collection('announcements').insertOne({
    title,
    message,
    attachments: attachments || [],
    posted_by,
    posted_by_name,
    created_at: new Date(),
  });
  return { id: result.insertedId };
}

async function getAnnouncements(limit = 50) {
  const database = await getDB();
  return database.collection('announcements')
    .find({})
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}

async function deleteAnnouncement(id) {
  const database = await getDB();
  const result = await database.collection('announcements').deleteOne({
    _id: new ObjectId(id)
  });
  return result.deletedCount > 0;
}

module.exports = {
  initDB, getDB,
  registerStudent, loginStudent, getStudent, findStudentByEmail, updatePassword,
  updateStudentName, saveProfilePhoto, getProfilePhoto,
  createAnnouncement, getAnnouncements, deleteAnnouncement,
  ADMIN_ROLL
};
