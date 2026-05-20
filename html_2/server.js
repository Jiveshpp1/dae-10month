const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const fetch = require("node-fetch");
const { OAuth2Client } = require("google-auth-library");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   GOOGLE AUTH
========================= */
const client = new OAuth2Client(
  "1092891072334-57cccvf9dapcs6tqdjit161ii1trf6k1.apps.googleusercontent.com"
);

/* =========================
   DB
========================= */
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "study_app_db",
  port: 8889
});

db.connect(() => console.log("MySQL Connected"));

/* =========================
   GOOGLE LOGIN (ONLY ONCE)
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
      "SELECT * FROM users WHERE google_id=?",
      [google_id],
      (err, result) => {
        if (result.length === 0) {
          db.query(
            "INSERT INTO users (google_id, username, email) VALUES (?, ?, ?)",
            [google_id, username, email]
          );
        }

        res.json({
          success: true,
          user: { google_id, email, username }
        });
      }
    );

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* =========================
   EMAIL LOGIN
========================= */
app.post("/auth/login", (req, res) => {
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

/* =========================
   CHAT
========================= */
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

    db.query(
      "INSERT INTO chats (user_id, prompt, response) VALUES (?, ?, ?)",
      [user_id, prompt, reply]
    );

    res.json({ reply });

  } catch (err) {
    res.json({ error: err.message });
  }
});

/* =========================
   FLASHCARDS
========================= */
app.post("/flashcards", (req, res) => {
  const { user_id, title, content } = req.body;

  db.query(
    "INSERT INTO flashcards (user_id, title, content) VALUES (?, ?, ?)",
    [user_id, title, content],
    () => res.json({ success: true })
  );
});

app.get("/flashcards/:id", (req, res) => {
  db.query(
    "SELECT * FROM flashcards WHERE user_id=?",
    [req.params.id],
    (err, result) => res.json(result)
  );
});

/* =========================
   QUIZ
========================= */
app.post("/quiz", (req, res) => {
  const { user_id, score, total } = req.body;

  db.query(
    "INSERT INTO quiz_scores (user_id, score, total) VALUES (?, ?, ?)",
    [user_id, score, total],
    () => res.json({ success: true })
  );
});

/* =========================
   USER GET
========================= */
app.get("/user/:google_id", (req, res) => {
  db.query(
    "SELECT * FROM users WHERE google_id=?",
    [req.params.google_id],
    (err, result) => {
      res.json(result[0]);
    }
  );
});
app.get("/", (req, res) => {
  res.send("Server is alive");
});
/* =========================
   START
========================= */
app.listen(3000, () => console.log("Server running on 3000"));