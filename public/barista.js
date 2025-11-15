const API = "https://mochamist.onrender.com";
const token = localStorage.getItem("accessToken");

if (!token) location.href = "/";

const socket = io(API, { transports: ["websocket"] });

function $(id) {
  return document.getElementById(id);
}

/* ------------ PAGE SWITCH ------------ */
function showPage(p) {
  $("ordersPage").style.display = p === "orders" ? "block" : "none";
  $("menuPage").style.display = p === "menu" ? "block" : "none";
}

/* ------------ TOAST ------------ */
function toast(msg) {
  alert(msg);
}

/* ------------ LOAD MENU ------------ */
async function loadMenu() {
  const r = await fetch(`${API}/api/menu`);
  const menu = await r.json();

  const box = $("menuList");
  box.innerHTML = "";

  menu.forEach((m) => {
    box.innerHTML += `
      <div class="item-card">
        <b>${m.name}</b>
        <br>${m.description || ""}
        <br><b>₹${m.price}</b>
        <br><br>
        <button class="delete-btn" onclick="deleteItem(${m.id})">Delete</button>
      </div>
    `;
  });
}

/* ------------ ADD ITEM ------------ */
async function addItem() {
  const name = $("m_name").value.trim();
  const description = $("m_desc").value.trim();
  const category = $("m_cat").value.trim();
  const price = $("m_price").value.trim();

  if (!name || !price) return toast("Name & Price required");

  const r = await fetch(`${API}/api/menu/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ name, description, category, price }),
  });

  const data = await r.json();

  if (!r.ok) return toast(data.message);

  toast("Added!");
  loadMenu();
}

/* ------------ DELETE ITEM ------------ */
async function deleteItem(id) {
  const r = await fetch(`${API}/api/menu/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  });

  const data = await r.json();

  if (!r.ok) return toast(data.message);

  toast("Deleted!");
  loadMenu();
}

/* ------------ LOAD ORDERS ------------ */
async function loadOrders() {
  const r = await fetch(`${API}/api/orders`, {
    headers: { Authorization: "Bearer " + token },
  });

  const orders = await r.json();
  const box = $("ordersList");

  box.innerHTML = "";

  orders.forEach((o) => {
    box.innerHTML += `
      <div class="order-card">
        <b>Order #${o.id}</b> — ${o.status}
        <br>
        <small>${new Date(o.time).toLocaleString()}</small>
        <br><br>
        <button onclick="updateStatus(${o.id}, 'Ready')">Ready</button>
        <button onclick="updateStatus(${o.id}, 'Served')">Served</button>
      </div>
    `;
  });
}

/* ------------ UPDATE STATUS ------------ */
async function updateStatus(id, status) {
  const r = await fetch(`${API}/api/orders/status/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ status }),
  });

  const data = await r.json();
  if (!r.ok) return toast(data.message);

  toast("Updated!");
  loadOrders();
}

/* ------------ SOCKET EVENTS ------------ */
socket.on("menu:update", () => {
  loadMenu();
});

/* ------------ INIT ------------ */
loadMenu();
loadOrders();
