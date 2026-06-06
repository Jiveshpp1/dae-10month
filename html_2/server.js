require("dotenv").config();

const express = require("express");
const mysql   = require("mysql2");
const cors    = require("cors");
const fetch   = require("node-fetch");
const { OAuth2Client } = require("google-auth-library");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const client = new OAuth2Client(
  "1092891072334-57cccvf9dapcs6tqdjit161ii1trf6k1.apps.googleusercontent.com"
);

/* =========================
   MYSQL
========================= */
const db = mysql.createConnection({
  host:     "localhost",
  user:     "root",
  password: "root",
  database: "study_app_db",
  port:     8889
});

db.connect((err) => {
  if (err) console.error("❌ MySQL connection failed:", err.message);
  else     console.log("✅ MySQL Connected to study_app_db");
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => res.send("✅ Server is alive"));

/* =========================
   GOOGLE LOGIN
========================= */
app.post("/google-login", async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "1092891072334-57cccvf9dapcs6tqdjit161ii1trf6k1.apps.googleusercontent.com"
    });
    const { sub: google_id, email, name: username } = ticket.getPayload();

    db.query("SELECT * FROM users WHERE google_id = ?", [google_id], (err, result) => {
      if (err) return res.json({ success: false, error: err.message });

      if (result.length === 0) {
        db.query(
          "INSERT INTO users (google_id, username, email) VALUES (?, ?, ?)",
          [google_id, username, email],
          (insertErr, insertResult) => {
            if (insertErr) return res.json({ success: false, error: insertErr.message });
            res.json({ success: true, user: { id: insertResult.insertId, google_id, email, username } });
          }
        );
      } else {
        res.json({ success: true, user: { id: result[0].id, google_id, email, username } });
      }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* =========================
   EMAIL LOGIN
========================= */
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.json({ success: false, message: "Missing fields" });

  db.query(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message });
      if (result.length > 0) res.json({ success: true, user: result[0] });
      else res.json({ success: false, message: "Invalid credentials" });
    }
  );
});

/* =========================
   EMAIL SIGNUP
========================= */
app.post("/auth/signup", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password)
    return res.json({ success: false, message: "Missing fields" });

  db.query(
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
    [username, email || null, password],
    (err, result) => {
      if (err) return res.json({ success: false, message: "User already exists", error: err.message });
      res.json({ success: true, user_id: result.insertId });
    }
  );
});

/* =========================
   GET USER
========================= */
app.get("/user/:google_id", (req, res) => {
  db.query("SELECT * FROM users WHERE google_id = ?", [req.params.google_id], (err, result) => {
    if (err) return res.json({ error: err.message });
    if (!result[0]) return res.status(404).json({ message: "User not found" });
    res.json(result[0]);
  });
});

/* =========================
   CHAT — OpenRouter auto
========================= */
app.post("/chat", async (req, res) => {
  const { user_id, prompt, history = [] } = req.body;
  if (!prompt) return res.json({ error: "No prompt provided" });

  try {
    const messages = history.map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text || m.html || ""
    }));
    messages.push({ role: "user", content: prompt });

    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5500",
        "X-Title": "Dookie AI Study App"
      },
      body: JSON.stringify({ model: "openrouter/auto", messages })
    });

    const data = await orRes.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error(data.error?.message || "No response from OpenRouter");

    if (user_id) {
      db.query(
        "INSERT INTO chats (user_id, prompt, response) VALUES (?, ?, ?)",
        [user_id, prompt, reply],
        (err) => { if (err) console.error("Chat DB error:", err.message); }
      );
    }

    res.json({ reply });

  } catch (err) {
    console.error("Chat error:", err.message);
    res.json({ error: err.message });
  }
});

/* =========================
   CHAT HISTORY
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
   CHAT SESSIONS — CREATE
========================= */
app.post("/chat-sessions", (req, res) => {
  const { user_id, session_name } = req.body;
  if (!user_id || !session_name)
    return res.json({ success: false, error: "Missing fields" });

  db.query(
    "INSERT INTO chat_sessions (user_id, session_name) VALUES (?, ?)",
    [user_id, session_name],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true, session_id: result.insertId });
    }
  );
});

/* =========================
   CHAT SESSIONS — GET ALL FOR USER
========================= */
app.get("/chat-sessions/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json(result);
    }
  );
});

/* =========================
   CHAT SESSIONS — UPDATE NAME
========================= */
app.put("/chat-sessions/:session_id", (req, res) => {
  const { session_name } = req.body;
  if (!session_name) return res.json({ success: false, error: "Missing session_name" });

  db.query(
    "UPDATE chat_sessions SET session_name = ? WHERE id = ?",
    [session_name, req.params.session_id],
    (err) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

/* =========================
   CHAT SESSIONS — GET CHATS
========================= */
app.get("/chat-sessions/:session_id/chats", (req, res) => {
  db.query(
    "SELECT * FROM chats WHERE session_id = ? ORDER BY id ASC",
    [req.params.session_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json(result);
    }
  );
});

/* =========================
   CHAT SESSIONS — ADD CHAT
========================= */
app.post("/chat-sessions/:session_id/chats", (req, res) => {
  const { user_id, prompt, response } = req.body;
  if (!user_id || !prompt || !response)
    return res.json({ success: false, error: "Missing fields" });

  db.query(
    "INSERT INTO chats (user_id, prompt, response, session_id) VALUES (?, ?, ?, ?)",
    [user_id, prompt, response, req.params.session_id],
    (err) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

/* =========================
   FLASHCARDS — CREATE
========================= */
app.post("/flashcards", (req, res) => {
  const { user_id, title, content, class_id } = req.body;
  if (!user_id || !title || !content)
    return res.json({ success: false, message: "Missing fields" });

  db.query(
    "INSERT INTO flashcards (user_id, title, content, class_id) VALUES (?, ?, ?, ?)",
    [user_id, title, content, class_id || null],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

/* =========================
   FLASHCARDS — GET FOR USER
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
  db.query("DELETE FROM flashcards WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

/* =========================
   LESSONS — CREATE
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
   LESSONS — GET FOR USER
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
   LESSONS — DELETE
========================= */
app.delete("/lessons/:id", (req, res) => {
  db.query("DELETE FROM lessons WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

/* =========================
   LESSONS — ASSIGN FLASHCARD
========================= */
app.post("/lessons/:lesson_id/flashcards", (req, res) => {
  const { flashcard_id } = req.body;
  if (!flashcard_id) return res.json({ success: false, message: "Missing flashcard_id" });

  db.query(
    "UPDATE flashcards SET lesson_id = ? WHERE id = ?",
    [req.params.lesson_id, flashcard_id],
    (err) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

/* =========================
   LESSONS — GET FLASHCARDS
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
   CLASSES — CREATE
========================= */
app.post("/classes", (req, res) => {
  const { user_id, class_name, description, color } = req.body;
  if (!user_id || !class_name)
    return res.json({ success: false, message: "Missing fields" });

  db.query(
    "INSERT INTO classes (user_id, class_name, description, color) VALUES (?, ?, ?, ?)",
    [user_id, class_name, description || "", color || "#459b71"],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

/* =========================
   CLASSES — GET FOR USER
========================= */
app.get("/classes/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM classes WHERE user_id = ? ORDER BY created_at DESC",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json(result);
    }
  );
});

/* =========================
   CLASSES — DELETE
========================= */
app.delete("/classes/:id", (req, res) => {
  db.query("DELETE FROM classes WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true });
  });
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
   STUDY PLANS — GET FOR USER
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
  db.query("DELETE FROM study_plans WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

/* =========================
   LESSON PLANS — CREATE
========================= */
app.post("/lesson-plans", (req, res) => {
  const { user_id, title, content, class_id } = req.body;
  if (!user_id || !title || !content)
    return res.json({ success: false, message: "Missing fields" });

  db.query(
    "INSERT INTO lesson_plans (user_id, title, content, class_id) VALUES (?, ?, ?, ?)",
    [user_id, title, content, class_id || null],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

/* =========================
   LESSON PLANS — GET FOR USER
========================= */
app.get("/lesson-plans/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM lesson_plans WHERE user_id = ? ORDER BY created_at DESC",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json(result);
    }
  );
});

/* =========================
   LESSON PLANS — GET ONE
========================= */
app.get("/lesson-plans/:id/view", (req, res) => {
  db.query("SELECT * FROM lesson_plans WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.json({ error: err.message });
    res.json(result[0] || {});
  });
});

/* =========================
   LESSON PLANS — DELETE
========================= */
app.delete("/lesson-plans/:id", (req, res) => {
  db.query("DELETE FROM lesson_plans WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

/* =========================
   STUDY GUIDES — CREATE
========================= */
app.post("/study-guides", (req, res) => {
  const { user_id, class_id, title, content } = req.body;
  if (!user_id || !title || !content)
    return res.json({ success: false, message: "Missing fields" });

  db.query(
    "INSERT INTO study_guides (user_id, class_id, title, content) VALUES (?, ?, ?, ?)",
    [user_id, class_id || null, title, content],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

/* =========================
   STUDY GUIDES — GET FOR USER
========================= */
app.get("/study-guides/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM study_guides WHERE user_id = ? ORDER BY created_at DESC",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json(result);
    }
  );
});

/* =========================
   STUDY GUIDES — GET FOR CLASS
========================= */
app.get("/study-guides/class/:class_id", (req, res) => {
  db.query(
    "SELECT * FROM study_guides WHERE class_id = ? ORDER BY created_at DESC",
    [req.params.class_id],
    (err, result) => {
      if (err) return res.json({ error: err.message });
      res.json(result);
    }
  );
});

/* =========================
   STUDY GUIDES — DELETE
========================= */
app.delete("/study-guides/:id", (req, res) => {
  db.query("DELETE FROM study_guides WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true });
  });
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
   QUIZ — GET FOR USER
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
   START
========================= */
app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));