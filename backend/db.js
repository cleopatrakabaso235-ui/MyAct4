
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const dbPath = path.resolve(
  process.env.DB_PATH || "./data/timetable.db"
);

// Ensure the database directory exists.
fs.mkdirSync(path.dirname(dbPath), {
  recursive: true
});

const db = new Database(dbPath);

// Enable foreign key support and improve concurrent access.
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

// Create the single table.
db.exec(`
  CREATE TABLE IF NOT EXISTS timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT NOT NULL,
    course_name TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    room TEXT NOT NULL,
    goal TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert 10 sample records when the table is empty.
const count = db.prepare(
  "SELECT COUNT(*) AS total FROM timetable"
).get().total;

if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO timetable (
      course_code,
      course_name,
      day_of_week,
      start_time,
      end_time,
      room,
      goal
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const samples = [
    ["ICT251", "Web Application Development", "Monday", "08:00", "10:00", "Lab 1", "Master Node.js and REST APIs"],
    ["ICT252", "Database Systems", "Monday", "10:00", "12:00", "Room 12", "Understand database design"],
    ["MAT201", "Discrete Mathematics", "Tuesday", "08:00", "10:00", "Room 5", "Improve problem-solving skills"],
    ["ICT253", "Computer Networks", "Tuesday", "10:00", "12:00", "Lab 2", "Understand networking concepts"],
    ["ICT254", "Operating Systems", "Wednesday", "08:00", "10:00", "Room 8", "Learn process management"],
    ["STA201", "Statistics", "Wednesday", "10:00", "12:00", "Room 10", "Improve statistical analysis"],
    ["ICT255", "Software Engineering", "Thursday", "08:00", "10:00", "Room 6", "Apply software development methods"],
    ["ICT256", "Cybersecurity", "Thursday", "10:00", "12:00", "Lab 3", "Learn security fundamentals"],
    ["COM201", "Technical Communication", "Friday", "08:00", "10:00", "Room 4", "Improve technical writing"],
    ["ICT257", "Project Management", "Friday", "10:00", "12:00", "Room 7", "Plan projects effectively"]
  ];

  const seed = db.transaction((rows) => {
    for (const row of rows) {
      insert.run(...row);
    }
  });

  seed(samples);
}

module.exports = db;
