// customer.js — final
const API = "https://mochamist.onrender.com";
let menu = [];
let cart = [];

const socket = io(API, {
  transports: ["websocket", "polling"],
  withCredentials: true,
});

function $(id) {
  return document.getElementById(id);
}

function showSection(s) {
  $("menuSection").style.display = s === "menu" ? "block" : "none";
  $("cartSection").style.display = s === "cart" ? "block" : "none";
  $("ordersSection").style.display = s === "orders" ? "block" : "none";
}

function showToast(msg) {
  const box = $("toastBox");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ---------------- MENU ------------------- */
async function loadMenu() {
  try {
    const r = await fetch(`${API}/api/menu`);
    menu = await r.json();

    const box = $("menuGrid");
    box.innerHTML = "";

    menu.forEach((m) => {
      box.innerHTML += `
        <div class="menu-card">
          <div class="menu-title">${m.name}</div>
          <div class="menu-desc">${m.description || ""}</div>
          <div class="menu-price">₹${Number(m.price).toFixed(2)}</div>
          <button class="add-btn" onclick="addToCart(${m.id})">Add</button>
        </div>`;
    });
  } catch (err) {
    console.error(err);
    showToast("Menu load failed");
  }
}

/* ---------------- CART ------------------- */
function addToCart(id) {
  const item = menu.find((m) => m.id == id);
  if (!item) return;

  const existing = cart.find((c) => c.id == id);

  if (existing) existing.qty++;
  else cart.push({ id: item.id, name: item.name, price: Number(item.price), qty: 1 });

  updateCartUI();
  showToast("Added to cart");
}

function updateCartUI() {
  $("cartCount").textContent = cart.reduce((a, b) => a + b.qty, 0);

  const box = $("cartItems");
  box.innerHTML = "";

  if (!cart.length) return (box.innerHTML = "Cart empty");

  cart.forEach((c, i) => {
    box.innerHTML += `
      <div class="cart-item">
        <div>
          <div class="name">${c.name}</div>
          <div class="qty">Qty: ${c.qty}</div>
        </div>
        <button class="remove" onclick="removeItem(${i})">Remove</button>
      </div>`;
  });
}

function removeItem(i) {
  cart.splice(i, 1);
  updateCartUI();
}

/* ---------------- PLACE ORDER ------------------- */
async function placeOrder() {
  if (!cart.length) return showToast("Cart empty");

  const subtotal = cart.reduce((a, b) => a + b.price * b.qty, 0);
  const total = +(subtotal + subtotal * 0.08).toFixed(2);

  const token = localStorage.getItem("accessToken");
  if (!token) return showToast("Please login");

  try {
    const r = await fetch(`${API}/api/orders/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ items: cart, total }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error(data);
      return showToast("Order failed");
    }

    showToast("Order Placed!");
    cart = [];
    updateCartUI();
    loadOrders();
  } catch (err) {
    showToast("Server error");
  }
}

/* ---------------- ORDERS ------------------- */
async function loadOrders() {
  const token = localStorage.getItem("accessToken");
  if (!token) return;

  const r = await fetch(`${API}/api/orders/mine`, {
    headers: { Authorization: "Bearer " + token },
  });

  const orders = await r.json();
  const box = $("ordersList");

  box.innerHTML = "";

  if (!orders.length) return (box.innerHTML = "No orders yet");

  orders.forEach((o) => {
    box.innerHTML += `
      <div class="order-card">
        <b>Order #${o.id}</b> - ${o.status}
        <div>Total: ₹${o.total}</div>
      </div>`;
  });
}

/* ---------------- SOCKET EVENTS ------------------- */
socket.on("connect", () => {
  const token = localStorage.getItem("accessToken");
  if (token) socket.emit("register", { token });
});

socket.on("order:update", () => loadOrders());

socket.on("order:placed", () => loadOrders());

/* INIT */
loadMenu();
loadOrders();
updateCartUI();
