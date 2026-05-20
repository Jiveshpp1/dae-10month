import { firebaseConfig } from './mainai.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app); 
const provider = new GoogleAuthProvider();

console.log("Firebase initialized");

onAuthStateChanged(auth, (user) => {
  if (user) {
    loadUserEvents(user.uid);  // Directly use user.uid
  } else {
    console.warn('No user logged in');
  }
});
//Google Sign-In function
window.signInWithGoogle = function () {
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      console.log("Google user:", user);

      alert("Signed in with Google!");
      window.location.replace("main.html");
    })
    .catch((error) => {
      console.error("Google sign-in error:", error);
      alert(error.message);
    });
};
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
      const email = document.getElementById('username_s').value;
      const password = document.getElementById('password_s').value;
      registerUser(email, password);
    });
  }

  const loginForm = document.getElementById('l_form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      signInUser(email, password);
    });
  }

});