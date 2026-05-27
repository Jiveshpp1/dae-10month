console.log("Login loaded — using MySQL backend (no Firebase)");

const SERVER = "http://localhost:3000";
const GOOGLE_CLIENT_ID = "1092891072334-57cccvf9dapcs6tqdjit161ii1trf6k1.apps.googleusercontent.com";

// ─── Save user to localStorage ───────────────────────────────────────────────
function saveUserLocally(id, email, username) {
  localStorage.setItem("user_id", id);
  localStorage.setItem("user_email", email);
  localStorage.setItem("user_name", username);
}

// ─── If already logged in, skip to main ──────────────────────────────────────
if (localStorage.getItem("user_id")) {
  window.location.replace("main.html");
}

// ─── Google callback — fires after user picks account ────────────────────────
async function handleGoogleCredential(response) {
  try {
    const res = await fetch(`${SERVER}/google-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: response.credential })
    });
    const data = await res.json();
    if (data.success) {
      saveUserLocally(data.user.google_id, data.user.email, data.user.username);
      window.location.replace("main.html");
    } else {
      alert("Google login failed: " + (data.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Google login error:", err);
    alert("Could not connect to server. Is it running?");
  }
}

// ─── Initialize Google GSI ONCE on page load ─────────────────────────────────
let googleInitialized = false;

function initGoogle() {
  if (googleInitialized) return;  // ✅ prevent multiple initializations
  if (typeof google === "undefined") {
    console.warn("Google GSI not loaded yet, retrying...");
    setTimeout(initGoogle, 500);
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    ux_mode: "popup",
    cancel_on_tap_outside: true
  });

  // ✅ Render a real Google button — works even when One Tap is blocked by Chrome
  const container = document.getElementById("google-btn-container");
  if (container) {
    google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      width: 250,
      text: "continue_with"
    });
  }

  googleInitialized = true;
  console.log("Google GSI initialized ✅");
}

// Run after page loads
window.addEventListener("load", initGoogle);

// ─── Keep the onclick working too (as a backup) ──────────────────────────────
window.signInWithGoogle = function () {
  const container = document.getElementById("google-btn-container");
  if (container) {
    // Click the rendered Google button programmatically
    const btn = container.querySelector("div[role=button]");
    if (btn) { btn.click(); return; }
  }
  alert("Google sign-in is loading, please try again in a moment.");
};

// ─── EMAIL SIGNUP ─────────────────────────────────────────────────────────────
async function registerUser(email, password) {
  if (!email || !password) return alert("Please fill in all fields.");
  try {
    const res = await fetch(`${SERVER}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, email, password })
    });
    const data = await res.json();
    if (data.success) {
      saveUserLocally(data.user_id, email, email);
      alert("Account created! Welcome :)");
      window.location.replace("main.html");
    } else {
      alert(data.message || "Signup failed. Email may already be in use.");
    }
  } catch (err) {
    console.error("Signup error:", err);
    alert("Could not connect to server. Is it running?");
  }
}

// ─── EMAIL LOGIN ──────────────────────────────────────────────────────────────
async function signInUser(email, password) {
  if (!email || !password) return alert("Please fill in all fields.");
  try {
    const res = await fetch(`${SERVER}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password })
    });
    const data = await res.json();
    if (data.success) {
      saveUserLocally(data.user.id, data.user.email || email, data.user.username || email);
      alert("Welcome back!");
      window.location.replace("main.html");
    } else {
      alert("Wrong email or password, or account does not exist.");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Could not connect to server. Is it running?");
  }
}

// ─── WIRE UP FORMS ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  const signupForm = document.getElementById('s_form');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email    = document.getElementById('username_s').value.trim();
      const password = document.getElementById('password_s').value;
      registerUser(email, password);
    });
  }

  const loginForm = document.getElementById('l_form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email    = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      signInUser(email, password);
    });
  }

});