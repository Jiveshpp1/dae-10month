import { askGemini, askOpenRouter } from './mainai.js';
console.log("AI Area loaded");

const submitbutton = document.getElementById("submit-button");
const stopButton = document.getElementById("stop-button");
const chatwindow = document.getElementById("chat-window");
const modelSelect = document.getElementById("model-select");
const newChatBtn = document.querySelector(".new-chat-btn");
const chatHistoryList = document.querySelector(".chat-history ul");
const fileInput = document.getElementById("openfile");
const uploadedFilesContainer = document.getElementById("uploaded-files");
const filesList = document.getElementById("files-list");

let num = 1;
let uploadedFiles = []; // Store uploaded files
let currentAbortController = null; // For stopping AI generation

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
newChatBtn.addEventListener("click", async () => {
  let chatName = prompt("Enter a name for your new chat:", "New Chat " + (sessions.length + 1));
  if (!chatName) chatName = "New Chat " + (sessions.length + 1);
  
  const userId = getUserId();
  if (!userId) {
    alert("You must be logged in to create a chat session");
    return;
  }
  
  try {
    // Create session in database
    const res = await fetch("http://localhost:3000/chat-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        session_name: chatName
      })
    });
    
    const data = await res.json();
    if (data.success) {
      const newSession = {
        id: data.session_id,
        name: chatName,
        messages: []
      };
      sessions.unshift(newSession);
      currentSessionIdx = 0;
      renderChat();
      renderChatHistory();
    } else {
      alert("Failed to create session: " + (data.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Error creating session:", err);
    alert("Error creating session");
  }
});

// --- Main Chat Logic ---
function getUserId() {
  // Only return if user is logged in (not null/empty/undefined)
  const id = localStorage.getItem("user_id");
  return id && id !== "null" && id !== "undefined" ? id : null;
}

// --- File Upload Handler ---
fileInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  
  for (const file of files) {
    try {
      const text = await file.text();
      uploadedFiles.push({
        name: file.name,
        content: text,
        type: file.type
      });
    } catch (err) {
      console.error("Error reading file:", err);
      alert(`Failed to read file: ${file.name}`);
    }
  }
  
  updateFilesList();
  fileInput.value = ""; // Reset input
});

function updateFilesList() {
  if (uploadedFiles.length === 0) {
    uploadedFilesContainer.style.display = "none";
    filesList.innerHTML = "";
    return;
  }
  
  uploadedFilesContainer.style.display = "block";
  filesList.innerHTML = uploadedFiles.map((f, idx) => `
    <div style="background:#fff;padding:4px 8px;border-radius:4px;font-size:12px;display:flex;align-items:center;gap:4px;">
      <i class="fas fa-file-alt"></i> ${f.name}
      <button onclick="removeFile(${idx})" style="background:none;border:none;cursor:pointer;color:#e74c3c;margin-left:4px;">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join("");
}

window.removeFile = function(idx) {
  uploadedFiles.splice(idx, 1);
  updateFilesList();
};

// --- Stop AI Generation ---
stopButton.addEventListener("click", () => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
    stopButton.style.display = "none";
    submitbutton.style.display = "block";
  }
});

// --- Load chat sessions from SQL database ---
async function loadUserChats() {
  const userId = getUserId();
  if (!userId) {
    console.log("No user logged in, skipping chat load");
    return;
  }

  try {
    console.log("Loading sessions for user:", userId);
    // Get all sessions
    const sessionsRes = await fetch(`http://localhost:3000/chat-sessions/${userId}`);
    if (!sessionsRes.ok) {
      console.error("Failed to fetch sessions, status:", sessionsRes.status);
      return;
    }
    
    const sessionsList = await sessionsRes.json();
    console.log("Loaded sessions:", sessionsList);
    
    if (Array.isArray(sessionsList) && sessionsList.length > 0) {
      // Load chats for each session
      sessions = [];
      for (const session of sessionsList) {
        try {
          const chatsRes = await fetch(`http://localhost:3000/chat-sessions/${session.id}/chats`);
          const chats = await chatsRes.json();
          
          const messages = [];
          if (Array.isArray(chats) && chats.length > 0) {
            chats.forEach(chat => {
              const responseHtml = typeof chat.response === 'string' ? marked.parse(chat.response) : chat.response;
              messages.push({ role: "user", html: chat.prompt });
              messages.push({ role: "ai", html: responseHtml });
            });
          }
          
          sessions.push({
            id: session.id,
            name: session.session_name,
            messages: messages
          });
        } catch (err) {
          console.error("Failed to load chats for session:", session.id, err);
        }
      }
      
      currentSessionIdx = 0;
      console.log("All sessions loaded:", sessions);
      renderChat();
      renderChatHistory();
    } else {
      console.log("No sessions found, creating default session");
      // Create a default session if none exist
      await createDefaultSession(userId);
    }
  } catch (err) {
    console.error("Failed to load user sessions from SQL:", err);
  }
}

// --- Create default session if none exist ---
async function createDefaultSession(userId) {
  try {
    const res = await fetch("http://localhost:3000/chat-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        session_name: "Main Chat"
      })
    });
    
    const data = await res.json();
    if (data.success) {
      sessions = [{
        id: data.session_id,
        name: "Main Chat",
        messages: []
      }];
      currentSessionIdx = 0;
      renderChat();
      renderChatHistory();
      console.log("Default session created");
    }
  } catch (err) {
    console.error("Failed to create default session:", err);
  }
}

submitbutton.addEventListener("click", async function () {
  num = num + 1;
  const userinput = document.getElementById("user-input").value;
  if (!userinput) return;
  document.getElementById("user-input").value = "";

  sessions[currentSessionIdx].messages.push({
    role: "user",
    html: userinput
  });
  renderChat();

  // Show stop button, hide send button
  submitbutton.style.display = "none";
  stopButton.style.display = "block";
  
  // Create abort controller for this request
  currentAbortController = new AbortController();

  try {
    let rawAIResponse;
    const selectedModel = modelSelect ? modelSelect.value : "gemini";
    
    // Get all previous messages as context
    const previousMessages = sessions[currentSessionIdx].messages.slice(0, -1);
    
    // Build prompt with file context if files are uploaded
    let fullPrompt = userinput;
    if (uploadedFiles.length > 0) {
      fullPrompt = "I've uploaded the following files for context:\n\n";
      uploadedFiles.forEach(f => {
        fullPrompt += `--- File: ${f.name} ---\n${f.content}\n\n`;
      });
      fullPrompt += `Now, regarding this context, ${userinput}`;
    }
    
    // Add loading animation message
    const loadingId = `loading-${Date.now()}`;
    sessions[currentSessionIdx].messages.push({
      role: "ai",
      html: `<div id="${loadingId}" style="display:flex;align-items:center;gap:8px;"><span style="font-size:12px;color:#888;">AI is generating response</span><div style="display:inline-flex;gap:4px;"><span style="display:inline-block;width:8px;height:8px;background:#666;border-radius:50%;animation:pulse 1.4s ease-in-out infinite;"></span><span style="display:inline-block;width:8px;height:8px;background:#666;border-radius:50%;animation:pulse 1.4s ease-in-out 0.2s infinite;"></span><span style="display:inline-block;width:8px;height:8px;background:#666;border-radius:50%;animation:pulse 1.4s ease-in-out 0.4s infinite;"></span></div></div>`
    });
    renderChat();
    
    if (selectedModel === "openrouter") {
      rawAIResponse = await askOpenRouter(fullPrompt, previousMessages, currentAbortController.signal);
    } else {
      rawAIResponse = await askGemini(fullPrompt, previousMessages, currentAbortController.signal);
    }
    
    if (!rawAIResponse) throw new Error("Empty response from AI");

    // Remove loading message and add response
    sessions[currentSessionIdx].messages.pop();
    sessions[currentSessionIdx].messages.push({
      role: "ai",
      html: marked.parse(rawAIResponse)
    });
    renderChat();

    // Only save to DB if logged in
    const userId = getUserId();
    if (userId && sessions[currentSessionIdx].id) {
      const sessionId = sessions[currentSessionIdx].id;
      try {
        const saveRes = await fetch(`http://localhost:3000/chat-sessions/${sessionId}/chats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            prompt: userinput,
            response: rawAIResponse
          })
        });
        const saveData = await saveRes.json();
        if (!saveData.success) {
          console.error("Failed to save chat:", saveData.error);
        }
      } catch (saveErr) {
        console.error("Error saving chat to DB:", saveErr);
      }
    }

  } catch (error) {
    console.error("Error:", error);
    
    // If aborted by user, show cancellation message
    if (error.name === 'AbortError') {
      sessions[currentSessionIdx].messages.pop(); // Remove loading message
      sessions[currentSessionIdx].messages.push({
        role: "ai",
        html: "Response generation was stopped."
      });
    } else {
      // Remove loading message and show error
      sessions[currentSessionIdx].messages.pop();
      sessions[currentSessionIdx].messages.push({
        role: "ai",
        html: "Something went wrong. Please try again. Error: " + error.message
      });
    }
    renderChat();
  } finally {
    // Reset UI state
    submitbutton.style.display = "block";
    stopButton.style.display = "none";
    currentAbortController = null;
  }
});

// --- Clear Button ---
const clearBtn = document.getElementById("clear-button");
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (confirm("Clear this chat?")) {
      sessions[currentSessionIdx].messages = [];
      renderChat();
    }
  });
}

// --- Initial Render ---
// Load chats first (async), THEN render
loadUserChats().then(() => {
  renderChat();
  renderChatHistory();
}).catch(err => {
  console.error("Failed to load chats on startup:", err);
  renderChat();
  renderChatHistory();
});