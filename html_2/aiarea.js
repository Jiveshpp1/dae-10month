import { askGemini, askOpenRouter } from './mainai.js';
console.log("AI Area loaded");

const submitbutton = document.getElementById("submit-button");
const chatwindow = document.getElementById("chat-window");
const modelSelect = document.getElementById("model-select");
const newChatBtn = document.querySelector(".new-chat-btn");
const chatHistoryList = document.querySelector(".chat-history ul");
let num = 1;

// --- Chat Sessions ---
let sessions = [
  { id: Date.now(), name: "New Chat", messages: [] }
];
let currentSessionIdx = 0;

function renderChat() {
  chatwindow.innerHTML = sessions[currentSessionIdx].messages.map(m =>
    `<div class="message ${m.role}">
      <div class="message-inner">
        ${m.role === "ai" ? '<div class="avatar-ai"><i class="fas fa-robot"></i></div>' : ""}
        <div class="text">${m.html}</div>
      </div>
    </div>`
  ).join("");
  chatwindow.scrollTop = chatwindow.scrollHeight;
}

function renderChatHistory() {
  chatHistoryList.innerHTML = sessions.map((s, i) =>
    `<li class="${i === currentSessionIdx ? "active" : ""}" onclick="switchSession(${i})">
      <i class="far fa-message"></i> ${s.name}
    </li>`
  ).join("");
}

// --- Expose switchSession globally for inline onclick ---
window.switchSession = function(idx) {
  currentSessionIdx = idx;
  renderChat();
  renderChatHistory();
};

// --- New Chat Button ---
newChatBtn.addEventListener("click", () => {
  const newSession = {
    id: Date.now(),
    name: "New Chat " + (sessions.length + 1),
    messages: []
  };
  sessions.unshift(newSession);
  currentSessionIdx = 0;
  renderChat();
  renderChatHistory();
});

// --- Main Chat Logic ---
function getUserId() {
  return localStorage.getItem("user_id") || 1;
}

submitbutton.addEventListener("click", async function () {
  num = num + 1;
  const userinput = document.getElementById("user-input").value;
  if (!userinput) return;
  document.getElementById("user-input").value = "";

  // Add user message to session
  sessions[currentSessionIdx].messages.push({
    role: "user",
    html: userinput
  });
  renderChat();

  try {
    let rawAIResponse;
    const selectedModel = modelSelect ? modelSelect.value : "gemini";
    if (selectedModel === "openrouter") {
      rawAIResponse = await askOpenRouter(userinput);
    } else {
      rawAIResponse = await askGemini(userinput);
    }
    if (!rawAIResponse) throw new Error("Empty response from AI");

    // Add AI message to session
    sessions[currentSessionIdx].messages.push({
      role: "ai",
      html: marked.parse(rawAIResponse)
    });
    renderChat();

    // Save chat to DB
    await fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: getUserId(),
        prompt: userinput,
        response: rawAIResponse
      })
    });

  } catch (error) {
    console.error("Error:", error);
    sessions[currentSessionIdx].messages.push({
      role: "ai",
      html: "Something went wrong. Please try again."
    });
    renderChat();
  }
});

// --- Initial Render ---
renderChat();
renderChatHistory();