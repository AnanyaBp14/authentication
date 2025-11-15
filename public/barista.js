const backendURL = "https://mochamist.onrender.com";

let socket = io(backendURL);

/* ---------------- SECTION SWITCH ---------------- */
function showTab(tab) {
  document.getElementById("ordersTab").style.display = tab === "orders" ? "block" : "none";
  document.getElementById("menuTab").style.display = tab === "menu" ? "block" : "none";
}

/* ---------------- AUTH ---------------- */
const token = localStorage.getItem("accessToken");
const user = JSON.parse(localStorage.getItem("user") || "{}");

if (!token || user.role !== "barista") {
  alert("Unauthorized");
  window.location.href = "/";
}

/* Register socket */
socket.emit("register", { token });

/* ---------------- MENU ---------------- */
async function loadMenu() {
  const res = await fetch(`${backendURL}/api/menu`);
  const menu = await res.json();

  const box = document.getElementById("menuList");
  box.innerHTML = "";

  menu.forEach(item => {
    box.innerHTML += `
      <div class="menu-row">
        <div>
          <b>${item.name}</b> - ₹${item.price}<br>
          <small>${item.category}</small>
        </div>
        <button onclick="deleteMenu(${item.id})">Delete</button>
      </div>
    `;
  });
}

async function addMenu() {
  const name = document.getElementById("name").value.trim();
  const category = document.getElementById("category").value.trim();
  const price = parseFloat(document.getElementById("price").value);
  const description = document.getElementById("description").value.trim();

  if (!name || !price) {
    alert("Name and price are required");
    return;
  }

  const res = await fetch(`${backendURL}/api/menu/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ name, category, price, description })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message);
    return;
  }

  alert("Item added!");
  loadMenu();
}

async function deleteMenu(id) {
  if (!confirm("Delete item?")) return;

  const res = await fetch(`${backendURL}/api/menu/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer " + token
    }
  });

  const data = await res.json();
  alert(data.message);
  loadMenu();
}

/* ---------------- ORDERS ---------------- */
async function loadOrders() {
  const res = await fetch(`${backendURL}/api/orders`, {
    headers: { "Authorization": "Bearer " + token }
  });

  const orders = await res.json();

  const box = document.getElementById("ordersList");
  box.innerHTML = "";

  orders.forEach(o => {
    box.innerHTML += `
      <div class="order-card">
        <b>Order #${o.id}</b> — ${o.status}<br>
        <small>${o.time}</small><br><br>

        <button onclick="updateStatus(${o.id}, 'Preparing')">Preparing</button>
        <button onclick="updateStatus(${o.id}, 'Ready')">Ready</button>
        <button onclick="updateStatus(${o.id}, 'Served')">Served</button>
      </div>
    `;
  });
}

async function updateStatus(id, status) {
  const res = await fetch(`${backendURL}/api/orders/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ status })
  });

  const data = await res.json();
  alert(data.message);
  loadOrders();
}

/* ---------------- LOGOUT ---------------- */
function logout() {
  localStorage.clear();
  window.location.href = "/";
}

/* INIT */
loadMenu();
loadOrders();

/* SOCKET UPDATES */
socket.on("order:new", () => loadOrders());
socket.on("order:update", () => loadOrders());
