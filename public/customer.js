const API = "https://mochamist.onrender.com";
let menu = [];
let cart = [];

// socket
const socket = io(API, { transports: ["websocket"], withCredentials: true });

// helper
const $ = (id) => document.getElementById(id);

/* -----------------------------------------
   GLOBAL FUNCTIONS (IMPORTANT)
------------------------------------------*/
window.showSection = function (section) {
  $("menuSection").style.display = section === "menu" ? "block" : "none";
  $("cartSection").style.display = section === "cart" ? "block" : "none";
  $("ordersSection").style.display = section === "orders" ? "block" : "none";
};

window.logout = function () {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  window.location.href = "/";
};

window.addToCart = function (id) {
  const item = menu.find(m => m.id == id);
  if (!item) return;

  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty++;
  else cart.push({ id, name: item.name, price: item.price, qty: 1 });

  updateCart();
};

window.placeOrder = async function () {
  const token = localStorage.getItem("accessToken");
  if (!token) return showToast("Login first");

  if (cart.length === 0) return showToast("Cart empty");

  const total = cart.reduce((a, b) => a + b.qty * b.price, 0);

  const r = await fetch(`${API}/api/orders`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ items: cart, total })
  });

  const data = await r.json();

  if (!r.ok) return showToast(data.message || "Order failed");

  showToast("Order placed!");
  cart = [];
  updateCart();
  loadOrders();
};

/* -----------------------------------------
   NORMAL FUNCTIONS
------------------------------------------*/
function updateCart() {
  $("cartCount").innerText = cart.reduce((a, b) => a + b.qty, 0);

  const box = $("cartItems");
  box.innerHTML = "";

  cart.forEach((item, i) => {
    box.innerHTML += `
      <div class="cart-item">
        <div>${item.name} (x${item.qty})</div>
        <button onclick="window.removeItem(${i})">Remove</button>
      </div>
    `;
  });
}

window.removeItem = function (i) {
  cart.splice(i, 1);
  updateCart();
};

function showToast(msg) {
  const box = $("toastBox");
  const div = document.createElement("div");
  div.className = "toast";
  div.innerText = msg;
  box.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

async function loadMenu() {
  const r = await fetch(`${API}/api/menu`);
  menu = await r.json();

  const box = $("menuGrid");
  box.innerHTML = "";

  menu.forEach(m => {
    box.innerHTML += `
      <div class="menu-card">
        <div class="menu-title">${m.name}</div>
        <div class="menu-desc">${m.description || ""}</div>
        <div style="display:flex;justify-content:space-between;margin-top:10px;">
          <div class="menu-price">₹${m.price}</div>
          <button class="add-btn" onclick="addToCart(${m.id})">Add</button>
        </div>
      </div>
    `;
  });
}

async function loadOrders() {
  const token = localStorage.getItem("accessToken");
  if (!token) return;

  const r = await fetch(`${API}/api/orders/mine`, {
    headers: { "Authorization": "Bearer " + token }
  });

  const orders = await r.json();

  $("ordersList").innerHTML = orders
    .map(o => `<div class="cart-item">Order #${o.id} — ${o.status} — ₹${o.total}</div>`)
    .join("");
}

/* INIT */
loadMenu();
loadOrders();
updateCart();
