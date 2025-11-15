// barista.js
const API = "https://mochamist.onrender.com";
const socket = io(API, { transports: ["websocket"] });

function $(id) { return document.getElementById(id); }

async function loadOrders() {
  const token = localStorage.getItem("accessToken");

  const r = await fetch(`${API}/api/orders`, {
    headers: { "Authorization": "Bearer " + token }
  });

  const orders = await r.json();
  const box = $("ordersList");
  box.innerHTML = "";

  orders.forEach(o => {
    box.innerHTML += `
      <div class="order-card">
        <b>Order #${o.id}</b> — ${o.status}<br>
        Total: ₹${o.total}<br>
        <button onclick="updateStatus(${o.id}, 'Ready')">Ready</button>
        <button onclick="updateStatus(${o.id}, 'Served')">Served</button>
      </div>
    `;
  });
}

async function updateStatus(id, status) {
  const token = localStorage.getItem("accessToken");

  await fetch(`${API}/api/orders/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ status })
  });

  loadOrders();
}

/* MENU LOAD */
async function loadMenu() {
  const r = await fetch(`${API}/api/menu`);
  const list = await r.json();

  const box = $("menuList");
  box.innerHTML = "";

  list.forEach(m => {
    box.innerHTML += `
      <div class="item-card">
        <b>${m.name}</b> — ₹${m.price}<br>
        <button onclick="deleteItem(${m.id})" class="delete-btn">Delete</button>
      </div>
    `;
  });
}

async function addItem() {
  const token = localStorage.getItem("accessToken");

  await fetch(`${API}/api/menu/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      name: $("m_name").value,
      description: $("m_desc").value,
      category: $("m_cat").value,
      price: $("m_price").value
    })
  });

  loadMenu();
}

async function deleteItem(id) {
  const token = localStorage.getItem("accessToken");

  await fetch(`${API}/api/menu/${id}`, {
    method: "DELETE",
    headers: { "Authorization": "Bearer " + token }
  });

  loadMenu();
}

/* SOCKET LIVE UPDATES */
socket.on("order:new", () => loadOrders());
socket.on("order:update", () => loadOrders());
socket.on("menu:update", () => loadMenu());

function showPage(p) {
  $("ordersPage").style.display = p === "orders" ? "block" : "none";
  $("menuPage").style.display = p === "menu" ? "block" : "none";
}

function logout() {
  localStorage.clear();
  location.href = "/";
}

loadOrders();
loadMenu();
