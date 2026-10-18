
const API_URL = "/api/timetable";

const form = document.getElementById("courseForm");
const tableBody = document.getElementById("courseTable");
const message = document.getElementById("message");
const courseId = document.getElementById("courseId");
const formTitle = document.getElementById("formTitle");
const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");

const inputIds = [
  "course_code",
  "course_name",
  "day_of_week",
  "start_time",
  "end_time",
  "room",
  "goal"
];

let messageTimer;

function showMessage(text, type = "success") {
  clearTimeout(messageTimer);
  message.textContent = text;
  message.className = `message ${type}`;

  messageTimer = setTimeout(() => {
    message.className = "message";
  }, 4500);
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(result.message || "The request failed.");
  }

  return result;
}

function getFormData() {
  const data = {};

  for (const id of inputIds) {
    data[id] = document.getElementById(id).value.trim();
  }

  if (data.start_time >= data.end_time) {
    throw new Error("End time must be later than start time.");
  }

  return data;
}

function makeCell(value) {
  const td = document.createElement("td");
  td.textContent = value ?? "";
  return td;
}

function renderCourses(records) {
  tableBody.replaceChildren();

  document.getElementById("totalCourses").textContent =
    records.length;

  document.getElementById("totalDays").textContent =
    new Set(records.map((r) => r.day_of_week)).size;

  document.getElementById("totalGoals").textContent =
    records.filter((r) => r.goal && r.goal.trim()).length;

  document.getElementById("recordCount").textContent =
    `${records.length} course record(s)`;

  if (records.length === 0) {
    const tr = document.createElement("tr");
    const td = makeCell("No courses found. Add your first course above.");
    td.colSpan = 7;
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  for (const record of records) {
    const tr = document.createElement("tr");

    tr.appendChild(makeCell(record.id));
    tr.appendChild(makeCell(
      `${record.course_code} — ${record.course_name}`
    ));
    tr.appendChild(makeCell(record.day_of_week));
    tr.appendChild(makeCell(
      `${record.start_time} - ${record.end_time}`
    ));
    tr.appendChild(makeCell(record.room));
    tr.appendChild(makeCell(record.goal));

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn edit";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editCourse(record.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteCourse(record.id));

    actions.append(editButton, deleteButton);
    actionsCell.appendChild(actions);
    tr.appendChild(actionsCell);

    tableBody.appendChild(tr);
  }
}

async function loadCourses() {
  tableBody.replaceChildren();

  const row = document.createElement("tr");
  const cell = makeCell("Loading courses...");
  cell.colSpan = 7;
  row.appendChild(cell);
  tableBody.appendChild(row);

  try {
    const result = await apiRequest(API_URL);
    renderCourses(result.data);
  } catch (error) {
    tableBody.replaceChildren();

    const tr = document.createElement("tr");
    const td = makeCell(error.message);
    td.colSpan = 7;
    tr.appendChild(td);
    tableBody.appendChild(tr);

    showMessage(error.message, "error");
  }
}

function resetForm() {
  form.reset();
  courseId.value = "";
  formTitle.textContent = "Add a course";
  saveButton.textContent = "Save course";
  cancelButton.hidden = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const data = getFormData();
    const id = courseId.value;

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const result = await apiRequest(
      id ? `${API_URL}/${id}` : API_URL,
      {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      }
    );

    resetForm();
    showMessage(result.message);
    await loadCourses();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = courseId.value
      ? "Update course"
      : "Save course";
  }
});

async function editCourse(id) {
  try {
    const result = await apiRequest(`${API_URL}/${id}`);
    const record = result.data;

    courseId.value = record.id;

    for (const field of inputIds) {
      document.getElementById(field).value = record[field];
    }

    formTitle.textContent = `Edit course #${record.id}`;
    saveButton.textContent = "Update course";
    cancelButton.hidden = false;

    form.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function deleteCourse(id) {
  if (!confirm(`Are you sure you want to delete course record #${id}?`)) {
    return;
  }

  try {
    const result = await apiRequest(`${API_URL}/${id}`, {
      method: "DELETE"
    });

    if (courseId.value === String(id)) {
      resetForm();
    }

    showMessage(result.message);
    await loadCourses();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

cancelButton.addEventListener("click", resetForm);

document.getElementById("refreshButton")
  .addEventListener("click", loadCourses);

loadCourses();
