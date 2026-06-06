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
const guideContent   = document.getElementById('guide-content');
const guideTypeInput = document.getElementById('guide-type');
const depthInput     = document.getElementById('depth');
const classIdInput   = document.getElementById('class-id');

// ── State ─────────────────────────────────────────────────────────────────────
let uploadedFiles  = [];
let generatedGuide = null;
let guideTitle     = '';

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
    const content   = contentInput.value.trim();
    const guideType = guideTypeInput.value;
    const depth     = depthInput.value;

    if (!content && uploadedFiles.length === 0) {
        showMsg('Enter a topic or upload files first.', 'error');
        return;
    }

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner"></span> Generating…';
    resultsSection.style.display = 'none';
    generatedGuide = null;

    try {
        let prompt = `Create a detailed ${guideType} study guide at ${depth} level.

Return clean HTML only — no markdown fences, no preamble, no explanation.
Use these tags for structure:
- <h2> for main sections
- <h3> for subsections  
- <p> for body text
- <ul><li> for lists
- <strong> to highlight key terms
- <em> for emphasis`;

        if (guideType === 'qa') {
            prompt += '\nStructure as Question (<h3>) followed by Answer (<p>) pairs throughout.';
        } else if (guideType === 'outline') {
            prompt += '\nUse deeply nested <ul><li> hierarchy. Minimal prose.';
        } else if (guideType === 'summary') {
            prompt += '\nBe concise. Cover key points only. Include a key takeaways <ul> at the end.';
        }

        if (uploadedFiles.length > 0) {
            prompt += '\n\nBased on this content:\n';
            uploadedFiles.forEach(f => { prompt += `\n=== ${f.name} ===\n${f.content}\n`; });
        }
        if (content) {
            prompt += `\n\nTopic: ${content}`;
            guideTitle = content;
        }

        const response = await askGemini(prompt);
        if (!response) throw new Error('No response from AI');

        // Strip accidental markdown fences
        generatedGuide = response.replace(/```[a-z]*\n?/gi, '').trim();

        guideContent.innerHTML = generatedGuide;
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showMsg('✓ Study guide generated!');

    } catch (err) {
        showMsg('Error: ' + err.message, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Study Guide';
    }
}

// ── Save ──────────────────────────────────────────────────────────────────────
saveBtn.addEventListener('click', save);

async function save() {
    const userId = localStorage.getItem('user_id');
    if (!userId) { showMsg('Please log in first.', 'error'); return; }
    if (!generatedGuide) { showMsg('Nothing to save.', 'error'); return; }

    const classId = classIdInput.value || null;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Saving…';

    try {
        const res  = await fetch('http://localhost:3000/study-guides', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id:  userId,
                class_id: classId,
                title:    guideTitle || 'Study Guide ' + new Date().toLocaleDateString(),
                content:  generatedGuide
            })
        });
        const data = await res.json();
        if (data.success) {
            showMsg('✓ Study guide saved!');
            setTimeout(() => window.location.href = 'dashboard.html', 1800);
        } else {
            showMsg('Error: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (err) {
        showMsg('Error saving: ' + err.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Study Guide';
    }
}