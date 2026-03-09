const fake_EMAIL = "fake@example.com";
const fake_PASSWORD = "fakepassword";
const pass= document.getElementById("pass").value;
const email = document.getElementById("user_name").value;

const loginDiv = document.getElementById("login_div");

const headings = document.getElementsByClassName("yes");

loginDiv.style.border = "2px solid green";
loginDiv.setAttribute("data-active", "true");
const inputs = document.getElementsByTagName("input");
window.onload = alert('If you click close you like mohit')
if (email === fake_EMAIL || pass === fake_PASSWORD) {
    alert("Login successful");
}
else if (email === fake_EMAIL) {
    alert("Incorrect password");
}
else if (pass === fake_PASSWORD) {
    alert("Incorrect email");
}
else {
    alert("Incorrect email and password");
}
document.querySelector(".login").onclick = function(){
    
    const email = document.getElementById("user_name").value;
    const pass = document.getElementById("pass").value;

    checkLogin(email, pass);
}
pageHeading.onmouseover = () => pageHeading.style.color = "orange";
pageHeading.onmouseout = () => pageHeading.style.color = "";
function createGreeting(name, day){
    return "Hello " + name + "! Today is " + day;
}
console.log(createGreeting("Mohit", "Monday"));

for(let i = 0; i < inputs.length; i++){
    inputs[i].style.margin = "5px";
}
const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

for(let i = 0; i < days.length; i++){
    console.log(days[i]);
}
let reminder = setInterval(function(){
    console.log("Remember to check your calendar!");
}, 5000);