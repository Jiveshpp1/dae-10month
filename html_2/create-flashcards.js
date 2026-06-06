import { askGemini } from './mainai.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const dropzone       = document.getElementById('dropzone');
const fileInput      = document.getElementById('file-input');
const fileChips      = document.getElementById('file-chips');
const contentInput   = document.getElementById('content-input');
const generateBtn    = document.getElementById('generate-btn');
const saveBtn        = document.getElementById('save-btn');
const messageDiv     = document.getElementById('message');
const resultsSection = document.getElementById('results-section');
const cardContainer  = document.getElementById('flashcard-container');
const cardCount      = document.getElementById('card-count');
const numCardsInput  = document.getElementById('num-cards');
const difficultyInput= document.getElementById('difficulty');
const classIdInput   = document.getElementById('class-id');

// ── State ─────────────────────────────────────────────────────────────────────
let uploadedFiles       = [];
let generatedFlashcards = [];

// ── Load classes ──────────────────────────────────────────────────────────────
async function loadClasses() {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    try {
        const res     = await fetch(`http://localhost:3000/classes/${userId}`);
        const classes = await res.json() || [];
        classIdInput.innerHTML =
            '<option value="">📚 No class (optional)</option>' +
            classes.map(c => `<option value="${c.id}">${c.class_name}</option>`).join('');
    } catch (err) {
        console.error('Could not load classes:', err);
    }
}
loadClasses();

// ── File upload ───────────────────────────────────────────────────────────────
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', e => handleFiles(e.target.files));

async function handleFiles(files) {
    for (const file of files) {
        try {
            const text = await file.text();
            uploadedFiles.push({ name: file.name, content: text });
        } catch {
            showMsg('Could not read: ' + file.name, 'error');
        }
    }
    renderChips();
}

function renderChips() {
    fileChips.innerHTML = uploadedFiles.map((f, i) => `
        <div class="file-chip">
            <i class="fas fa-file-alt"></i>${f.name}
            <button onclick="removeFile(${i})" title="Remove"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

window.removeFile = function(idx) {
    uploadedFiles.splice(idx, 1);
    renderChips();
};

// ── Messages ──────────────────────────────────────────────────────────────────
let msgTimer;
function showMsg(text, type = 'success') {
    clearTimeout(msgTimer);
    messageDiv.innerHTML = `<div class="msg ${type}"><i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>${text}</div>`;
    msgTimer = setTimeout(() => messageDiv.innerHTML = '', 5000);
}

// ── Generate ──────────────────────────────────────────────────────────────────
generateBtn.addEventListener('click', generate);

async function generate() {
    const content    = contentInput.value.trim();
    const numCards   = parseInt(numCardsInput.value) || 5;
    const difficulty = difficultyInput.value;

    if (!content && uploadedFiles.length === 0) {
        showMsg('Enter a topic or upload files first.', 'error');
        return;
    }

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner"></span> Generating…';
    resultsSection.style.display = 'none';
    generatedFlashcards = [];

    try {
        let prompt = `Generate exactly ${numCards} flashcards at ${difficulty} level.
Return ONLY raw JSONL — one JSON object per line, no extra text, no markdown fences.
Each line must be exactly: {"question":"...","answer":"..."}`;

        if (uploadedFiles.length > 0) {
            prompt += '\n\nReference material:\n';
            uploadedFiles.forEach(f => {
                prompt += `\n=== ${f.name} ===\n${f.content}\n`;
            });
        }
        if (content) prompt += `\n\nTopic: ${content}`;

        const response = await askGemini(prompt);
        if (!response) throw new Error('No response from AI');

        // Strip any accidental markdown fences then parse JSONL
        const clean = response.replace(/```[a-z]*\n?/gi, '').trim();
        clean.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            try {
                const card = JSON.parse(trimmed);
                if (card.question && card.answer) generatedFlashcards.push(card);
            } catch {
                console.warn('Skipped non-JSON line:', trimmed);
            }
        });

        if (generatedFlashcards.length === 0) {
            showMsg('AI response could not be parsed. Try again.', 'error');
            return;
        }

        renderCards();
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showMsg(`✓ ${generatedFlashcards.length} flashcards generated!`);

    } catch (err) {
        showMsg('Error: ' + err.message, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Flashcards';
    }
}

// ── Render cards ──────────────────────────────────────────────────────────────
function renderCards() {
    cardCount.textContent = `(${generatedFlashcards.length})`;
    cardContainer.innerHTML = generatedFlashcards.map((card, i) => `
        <div class="flashcard" onclick="flip(${i})" id="fc-${i}">
            <div class="flashcard-front" id="front-${i}">${esc(card.question)}</div>
            <div class="flashcard-back"  id="back-${i}">${esc(card.answer)}</div>
            <span class="flip-hint">tap to flip</span>
        </div>
    `).join('');
}

window.flip = function(i) {
    const front = document.getElementById(`front-${i}`);
    const back  = document.getElementById(`back-${i}`);
    const hint  = document.querySelector(`#fc-${i} .flip-hint`);
    const showing = back.style.display === 'block';
    front.style.display = showing ? 'block' : 'none';
    back.style.display  = showing ? 'none'  : 'block';
    if (hint) hint.style.display = showing ? '' : 'none';
};

function esc(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

// ── Save ──────────────────────────────────────────────────────────────────────
saveBtn.addEventListener('click', save);

async function save() {
    const userId = localStorage.getItem('user_id');
    if (!userId) { showMsg('Please log in first.', 'error'); return; }
    if (generatedFlashcards.length === 0) { showMsg('Nothing to save.', 'error'); return; }

    const classId = classIdInput.value || null;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Saving…';

    let saved = 0;
    for (const card of generatedFlashcards) {
        try {
            const res  = await fetch('http://localhost:3000/flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id:  userId,
                    title:    card.question,
                    content:  card.answer,
                    class_id: classId
                })
            });
            const data = await res.json();
            if (data.success) saved++;
        } catch (err) {
            console.error('Save error:', err);
        }
    }

    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save All Flashcards';
    showMsg(`✓ Saved ${saved}/${generatedFlashcards.length} flashcards!`);
    if (saved > 0) setTimeout(() => window.location.href = 'dashboard.html', 1800);
}