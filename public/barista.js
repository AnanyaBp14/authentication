const API = "https://mochamist.onrender.com";
const socket = io(API, { transports: ["websocket"] });

function $(id) { return document.getElementById(id); }

// Toast message
function showToast(msg) {
  const box = $("toastBox");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ------------------- Tabs ------------------- */
function showTab(tab) {
  $("ordersSection").style.display = tab === "orders" ? "block" : "none";
  $("menuSection").style.display = tab === "menu" ? "block" : "none";

  $("tabOrders").classList.remove("active");
  $("tabMenu").classList.remove("active");

  if (tab === "orders") $("tabOrders").classList.add("active");
  else $("tabMenu").classList.add("active");
}

/* ---------------------------------------------------
   LOAD ALL ORDERS
--------------------------------------------------- */
async function loadOrders() {
  const token = localStorage.getItem("accessToken");

  const r = await fetch(`${API}/api/orders`, {
    headers: { Authorization: "Bearer " + token }
  });

  const orders = await r.json();
  const box = $("ordersGrid");
  box.innerHTML = "";

  orders.forEach(o => {
    box.innerHTML += `
      <div class="card">
        <b>Order #${o.id}</b> <br>
        <span class="muted">${new Date(o.time).toLocaleString()}</span><br><br>

        <div><b>Status:</b> ${o.status}</div>

        <div style="margin-top:12px;">
          <button onclick="updateStatus(${o.id}, 'Preparing')" class="status-btn">Preparing</button>
          <button onclick="updateStatus(${o.id}, 'Ready')" class="status-btn">Ready</button>
          <button onclick="updateStatus(${o.id}, 'Served')" class="status-btn">Served</button>
        </div>

        <div style="margin-top:12px;">
          <b>Total:</b> ₹${o.total}
        </div>
      </div>
    `;
  });
}

/* ---------------------------------------------------
   UPDATE ORDER STATUS
--------------------------------------------------- */
async function updateStatus(id, status) {
  const token = localStorage.getItem("accessToken");

  const r = await fetch(`${API}/api/orders/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ status })
  });

  const data = await r.json();
  showToast("Status updated to " + status);
  loadOrders();
}

/* ---------------------------------------------------
   LOAD MENU ITEMS
--------------------------------------------------- */
async function loadMenu() {
  const r = await fetch(`${API}/api/menu`);
  const menu = await r.json();

  const box = $("menuGrid");
  box.innerHTML = "";

  menu.forEach(m => {
    box.innerHTML += `
      <div class="card">
        <b>${m.name}</b> <br>
        <span class="muted">${m.description || ""}</span><br>
        <b>₹${m.price}</b>

        <div style="margin-top:12px;">
          <button onclick="editMenuItem(${m.id}, '${escapeHtml(m.name)}', '${escapeHtml(m.description)}', '${m.category}', ${m.price})">Edit</button>
          <button class="danger" onclick="deleteMenuItem(${m.id})">Delete</button>
        </div>
      </div>
    `;
  });
}

/* ---------------------------------------------------
   ADD MENU ITEM
--------------------------------------------------- */
function openAddMenuForm() {
  const name = prompt("Enter item name:");
  if (!name) return;

  const desc = prompt("Enter description:");
  const cat = prompt("Category:");
  const price = prompt("Price:");

  addMenu(name, desc, cat, price);
}

async function addMenu(name, description, category, price) {
  const token = localStorage.getItem("accessToken");

  const r = await fetch(`${API}/api/menu/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ name, description, category, price })
  });

  const data = await r.json();
  showToast("Menu item added");
  loadMenu();
}

/* ---------------------------------------------------
   EDIT MENU ITEM
--------------------------------------------------- */
function editMenuItem(id, oldName, oldDesc, oldCategory, oldPrice) {
  const name = prompt("Name:", oldName);
  if (!name) return;

  const desc = prompt("Description:", oldDesc);
  const cat = prompt("Category:", oldCategory);
  const price = prompt("Price:", oldPrice);

  updateMenu(id, name, desc, cat, price);
}

async function updateMenu(id, name, description, category, price) {
  const token = localStorage.getItem("accessToken");

  const r = await fetch(`${API}/api/menu/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ name, description, category, price })
  });

  showToast("Updated");
  loadMenu();
}

/* ---------------------------------------------------
   DELETE MENU ITEM
--------------------------------------------------- */
async function deleteMenuItem(id) {
  const token = localStorage.getItem("accessToken");

  if (!confirm("Delete item?")) return;

  await fetch(`${API}/api/menu/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });

  showToast("Item deleted");
  loadMenu();
}

/* ---------------------------------------------------
   SOCKET.IO REAL-TIME UPDATES
--------------------------------------------------- */
socket.on("connect", () => {
  const token = localStorage.getItem("accessToken");
  if (token) socket.emit("register", { token });
});

socket.on("order:new", payload => {
  showToast("New order received!");
  loadOrders();
});

socket.on("order:update", payload => {
  showToast("Order updated");
  loadOrders();
});

/* ---------------------------------------------------
   AUTH
--------------------------------------------------- */
function logout() {
  localStorage.clear();
  window.location.href = "/";
}

/* ---------------------------------------------------
   UTIL
--------------------------------------------------- */
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}

/* INIT */
loadOrders();
loadMenu();
