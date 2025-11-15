const API = "https://mochamist.onrender.com";
let menu = [];
let cart = [];

const socket = io(API, { transports: ["websocket"] });

function $(id) { return document.getElementById(id); }

function showSection(s) {
  $("menuSection").style.display = s === "menu" ? "block" : "none";
  $("cartSection").style.display = s === "cart" ? "block" : "none";
  $("ordersSection").style.display = s === "orders" ? "block" : "none";
}

function showToast(msg) {
  alert(msg); // simplified for now
}

/* MENU */
async function loadMenu() {
  const r = await fetch(`${API}/api/menu`);
  menu = await r.json();

  const box = $("menuGrid");
  box.innerHTML = "";

  menu.forEach(m => {
    box.innerHTML += `
      <div class="menu-card">
        <b>${m.name}</b><br>
        <small>${m.description || ""}</small><br>
        <b>₹${Number(m.price).toFixed(2)}</b><br>
        <button onclick="addToCart(${m.id})">Add</button>
      </div>
    `;
  });
}

/* CART */
function addToCart(id) {
  const item = menu.find(x => x.id == id);
  const ex = cart.find(x => x.id == id);

  if (ex) ex.qty++;
  else cart.push({ id: item.id, name: item.name, price: Number(item.price), qty: 1 });

  updateCartUI();
}

function updateCartUI() {
  $("cartCount").textContent = cart.reduce((a,b)=>a+b.qty,0);
  $("cartItems").innerHTML = cart.map(c =>
    `${c.name} — Qty: ${c.qty}`
  ).join("<br>");
}

/* PLACE ORDER */
async function placeOrder() {
  const token = localStorage.getItem("accessToken");
  if (!token) return showToast("Login again");

  const subtotal = cart.reduce((a,b)=>a+b.price*b.qty,0);
  const total = +(subtotal * 1.08).toFixed(2);

  const r = await fetch(`${API}/api/orders/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ items: cart, total })
  });

  const data = await r.json();
  if (!r.ok) return showToast("Order failed");

  showToast("Order placed!");
  cart = [];
  updateCartUI();
  loadOrders();
}

/* LOAD ORDERS */
async function loadOrders() {
  const token = localStorage.getItem("accessToken");
  if (!token) return;

  const r = await fetch(`${API}/api/orders/mine`, {
    headers: { "Authorization": "Bearer " + token }
  });

  const orders = await r.json();
  $("ordersList").innerHTML = orders.map(o =>
    `Order #${o.id} — ${o.status} — ₹${o.total}`
  ).join("<br>");
}

function logout() {
  localStorage.clear();
  location.href = "/";
}

/* INIT */
loadMenu();
loadOrders();
