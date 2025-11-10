console.log('initial js load');

// Import the functions you need

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged} 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log('import');
import {firebaseConfig} from './config.js';
initializeApp(firebaseConfig);




// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

console.log("Firebase initialized");
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadUserEvents(user.uid);  // Directly use user.uid
  } else {
    console.warn('No user logged in');
    window.location.replace('login.html'); // Optional: redirect to login if not signed in
  }
});



// Signup function
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

});
