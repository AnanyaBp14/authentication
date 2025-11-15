const API = "https://mochamist.onrender.com";
let menu = [];
let cart = [];

/* SOCKET.IO */
const socket = io(API, { transports: ["websocket"] });

function $(id) { return document.getElementById(id); }

/* UI SECTION SWITCH */
function showSection(s) {
  $("menuSection").style.display = s === "menu" ? "block" : "none";
  $("cartSection").style.display = s === "cart" ? "block" : "none";
  $("ordersSection").style.display = s === "orders" ? "block" : "none";
}

function showToast(msg) {
  alert(msg);
}

/* ---------------- LOAD MENU ---------------- */
async function loadMenu() {
  try {
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

  } catch (err) {
    console.error(err);
    showToast("Couldn't load menu");
  }
}

/* ---------------- CART ---------------- */
function addToCart(id) {
  const item = menu.find(x => x.id == id);
  const ex = cart.find(x => x.id == id);

  if (ex) ex.qty++;
  else cart.push({ id: item.id, name: item.name, price: Number(item.price), qty: 1 });

  updateCartUI();
}

function updateCartUI() {
  $("cartCount").textContent = cart.reduce((sum, i) => sum + i.qty, 0);

  $("cartItems").innerHTML = cart.map(c =>
    `${c.name} — Qty: ${c.qty}`
  ).join("<br>");
}

/* ---------------- PLACE ORDER ---------------- */
async function placeOrder() {
  const token = localStorage.getItem("accessToken");
  if (!token) return showToast("Login again");

  if (cart.length === 0) return showToast("Cart is empty");

  const subtotal = cart.reduce((a,b)=>a+b.price*b.qty,0);
  const total = +(subtotal * 1.08).toFixed(2);

  try {
    const r = await fetch(`${API}/api/orders/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ items: cart, total })
    });

    const data = await r.json();

    if (!r.ok) return showToast(data.message || "Order failed");

    showToast("Order placed successfully!");

    cart = [];
    updateCartUI();
    loadOrders();

  } catch (err) {
    console.error(err);
    showToast("Server error");
  }
}

/* ---------------- LOAD ORDERS ---------------- */
async function loadOrders() {
  const token = localStorage.getItem("accessToken");
  if (!token) return;

  try {
    const r = await fetch(`${API}/api/orders/mine`, {
      headers: { "Authorization": "Bearer " + token }
    });

    const orders = await r.json();

    $("ordersList").innerHTML = orders.map(o =>
      `Order #${o.id} — ${o.status} — ₹${o.total}`
    ).join("<br>");

  } catch (err) {
    console.error(err);
  }
}

/* ---------------- REAL-TIME SOCKET UPDATE ---------------- */
socket.on("connect", () => {
  const token = localStorage.getItem("accessToken");
  if (token) socket.emit("register", { token });
});

/* 🔥 THIS IS THE MOST IMPORTANT FIX */
socket.on("order:update", ({ order }) => {
  showToast("Order status updated: " + order.status);
  loadOrders();
});

/* ---------------- LOGOUT ---------------- */
function logout() {
  localStorage.clear();
  location.href = "/";
}

/* INIT */
loadMenu();
loadOrders();
