// public/barista.js
const API = "https://mochamist.onrender.com";
const token = localStorage.getItem("accessToken");
if (!token) {
  // not logged in
  window.location.href = "/";
}
const socket = io(API, { transports: ["websocket"], withCredentials: true });
socket.on("connect", () => {
  socket.emit("register", { token });
});

function $(id) { return document.getElementById(id); }

function toast(msg) { alert(msg); }

/* show menu and orders toggles handled by HTML (showPage) */

async function loadMenu() {
  try {
    const r = await fetch(`${API}/api/menu`);
    const data = await r.json();
    const box = $("menuList");
    box.innerHTML = "";

    data.forEach(m => {
      box.innerHTML += `
        <div class="item-card">
          <b>${escapeHtml(m.name)}</b><br>
          ${escapeHtml(m.description || "")}<br>
          <b>₹${Number(m.price).toFixed(2)}</b><br><br>
          <button class="delete-btn" onclick="deleteItem(${m.id})">Delete</button>
        </div>
      `;
    });
  } catch (err) {
    console.error("Load menu error:", err);
    toast("Could not load menu");
  }
}

async function addItem() {
  const name = $("m_name").value.trim();
  const description = $("m_desc").value.trim();
  const category = $("m_cat").value.trim();
  const price = $("m_price").value.trim();

  if (!name || !price) return toast("Name & Price required");

  try {
    const r = await fetch(`${API}/api/menu/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ name, description, category, price: Number(price) })
    });

    const data = await r.json();
    if (!r.ok) return toast(data.message || "Add failed");

    toast("Added!");
    loadMenu();
  } catch (err) {
    console.error("Add item error:", err);
    toast("Server error");
  }
}

async function deleteItem(id) {
  try {
    const r = await fetch(`${API}/api/menu/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token }
    });
    const data = await r.json();
    if (!r.ok) return toast(data.message || "Delete failed");
    toast("Deleted");
    loadMenu();
  } catch (err) {
    console.error("Delete error:", err);
    toast("Server error");
  }
}

async function loadOrders() {
  try {
    const r = await fetch(`${API}/api/orders`, {
      headers: { Authorization: "Bearer " + token }
    });
    const orders = await r.json();
    const box = $("ordersList");
    box.innerHTML = "";
    orders.forEach(o => {
      box.innerHTML += `
        <div class="order-card">
          <b>Order #${o.id}</b> — ${o.status}
          <br><small>${new Date(o.time).toLocaleString()}</small>
          <br><br>
          <button onclick="updateStatus(${o.id}, 'Ready')">Ready</button>
          <button onclick="updateStatus(${o.id}, 'Served')">Served</button>
        </div>
      `;
    });
  } catch (err) {
    console.error("Load orders error:", err);
  }
}

async function updateStatus(id, status) {
  try {
    const r = await fetch(`${API}/api/orders/status/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ status })
    });
    const data = await r.json();
    if (!r.ok) return toast(data.message || "Update failed");
    toast("Status updated");
    loadOrders();
  } catch (err) {
    console.error("Update status error:", err);
    toast("Server error");
  }
}

socket.on("order:new", (payload) => {
  // refresh list when new order comes
  loadOrders();
});

socket.on("order:update", (payload) => {
  loadOrders();
});

socket.on("menu:update", () => {
  loadMenu();
});

/* util */
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* init */
loadMenu();
loadOrders();
