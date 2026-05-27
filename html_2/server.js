const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const fetch = require("node-fetch");
const { OAuth2Client } = require("google-auth-library");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   GOOGLE AUTH CLIENT
========================= */
const client = new OAuth2Client(
  "1092891072334-57cccvf9dapcs6tqdjit161ii1trf6k1.apps.googleusercontent.com"
);

/* =========================
   MYSQL CONNECTION
   ⚠️ Change password/port to match your setup
   Mac MAMP default port = 8889
   Regular MySQL default port = 3306
========================= */
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",       // ← your MySQL password
  database: "study_app_db",
  port: 8889              // ← change to 3306 if not using MAMP
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection failed:", err.message);
  } else {
    console.log("✅ MySQL Connected to study_app_db");
  }
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("✅ Server is alive");
});

/* =========================
   GOOGLE LOGIN
   Verifies Firebase/Google token,
   saves user to DB if new
========================= */
app.post("/google-login", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "1092891072334-57cccvf9dapcs6tqdjit161ii1trf6k1.apps.googleusercontent.com"
    });

    const payload = ticket.getPayload();
    const google_id = payload.sub;
    const email = payload.email;
    const username = payload.name;

    db.query(
      "SELECT * FROM users WHERE google_id = ?",
      [google_id],
      (err, result) => {
        if (err) return res.json({ success: false, error: err.message });

        if (result.length === 0) {
          // New user — insert them
          db.query(
            "INSERT INTO users (google_id, username, email) VALUES (?, ?, ?)",
            [google_id, username, email],
            (insertErr) => {
              if (insertErr) console.error("Insert error:", insertErr.message);
            }
          );
        }

        res.json({ success: true, user: { google_id, email, username } });
      }
    );

  } catch (err) {
    console.error("Google login error:", err.message);
    res.json({ success: false, error: err.message });
  }
});

/* =========================
   EMAIL / PASSWORD LOGIN
   Basic login — matches username + password in DB
========================= */
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ success: false, message: "Missing username or password" });

  db.query(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message });

      if (result.length > 0) {
        res.json({ success: true, user: result[0] });
      } else {
        res.json({ success: false, message: "Invalid credentials" });
      }
    }
  );
});

/* =========================
   EMAIL / PASSWORD SIGNUP
   Registers a new user
========================= */
app.post("/auth/signup", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !password)
    return res.json({ success: false, message: "Missing fields" });

  db.query(
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
    [username, email || null, password],
    (err, result) => {
      if (err) {
        return res.json({ success: false, message: "User already exists or DB error", error: err.message });
      }
      res.json({ success: true, user_id: result.insertId });
    }
  );
});

/* =========================
   GET USER BY GOOGLE ID
========================= */
app.get("/user/:google_id", (req, res) => {
  db.query(
    "SELECT * FROM users WHERE google_id = ?",
    [req.params.google_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      if (!result[0]) return res.status(404).json({ message: "User not found" });
      res.json(result[0]);
    }
  );
});

/* =========================
   CHAT
   Saves prompt + AI response to chats table
   Uses your Gemini key on the frontend —
   this route just saves the history to DB
========================= */
app.post("/chat", (req, res) => {
  const { user_id, prompt, response } = req.body;

  // If frontend sends both prompt + response (from Gemini), just save it
  if (user_id && prompt && response) {
    db.query(
      "INSERT INTO chats (user_id, prompt, response) VALUES (?, ?, ?)",
      [user_id, prompt, response],
      (err) => {
        if (err) return res.json({ success: false, error: err.message });
        res.json({ success: true });
      }
    );
    return;
  }

  // If you want the server to call OpenRouter instead, use this block
  // and add your key below
  const OPENROUTER_KEY = "YOUR_OPENROUTER_KEY"; // ← paste key here if using

  fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openrouter/auto",
      messages: [{ role: "user", content: prompt }]
    })
  })
    .then(r => r.json())
    .then(data => {
      if (!data.choices) return res.json({ error: "No response from AI", raw: data });

      const reply = data.choices[0].message.content;

      db.query(
        "INSERT INTO chats (user_id, prompt, response) VALUES (?, ?, ?)",
        [user_id, prompt, reply],
        (err) => { if (err) console.error("Chat save error:", err.message); }
      );

      res.json({ reply });
    })
    .catch(err => res.json({ error: err.message }));
});

/* =========================
   GET CHAT HISTORY
========================= */
app.get("/chat/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM chats WHERE user_id = ? ORDER BY id DESC LIMIT 50",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json(result);
    }
  );
});

/* =========================
   FLASHCARDS — CREATE
========================= */
app.post("/flashcards", (req, res) => {
  const { user_id, title, content } = req.body;

  if (!user_id || !title || !content)
    return res.json({ success: false, message: "Missing fields" });

  db.query(
    "INSERT INTO flashcards (user_id, title, content) VALUES (?, ?, ?)",
    [user_id, title, content],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

/* =========================
   FLASHCARDS — GET ALL FOR USER
========================= */
app.get("/flashcards/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM flashcards WHERE user_id = ? ORDER BY id DESC",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json(result);
    }
  );
});

/* =========================
   FLASHCARDS — DELETE
========================= */
app.delete("/flashcards/:id", (req, res) => {
  db.query(
    "DELETE FROM flashcards WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

/* =========================
   FLASHCARD LESSONS — CREATE
========================= */
app.post("/lessons", (req, res) => {
  const { user_id, title, description } = req.body;
  if (!user_id || !title)
    return res.json({ success: false, message: "Missing fields" });

  db.query(
    "INSERT INTO lessons (user_id, title, description) VALUES (?, ?, ?)",
    [user_id, title, description || ""],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

/* =========================
   FLASHCARD LESSONS — GET ALL FOR USER
========================= */
app.get("/lessons/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM lessons WHERE user_id = ? ORDER BY id DESC",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json(result);
    }
  );
});

/* =========================
   FLASHCARD LESSONS — DELETE
========================= */
app.delete("/lessons/:id", (req, res) => {
  db.query(
    "DELETE FROM lessons WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

/* =========================
   FLASHCARDS — ASSIGN TO LESSON
========================= */
app.post("/lessons/:lesson_id/flashcards", (req, res) => {
  const { flashcard_id } = req.body;
  const lesson_id = req.params.lesson_id;
  if (!lesson_id || !flashcard_id)
    return res.json({ success: false, message: "Missing fields" });

  db.query(
    "UPDATE flashcards SET lesson_id = ? WHERE id = ?",
    [lesson_id, flashcard_id],
    (err) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

/* =========================
   FLASHCARDS — GET BY LESSON
========================= */
app.get("/lessons/:lesson_id/flashcards", (req, res) => {
  db.query(
    "SELECT * FROM flashcards WHERE lesson_id = ? ORDER BY id DESC",
    [req.params.lesson_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json(result);
    }
  );
});

/* =========================
   STUDY PLANS — CREATE
========================= */
app.post("/plans", (req, res) => {
  const { user_id, title, description } = req.body;
  if (!user_id || !title)
    return res.json({ success: false, message: "Missing fields" });

  db.query(
    "INSERT INTO study_plans (user_id, title, description) VALUES (?, ?, ?)",
    [user_id, title, description || ""],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

/* =========================
   STUDY PLANS — GET ALL FOR USER
========================= */
app.get("/plans/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM study_plans WHERE user_id = ? ORDER BY id DESC",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json(result);
    }
  );
});

/* =========================
   STUDY PLANS — DELETE
========================= */
app.delete("/plans/:id", (req, res) => {
  db.query(
    "DELETE FROM study_plans WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

/* =========================
   QUIZ — SAVE SCORE
========================= */
app.post("/quiz", (req, res) => {
  const { user_id, score, total } = req.body;

  if (!user_id || score == null || !total)
    return res.json({ success: false, message: "Missing fields" });

  db.query(
    "INSERT INTO quiz_scores (user_id, score, total) VALUES (?, ?, ?)",
    [user_id, score, total],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

/* =========================
   QUIZ — GET SCORES FOR USER
========================= */
app.get("/quiz/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM quiz_scores WHERE user_id = ? ORDER BY id DESC",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json(result);
    }
  );
});

/* =========================
   STUDENTS
========================= */
app.get("/students", (req, res) => {
  db.query("SELECT * FROM students", (err, result) => {
    if (err) return res.json({ error: err.message });
    res.json(result);
  });
});

app.post("/students", (req, res) => {
  const { name, grade } = req.body;
  db.query(
    "INSERT INTO students (name, grade) VALUES (?, ?)",
    [name, grade],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

/* =========================
   START SERVER
========================= */
app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));