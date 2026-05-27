// ✅ Get real logged-in user ID from localStorage (set during login)
const user_id = localStorage.getItem("user_id") || 1;

// Save a new flashcard to the DB
function saveCard() {
  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();

  if (!title || !content) {
    alert("Please fill in both title and content.");
    return;
  }

  fetch("http://localhost:3000/flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, title, content })
  })
    .then(res => res.json())
    .then(() => {
      // Clear the form fields after saving
      document.getElementById("title").value = "";
      document.getElementById("content").value = "";
      loadCards(); // Reload the list
    })
    .catch(err => console.error("Save card error:", err));
}

// Delete a flashcard by ID
function deleteCard(id) {
  fetch(`http://localhost:3000/flashcards/${id}`, {
    method: "DELETE"
  })
    .then(() => loadCards())
    .catch(err => console.error("Delete card error:", err));
}

// Load all flashcards for the current user
function loadCards() {
  fetch(`http://localhost:3000/flashcards/${user_id}`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("cards");

      if (!data || data.length === 0) {
        container.innerHTML = "<p>No flashcards yet. Create one above!</p>";
        return;
      }

      // Fetch lessons for dropdowns
      fetch(`http://localhost:3000/lessons/${user_id}`)
        .then(res => res.json())
        .then(lessons => {
          container.innerHTML = data.map(c => `
            <div style="border:1px solid #ccc; margin:10px; padding:15px; border-radius:8px; background:#fff;">
              <h3 style="margin:0 0 8px 0">${c.title}</h3>
              <p style="margin:0 0 10px 0">${c.content}</p>
              <button onclick="deleteCard(${c.id})" style="background:red;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">
                Delete
              </button>
              <div style="margin-top:8px;">
                <label style="font-size:13px;">Add to lesson:</label>
                <select onchange="assignFlashcardToLesson(${c.id}, this.value)">
                  <option value="">Select lesson</option>
                  ${lessons.map(l => `<option value="${l.id}">${l.title}</option>`).join("")}
                </select>
              </div>
            </div>
          `).join("");
        });
    })
    .catch(err => console.error("Load cards error:", err));
}

// LESSONS
function createLesson() {
  const title = document.getElementById("lesson-title").value.trim();
  const description = document.getElementById("lesson-desc").value.trim();
  if (!title) return alert("Lesson title required.");
  fetch("http://localhost:3000/lessons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, title, description })
  })
    .then(res => res.json())
    .then(() => {
      document.getElementById("lesson-title").value = "";
      document.getElementById("lesson-desc").value = "";
      loadLessons();
    });
}

function deleteLesson(id) {
  fetch(`http://localhost:3000/lessons/${id}`, { method: "DELETE" })
    .then(() => loadLessons());
}

function loadLessons() {
  fetch(`http://localhost:3000/lessons/${user_id}`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("lessons");
      if (!data || data.length === 0) {
        container.innerHTML = "<p>No lessons yet.</p>";
        return;
      }
      container.innerHTML = data.map(l => `
        <div style="border:1px solid #ccc; margin:10px; padding:10px; border-radius:8px; background:#f9f9f9;">
          <b>${l.title}</b> <span style="color:#888;">${l.description || ""}</span>
          <button onclick="deleteLesson(${l.id})" style="background:red;color:white;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;">Delete</button>
          <button onclick="showLessonFlashcards(${l.id})" style="background:#2ecc71;color:white;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;">View Flashcards</button>
          <div id="lesson-flashcards-${l.id}" style="margin-top:8px;"></div>
        </div>
      `).join("");
    });
}

function showLessonFlashcards(lessonId) {
  fetch(`http://localhost:3000/lessons/${lessonId}/flashcards`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById(`lesson-flashcards-${lessonId}`);
      if (!data || data.length === 0) {
        container.innerHTML = "<i>No flashcards in this lesson.</i>";
        return;
      }
      container.innerHTML = data.map(c => `
        <div style="border:1px solid #eee; margin:5px; padding:5px; border-radius:5px; background:#fff;">
          <b>${c.title}</b>: ${c.content}
        </div>
      `).join("");
    });
}

// Assign flashcard to lesson
function assignFlashcardToLesson(flashcardId, lessonId) {
  fetch(`http://localhost:3000/lessons/${lessonId}/flashcards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flashcard_id: flashcardId })
  }).then(() => {
    loadCards();
    showLessonFlashcards(lessonId);
  });
}

// STUDY PLANS
function createPlan() {
  const title = document.getElementById("plan-title").value.trim();
  const description = document.getElementById("plan-desc").value.trim();
  if (!title) return alert("Plan title required.");
  fetch("http://localhost:3000/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, title, description })
  })
    .then(res => res.json())
    .then(() => {
      document.getElementById("plan-title").value = "";
      document.getElementById("plan-desc").value = "";
      loadPlans();
    });
}

function deletePlan(id) {
  fetch(`http://localhost:3000/plans/${id}`, { method: "DELETE" })
    .then(() => loadPlans());
}

function loadPlans() {
  fetch(`http://localhost:3000/plans/${user_id}`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("plans");
      if (!data || data.length === 0) {
        container.innerHTML = "<p>No study plans yet.</p>";
        return;
      }
      container.innerHTML = data.map(p => `
        <div style="border:1px solid #ccc; margin:10px; padding:10px; border-radius:8px; background:#f9f9f9;">
          <b>${p.title}</b> <span style="color:#888;">${p.description || ""}</span>
          <button onclick="deletePlan(${p.id})" style="background:red;color:white;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;">Delete</button>
        </div>
      `).join("");
    });
}

// Make saveCard available globally (called from HTML button onclick)
window.saveCard = saveCard;
window.deleteCard = deleteCard;

window.createLesson = createLesson;
window.deleteLesson = deleteLesson;
window.showLessonFlashcards = showLessonFlashcards;
window.assignFlashcardToLesson = assignFlashcardToLesson;
window.createPlan = createPlan;
window.deletePlan = deletePlan;

// Load all on page open
loadCards();
loadLessons();
loadPlans();