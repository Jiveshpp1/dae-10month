// Get logged-in user ID
const userId = localStorage.getItem('user_id');
const userName = localStorage.getItem('user_name');

// Update greeting
const greeting = document.getElementById('user-greeting');
if (userName) {
    greeting.textContent = `Welcome back, ${userName}!`;
} else {
    greeting.textContent = 'Welcome! Please log in to see your content.';
}

// Sign out handler
const signoutLink = document.getElementById('signout-link');
const modal = document.getElementById('signout-modal');
const confirm = document.getElementById('signout-confirm');
const cancel = document.getElementById('signout-cancel');

if (signoutLink) {
    signoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        modal.style.display = 'flex';
    });
}

cancel.addEventListener('click', () => modal.style.display = 'none');
confirm.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'landing.html';
});

// Load flashcards and lesson plans
async function loadDashboard() {
    if (!userId) {
        document.getElementById('flashcards-empty').style.display = 'block';
        document.getElementById('lessons-empty').style.display = 'block';
        return;
    }

    try {
        // Load flashcards
        const flashcardsRes = await fetch(`http://localhost:3000/flashcards/${userId}`);
        const flashcards = await flashcardsRes.json();
        displayFlashcards(flashcards);

        // Load lesson plans
        const lessonsRes = await fetch(`http://localhost:3000/lesson-plans/${userId}`);
        const lessons = await lessonsRes.json();
        displayLessonPlans(lessons);
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

function displayFlashcards(flashcards) {
    const container = document.getElementById('flashcards-container');
    const empty = document.getElementById('flashcards-empty');
    const count = document.getElementById('flashcard-count');

    if (!flashcards || flashcards.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        count.textContent = '0 cards';
        return;
    }

    empty.style.display = 'none';
    count.textContent = `${flashcards.length} cards`;

    container.innerHTML = flashcards.map(card => `
        <div class="item-card">
            <div class="item-title">
                <i class="fas fa-bookmark"></i>
                ${escapeHtml(card.title.substring(0, 30))}
            </div>
            <div class="item-content">${escapeHtml(card.content.substring(0, 80))}</div>
            <div class="item-actions">
                <button class="item-btn" onclick="deleteFlashcard(${card.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function displayLessonPlans(lessons) {
    const container = document.getElementById('lessons-container');
    const empty = document.getElementById('lessons-empty');
    const count = document.getElementById('lesson-count');

    if (!lessons || lessons.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        count.textContent = '0 plans';
        return;
    }

    empty.style.display = 'none';
    count.textContent = `${lessons.length} plans`;

    container.innerHTML = lessons.map(lesson => {
        const created = new Date(lesson.created_at).toLocaleDateString();
        return `
            <div class="item-card">
                <div class="item-title">
                    <i class="fas fa-scroll"></i>
                    ${escapeHtml(lesson.title.substring(0, 30))}
                </div>
                <div style="color:#888;font-size:12px;margin-bottom:8px;">
                    <i class="fas fa-calendar"></i> ${created}
                </div>
                <div class="item-actions">
                    <button class="item-btn" onclick="viewLesson(${lesson.id}, '${escapeAttr(lesson.title)}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="item-btn" onclick="deleteLesson(${lesson.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteFlashcard(id) {
    if (!confirm('Delete this flashcard?')) return;
    
    try {
        const res = await fetch(`http://localhost:3000/flashcards/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadDashboard();
        }
    } catch (err) {
        console.error('Error deleting flashcard:', err);
    }
}

async function deleteLesson(id) {
    if (!confirm('Delete this lesson plan?')) return;
    
    try {
        const res = await fetch(`http://localhost:3000/lesson-plans/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadDashboard();
        }
    } catch (err) {
        console.error('Error deleting lesson:', err);
    }
}

async function viewLesson(id, title) {
    try {
        const res = await fetch(`http://localhost:3000/lesson-plans/${id}/view`);
        const lesson = await res.json();
        
        document.getElementById('lesson-modal-title').textContent = lesson.title || title;
        document.getElementById('lesson-modal-content').innerHTML = lesson.content || 'No content available';
        document.getElementById('lesson-modal').classList.add('active');
    } catch (err) {
        console.error('Error loading lesson:', err);
    }
}

function closeLessonModal() {
    document.getElementById('lesson-modal').classList.remove('active');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return text.replace(/'/g, "\\'");
}

// Load on page load
loadDashboard();