// barista.js
const API = location.origin;

const token = localStorage.getItem("accessToken");
if (!token) location.href = "/";

const socket = io(API, {
  transports: ["websocket", "polling"],
  withCredentials: true
});

socket.on("connect", () => {
  socket.emit("register", { token });
  console.log("Barista connected");
});

socket.on("new-order", (payload) => {
  showToast("New incoming order!");
  loadOrders();
});

socket.on("order:update", () => {
  loadOrders();
});

/* ---------------- PAGE SWITCH ---------------- */
function showPage(p) {
  document.getElementById("ordersPage").style.display = p === "orders" ? "block" : "none";
  document.getElementById("menuPage").style.display = p === "menu" ? "block" : "none";
}

/* ---------------- TOAST ---------------- */
function showToast(msg) {
  const box = document.getElementById("toastBox");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ---------------- LOAD ORDERS ---------------- */
async function loadOrders() {
  try {
    const r = await fetch(`${API}/api/orders/all`, {
      headers: { "Authorization": "Bearer " + token }
    });

    if (!r.ok) return;

    const orders = await r.json();
    const box = document.getElementById("ordersList");
    box.innerHTML = "";

    orders.forEach(o => {
      box.innerHTML += `
        <div class="order-card">
          <b>Order #${o.id}</b><br>
          Status: ${o.status}<br><br>
          Total: ₹${o.total}<br>
          <button onclick="updateStatus(${o.id}, 'Preparing')">Preparing</button>
          <button onclick="updateStatus(${o.id}, 'Ready')">Ready</button>
          <button onclick="updateStatus(${o.id}, 'Served')">Served</button>
        </div>`;
    });

  } catch (err) {
    console.error("Order load error:", err);
  }
}

/* ---------------- UPDATE STATUS ---------------- */
async function updateStatus(id, status) {
  try {
    const r = await fetch(`${API}/api/orders/status/${id}`, {
      method: "PUT",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });

    const data = await r.json();
    if (!r.ok) return showToast(data.message);

    showToast("Status Updated");
    loadOrders();

  } catch (err) {
    console.error(err);
  }
}

/* ---------------- LOAD MENU ---------------- */
async function loadMenu() {
  const r = await fetch(`${API}/api/menu`);
  const menu = await r.json();

  const box = document.getElementById("menuList");
  box.innerHTML = "";

  menu.forEach(m => {
    box.innerHTML += `
      <div class="item-card">
        <b>${m.name}</b><br>
        ₹${m.price} <br><br>
        <button class="delete-btn" onclick="deleteItem(${m.id})">Delete</button>
      </div>`;
  });
}

/* ---------------- ADD MENU ITEM ---------------- */
async function addItem() {
  const name = document.getElementById("m_name").value;
  const description = document.getElementById("m_desc").value;
  const category = document.getElementById("m_cat").value;
  const price = document.getElementById("m_price").value;

  if (!name || !price) return showToast("Missing fields");

  try {
    const r = await fetch(`${API}/api/menu/add`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, description, category, price })
    });

    const data = await r.json();
    if (!r.ok) return showToast(data.message);

    showToast("Item added");
    loadMenu();

  } catch (err) {
    console.error(err);
  }
}

/* ---------------- DELETE MENU ITEM ---------------- */
async function deleteItem(id) {
  try {
    const r = await fetch(`${API}/api/menu/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const data = await r.json();
    if (!r.ok) return showToast(data.message);

    showToast("Item deleted");
    loadMenu();

  } catch (err) {
    console.error(err);
  }
}

/* ---------------- LOGOUT ---------------- */
function logout() {
  localStorage.clear();
  location.href = "/";
}

/* ---------------- INIT ---------------- */
loadOrders();
loadMenu();
