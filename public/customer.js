// customer.js — Render-ready (no images), works with https://mochamist.onrender.com
const API = "https://mochamist.onrender.com";
let menu = [];
let cart = [];

// Socket — connect to Render backend
const socket = io(API, { transports: ["websocket", "polling"], withCredentials: true });

// Helper
function $(id) { return document.getElementById(id); }

// Show Sections
function showSection(s) {
  $("menuSection").style.display = s === "menu" ? "block" : "none";
  $("cartSection").style.display = s === "cart" ? "block" : "none";
  $("ordersSection").style.display = s === "orders" ? "block" : "none";
}

// Toast
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

    menu.forEach(m => {
      box.innerHTML += `
        <div class="menu-card">
          <div class="menu-title">${escapeHtml(m.name)}</div>
          <div class="menu-desc">${escapeHtml(m.description || "")}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <div class="menu-price">₹${Number(m.price).toFixed(2)}</div>
            <button class="add-btn" onclick="addToCart(${m.id})">Add to Cart</button>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error("Menu load error:", err);
    showToast("Could not load menu");
  }
}

/* ---------------- CART ------------------- */
function addToCart(id) {
  const item = menu.find(m => m.id == id);
  if (!item) return showToast("Item unavailable");

  const exist = cart.find(c => c.id == id);
  if (exist) exist.qty++;
  else cart.push({ id: item.id, name: item.name, price: Number(item.price), qty: 1 });

  showToast(`${item.name} added to cart`);
  updateCartUI();
}

function updateCartUI() {
  $("cartCount").textContent = cart.reduce((a, b) => a + b.qty, 0);
  const box = $("cartItems");
  box.innerHTML = "";

  if (cart.length === 0) {
    box.innerHTML = "<div class='muted'>Cart is empty</div>";
    return;
  }

  cart.forEach((c, i) => {
    box.innerHTML += `
      <div class="cart-item">
        <div>
          <div class="name">${escapeHtml(c.name)}</div>
          <div class="qty">Qty: ${c.qty}</div>
        </div>

        <div style="text-align:right">
          <div>₹${(c.price * c.qty).toFixed(2)}</div>
          <div style="margin-top:6px;">
            <button class="remove" onclick="decQty(${i})">-</button>
            <button class="remove" onclick="incQty(${i})">+</button>
            <button class="remove" onclick="remove(${i})">Remove</button>
          </div>
        </div>
      </div>
    `;
  });
}

function incQty(i) { cart[i].qty++; updateCartUI(); }
function decQty(i) { cart[i].qty = Math.max(1, cart[i].qty - 1); updateCartUI(); }
function remove(i) { cart.splice(i, 1); updateCartUI(); }

/* ---------------- PLACE ORDER ------------------- */
async function placeOrder() {
  if (cart.length === 0) return showToast("Cart empty");

  const subtotal = cart.reduce((a,b)=>a+b.price*b.qty,0);
  const total = +(subtotal + subtotal * 0.08).toFixed(2);

  const token = localStorage.getItem("accessToken");
  if (!token) return showToast("You must be logged in");

  try {
    const r = await fetch(`${API}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ items: cart, total })
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("Order error:", data);
      return showToast(data.message || "Order failed");
    }

    showToast("Order placed!");
    // reset cart & UI
    cart = [];
    updateCartUI();
    loadOrders();
  } catch (err) {
    console.error("Place order error:", err);
    showToast("Order failed");
  }
}

/* ---------------- LOAD ORDERS ------------------- */
async function loadOrders() {
  const token = localStorage.getItem("accessToken");
  if (!token) return;

  try {
    const r = await fetch(`${API}/api/orders/mine`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!r.ok) return;
    const orders = await r.json();
    const box = $("ordersList");
    box.innerHTML = "";

    if (!Array.isArray(orders) || orders.length === 0) {
      box.innerHTML = "<div class='muted'>No orders yet.</div>";
      return;
    }

    orders.forEach(o => {
      box.innerHTML += `
        <div class="order-card" style="border-left:4px solid ${statusColor(o.status)};">
          <b>Order #${o.id}</b> — ${o.status} <br>
          <small class="muted">${new Date(o.time).toLocaleString()}</small>
          <div style="margin-top:8px">
            Total: ₹${Number(o.total).toFixed(2)}
          </div>
        </div>
      `;
    });

  } catch (err) {
    console.error("Load orders error:", err);
  }
}

/* ---------------- SOCKET EVENTS ------------------- */
socket.on("connect", () => {
  console.log("socket connected:", socket.id);
  const token = localStorage.getItem("accessToken");
  if (token) socket.emit("register", { token });
});

socket.on("order:update", (payload) => {
  // payload.order contains updated order
  showToast("Order updated: " + (payload.order?.status || ""));
  loadOrders();
});

socket.on("order:placed", (payload) => {
  showToast("Order placed (confirmed)");
  loadOrders();
});

socket.on("order:new", (payload) => {
  // not used for customers, baristas listen to this
  console.log("new order event", payload);
});

/* ---------------- UTIL ------------------- */
function statusColor(status) {
  if (status === "Preparing") return "#c49a6c";
  if (status === "Ready") return "#4caf50";
  if (status === "Served") return "#6b4024";
  return "#888";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ---------------- AUTH HELPERS ------------------- */
function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  showToast("Logged out");
  window.location.href = "/"; // homepage
}

/* INIT */
loadMenu();
loadOrders();
updateCartUI();
