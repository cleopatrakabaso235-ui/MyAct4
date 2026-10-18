
require("dotenv").config();

const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend files from ICT251/public
app.use(express.static(path.join(__dirname, "../public")));

// Parse incoming request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const fields = [
  "course_code",
  "course_name",
  "day_of_week",
  "start_time",
  "end_time",
  "room",
  "goal"
];

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

function validateCourse(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "A JSON object is required.";
  }

  for (const field of fields) {
    if (
      typeof body[field] !== "string" ||
      !body[field].trim()
    ) {
      return `${field} is required and must be text.`;
    }
  }

  for (const field of fields) {
    if (body[field].trim().length > 200) {
      return `${field} must not exceed 200 characters.`;
    }
  }

  if (!days.includes(body.day_of_week)) {
    return "day_of_week must be a valid day of the week.";
  }

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (
    !timePattern.test(body.start_time) ||
    !timePattern.test(body.end_time)
  ) {
    return "Times must use HH:MM format.";
  }

  if (body.start_time >= body.end_time) {
    return "end_time must be later than start_time.";
  }

  return null;
}

function cleanCourse(body) {
  return Object.fromEntries(
    fields.map((field) => [field, body[field].trim()])
  );
}

// GET: list all timetable records
app.get("/api/timetable", (req, res) => {
  const records = db.prepare(
    "SELECT * FROM timetable ORDER BY id DESC"
  ).all();

  res.json({
    success: true,
    count: records.length,
    data: records
  });
});

// GET: retrieve one timetable record
app.get("/api/timetable/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "A valid positive ID is required."
    });
  }

  const record = db.prepare(
    "SELECT * FROM timetable WHERE id = ?"
  ).get(id);

  if (!record) {
    return res.status(404).json({
      success: false,
      message: "Timetable record not found."
    });
  }

  res.json({
    success: true,
    data: record
  });
});

// POST: create a timetable record
app.post("/api/timetable", (req, res) => {
  const error = validateCourse(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  const course = cleanCourse(req.body);

  const result = db.prepare(`
    INSERT INTO timetable (
      course_code, course_name, day_of_week,
      start_time, end_time, room, goal
    )
    VALUES (
      @course_code, @course_name, @day_of_week,
      @start_time, @end_time, @room, @goal
    )
  `).run(course);

  const record = db.prepare(
    "SELECT * FROM timetable WHERE id = ?"
  ).get(result.lastInsertRowid);

  res.status(201).json({
    success: true,
    message: "Timetable record created successfully.",
    data: record
  });
});

// PUT: update an existing timetable record
app.put("/api/timetable/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "A valid positive ID is required."
    });
  }

  const existing = db.prepare(
    "SELECT id FROM timetable WHERE id = ?"
  ).get(id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Timetable record not found."
    });
  }

  const error = validateCourse(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  const course = cleanCourse(req.body);

  db.prepare(`
    UPDATE timetable SET
      course_code = @course_code,
      course_name = @course_name,
      day_of_week = @day_of_week,
      start_time = @start_time,
      end_time = @end_time,
      room = @room,
      goal = @goal,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({ ...course, id });

  const record = db.prepare(
    "SELECT * FROM timetable WHERE id = ?"
  ).get(id);

  res.json({
    success: true,
    message: "Timetable record updated successfully.",
    data: record
  });
});

// DELETE: remove a timetable record
app.delete("/api/timetable/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "A valid positive ID is required."
    });
  }

  const result = db.prepare(
    "DELETE FROM timetable WHERE id = ?"
  ).run(id);

  if (result.changes === 0) {
    return res.status(404).json({
      success: false,
      message: "Timetable record not found."
    });
  }

  res.json({
    success: true,
    message: "Timetable record deleted successfully.",
    id
  });
});

// Handle unknown API endpoints
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found."
  });
});

// Handle invalid JSON and unexpected errors
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body."
    });
  }

  console.error(err);

  res.status(500).json({
    success: false,
    message: "An internal server error occurred."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
