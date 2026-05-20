const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

// DB CONNECTION
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "study_app_db",
  port: 8889
});

db.connect(err => {
  if (err) {
    console.log("DB ERROR:", err);
    return;
  }
  console.log("MySQL Connected");
});


// =====================
// SIGNUP
// =====================
app.post("/signup", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, password],
    (err) => {
      if (err) return res.json(err);
      res.json({ message: "User created" });
    }
  );
});


// =====================
// LOGIN
// =====================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, result) => {
      if (result.length > 0) {
        res.json({ success: true, user: result[0] });
      } else {
        res.json({ success: false });
      }
    }
  );
});


// =====================
// AI CHAT + SAVE
// =====================
app.post("/chat", async (req, res) => {
  const { user_id, prompt } = req.body;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer YOUR_OPENROUTER_KEY",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // save chat
    db.query(
      "INSERT INTO chats (user_id, prompt, response) VALUES (?, ?, ?)",
      [user_id, prompt, reply]
    );

    res.json({ reply });

  } catch (err) {
    res.json({ error: err.message });
  }
});


// =====================
// FLASHCARDS
// =====================
app.post("/flashcards", (req, res) => {
  const { user_id, title, content } = req.body;

  db.query(
    "INSERT INTO flashcards (user_id, title, content) VALUES (?, ?, ?)",
    [user_id, title, content],
    (err) => {
      if (err) return res.json(err);
      res.json({ message: "Flashcard saved" });
    }
  );
});

app.get("/flashcards/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM flashcards WHERE user_id=?",
    [req.params.user_id],
    (err, result) => {
      res.json(result);
    }
  );
});


// =====================
// QUIZ SCORE SAVE
// =====================
app.post("/quiz", (req, res) => {
  const { user_id, score, total } = req.body;

  db.query(
    "INSERT INTO quiz_scores (user_id, score, total) VALUES (?, ?, ?)",
    [user_id, score, total],
    (err) => {
      if (err) return res.json(err);
      res.json({ message: "Score saved" });
    }
  );
});


app.listen(3000, () => {
  console.log("Server running on port 3000");
});