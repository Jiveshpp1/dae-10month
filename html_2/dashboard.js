const user_id = 1;

function saveCard() {
  fetch("http://localhost:3000/flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id,
      title: document.getElementById("title").value,
      content: document.getElementById("content").value
    })
  }).then(loadCards);
}

function loadCards() {
  fetch(`http://localhost:3000/flashcards/${user_id}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById("cards").innerHTML =
        data.map(c =>
          `<div style="border:1px solid black;margin:10px;padding:10px">
            <h3>${c.title}</h3>
            <p>${c.content}</p>
          </div>`
        ).join("");
    });
}

loadCards();