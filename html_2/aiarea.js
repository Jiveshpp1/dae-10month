import { askGemini } from './mainai.js';
console.log("AI Area loaded");

const submitbutton = document.getElementById("submit-button");
const chatwindow = document.getElementById("chat-window");
let num = 1;

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
            console.error("KaTeX library not found! Check your HTML head script tags.");
        }

    } catch (error) {
        console.error("Error:", error);
    }
});