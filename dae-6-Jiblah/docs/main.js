console.log('initial js load');

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase config
import { firebaseConfig } from './config.js';



// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
console.log("Firebase initialized");
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadUserEvents(user.uid);  // Directly use user.uid
    console.log('Userlogeed in', user.email);
  } else {
    console.warn('No user logged in');
    if(window.location.pathname.includes('main.html')){
      window.location.replace('login.html');}
  }
});
function registerUser(email, password){
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredetail) => {
            const user = userCredetail.user;
            console.log('User Created: ', user.email);
            alert('You have created your account :)');
            console.log("Redirecting to main.html...");
            window.location.replace("main.html");  // redirect after signup
        })
        .catch((error) => {
            console.error('Error:', error.code, error.message);
            alert(error.message);
        });
}

// Login function
function signInUser(email, password) {
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredetail) => {
            console.log('Signed in:', userCredetail.user.email);
            alert('Welcome back!');
            window.location.replace("main.html");  // redirect after login
        })
        .catch((error) => {
            console.error('Sign-in error:', error.code, error.message);
            alert('Wrong user of password or your acount doesnt exsit' ,error.message);
        });
}


document.addEventListener('DOMContentLoaded', () => { 
    const monthDisplay = document.getElementById('dateth');
    const calendarGrid = document.getElementById('m-cal');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const eventModal = document.getElementById('event-modal');
    const modalDate = document.getElementById('modal-date');
    const eventTitleInput = document.getElementById('event-title');
    const saveEventBtn = document.getElementById('save');
    const closeBtn = document.getElementById('close');
    const eventList = document.getElementById('event-list');
    const reminderList = document.getElementById('reminder-list');

     
    const signupForm = document.getElementById('s_form');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email_s').value;
        const password = document.getElementById('pass_s').value;
        registerUser(email, password);
      });
    }

    const loginForm = document.getElementById('login_form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('user_name').value;
        const password = document.getElementById('pass').value;
        signInUser(email, password);
      });
    }


    saveEventBtn.addEventListener('click', () => {
      saveEvent();
      renderEvents();
      renderCalendar();
      renderReminders();
    });

    closeBtn.addEventListener('click', closeModal);

    let currentDate = new Date();
    let selectedDate = null;
    let events = {}; 
    onAuthStateChanged(auth, (user) => {
        if (user) {
          console.log("User is signed in:", user.email);
          loadUserEvents(user.uid);
        } else {
          console.log("No user signed in, redirecting to login...");
          window.location.replace("index.html");
        }
      });

    async function loadUserEvents(uid) {
        try {
          const docRef = doc(db, "users", uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            events = docSnap.data().events || {};
            renderCalendar();
            renderEvents();
            renderReminders();
            console.log("Events loaded for user");
          } else {
            console.log("No events found for this user yet.");
            events = {};
            renderCalendar();
            renderEvents();
            renderReminders();
          }
        } catch (error) {
          console.error("Error loading events:", error);
        }
      }
    async function saveUserEvents(uid, events) {
        try {
          await setDoc(doc(db, "users", uid), { events });
          console.log("Events saved to Firestore!");
        } catch (error) {
          console.error("Error saving events:", error);
        }
      }
    function getToday() {
      const t = new Date();``
      return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
    }

    function getTodaysEvents() {
      const todayKey = getToday();
      return events[todayKey] || [];
    }

    function renderReminders() {
      reminderList.innerHTML = '';
      getTodaysEvents().forEach(title => {
        const li = document.createElement('li');
        li.textContent = title;
        reminderList.appendChild(li);
      });
    }

    const mName = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    function renderCalendar(){
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const lastDay = new Date(year,month + 1,0).getDate();
        const firstDayIndex = new Date(year,month,1).getDay();

        monthDisplay.innerText = `${mName[month]} ${year}`;

        calendarGrid.querySelectorAll('.cal-date, .other-month, .today').forEach(el => el.remove());
        calendarGrid.innerHTML = `
        <div class='cal-day'>Sun</div>
        <div class='cal-day'>Mon</div>
        <div class='cal-day'>Tue</div>
        <div class='cal-day'>Wed</div>
        <div class='cal-day'>Thu</div>
        <div class='cal-day'>Fri</div>
        <div class='cal-day'>Sat</div>
        `;

        for (let i = 0; i < firstDayIndex; i++) {
            const blank = document.createElement('div');
            blank.classList.add('other-month');
            calendarGrid.appendChild(blank);
        }

        for (let i = 1; i <= lastDay; i++){
            const dayElement = document.createElement('div');
            dayElement.classList.add('cal-date');
            dayElement.textContent = i;
            calendarGrid.appendChild(dayElement);

            dayElement.addEventListener('click', () => {
                openModal(new Date(year, month, i));
            });

            const today = new Date();
            if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayElement.classList.add('today');
            }

            const key = `${year}-${month}-${i}`;
            if (events[key] && events[key].length > 0) {
                const dot = document.createElement('span');
                dot.classList.add('event-dot');
                dayElement.appendChild(dot);
            }
        }
    }

    prevBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
        renderEvents();
        renderReminders();
    });

    nextBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
        renderEvents();
        renderReminders();
    });

    function openModal(date){
        selectedDate = date;
        modalDate.textContent = date.toDateString();
        eventModal.style.display = 'flex';
    }

    function closeModal(){
        eventModal.style.display = 'none';
        eventTitleInput.value = '';
    }

    async function saveEvent() {
      const eTitle = eventTitleInput.value;
      if (eTitle && selectedDate) {
        const dateStr = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
        if (!events[dateStr]) {
          events[dateStr] = [];
        }
        events[dateStr].push(eTitle);
        closeModal();
        renderCalendar();

        const user = auth.currentUser;
        if (user) {
          await saveUserEvents(user.uid, events);
          renderEvents();
          renderReminders();
        } else {
          console.error("No user logged in — can't save events");
        }
      }
    }
    async function deleteEvent(dateKey, eventIndex) {
      if (!events[dateKey] || events[dateKey][eventIndex] === undefined) return;

      
      events[dateKey].splice(eventIndex, 1);

      
      if (events[dateKey].length === 0) {
        delete events[dateKey];
      }

      const user = auth.currentUser; 
      if (user) {
        await saveUserEvents(user.uid, events);
        renderCalendar();
        renderEvents();
        renderReminders();
      } else {
        console.error("No user logged in - can't delete event");
      }
    }


    function renderEvents() {
      eventList.innerHTML = '';
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      for (const dateKey in events) {
        const [y, m, d] = dateKey.split('-').map(Number);
        if (y === year && m === month) {
          events[dateKey].forEach((title, index) => { 
            const li = document.createElement('li');
            li.textContent = `${d} ${mName[m]}: ${title}`;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = ' '; 
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', () => deleteEvent(dateKey, index)); // FIX: pass index

            li.appendChild(deleteBtn);
            eventList.appendChild(li);
      });
    }
  }
}


    renderCalendar();
    renderEvents();
    renderReminders();
});
