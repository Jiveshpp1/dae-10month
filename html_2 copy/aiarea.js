import { askGemini } from './mainai.js';
console.log("AI Area loaded");

const submitbutton = document.getElementById("submit-button");
const chatwindow = document.getElementById("chat-window");
let num = 1;
async function getJoke() {
    const res = await fetch("https://api.chucknorris.io/jokes/random");

    if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
    }

    const data = await res.json();
    return data.value;
}
submitbutton.addEventListener("click", async function() {
    num = num + 1;  
    const userinput = document.getElementById("user-input").value;
    if (!userinput) return; 

    chatwindow.innerHTML += `
        <div class="message user"><div class="message-inner"><div class="text">${userinput}</div></div></div>
        <div class="message ai"><div class="message-inner">
            <div class="avatar-ai"><i class="fas fa-robot"></i></div>
            <div class="text" id="airesponce${num}">Thinking...</div>
        </div></div>`;

    chatwindow.scrollTop = chatwindow.scrollHeight;

    try {
        const rawAIResponse = await askGemini(userinput);
        if (!rawAIResponse) {
            throw new Error("Empty response from API");
        }

        const responseBox = document.getElementById("airesponce" + num);

        // 1. Convert Markdown to HTML
        responseBox.innerHTML = marked.parse(rawAIResponse);

        // 2. THE FIX: If the auto-render fails, we force it manually
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(responseBox, {
                delimiters: [
                    {left: '$$', right: '$$', display: false},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: false}
                ],
                throwOnError: false
            });
        } else {
            console.error("KaTeX library not found! ");
        }

    } catch (error) {
        console.error("Error:", error);
    }
});
fetch("http://localhost:3000/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: 1,
    prompt: userInput
  })
})
.then(res => res.json())
.then(data => {
  console.log(data.reply);
});
fetch("http://localhost:3000/flashcards", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: 1,
    title: "Photosynthesis",
    content: "Plants use sunlight"
  })
});
fetch("http://localhost:3000/quiz", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: 1,
    score: 8,
    total: 10
  })
});