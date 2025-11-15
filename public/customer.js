let menu = [];
let cart = [];
const socket = io("http://localhost:5000");

// Helper
function $(id) { return document.getElementById(id); }

// Show Sections
function showSection(s) {
  $("menuSection").style.display = s === "menu" ? "block" : "none";
  $("cartSection").style.display = s === "cart" ? "block" : "none";
  $("ordersSection").style.display = s === "orders" ? "block" : "none";
}

/* ---------------- MENU (NO IMAGES) ------------------- */
async function loadMenu() {
  try {
    const r = await fetch("http://localhost:5000/api/menu");
    menu = await r.json();

    const box = $("menuGrid");
    box.innerHTML = "";

    menu.forEach(m => {
      box.innerHTML += `
        <div class="menu-card">
          <div class="menu-title">${m.name}</div>
          <div class="menu-desc">${m.description}</div>
          <div class="menu-price">₹${m.price}.00</div>
          <button class="add-btn" onclick="addToCart(${m.id})">Add to Cart</button>
        </div>
      `;
    });
  } catch (err) {
    console.error("Menu load error:", err);
  }
}

/* ---------------- CART ------------------- */
function addToCart(id) {
  const item = menu.find(m => m.id == id);
  const exist = cart.find(c => c.id == id);

  if (exist) exist.qty++;
  else cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });

  showToast(`${item.name} added to cart!`);
  updateCartUI();
}

function updateCartUI() {
  $("cartCount").textContent = cart.reduce((a, b) => a + b.qty, 0);

  const box = $("cartItems");
  box.innerHTML = "";

  cart.forEach((c, i) => {
    box.innerHTML += `
      <div class="cart-item">
        <div>
          <div class="name">${c.name}</div>
          <div class="qty">Qty: ${c.qty}</div>
        </div>

        <div>
          ₹${c.price * c.qty}
        </div>

        <button class="remove" onclick="remove(${i})">Remove</button>
      </div>
    `;
  });
}

function remove(i) {
  cart.splice(i, 1);
  updateCartUI();
}

/* ---------------- PLACE ORDER ------------------- */
async function placeOrder() {
  if (cart.length === 0) return alert("Cart is empty");

  const subtotal = cart.reduce((a, b) => a + b.price * b.qty, 0);
  const total = subtotal + subtotal * 0.08;

  const token = localStorage.getItem("accessToken");
  if (!token) return alert("Not logged in");

  const r = await fetch("http://localhost:5000/api/orders", {
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
    alert("Order failed: " + data.message);
    return;
  }

  showToast("Order placed!");
  cart = [];
  updateCartUI();
  loadOrders();
}

/* ---------------- LOAD ORDERS ------------------- */
async function loadOrders() {
  const token = localStorage.getItem("accessToken");
  if (!token) return;

  const r = await fetch("http://localhost:5000/api/orders/mine", {
    headers: { Authorization: "Bearer " + token }
  });

  if (!r.ok) return;

  const orders = await r.json();
  const box = $("ordersList");
  box.innerHTML = "";

  orders.forEach(o => {
    box.innerHTML += `
      <div style="background:white;padding:1rem;margin:1rem;border-radius:10px;">
        <b>Order #${o.id}</b> — ${o.status}<br>
        <small>${o.time}</small><br>
        Total: ₹${o.total}
      </div>
    `;
  });
}

/* ---------------- SIMPLE TOAST ------------------- */
function showToast(msg) {
  const box = $("toastBox");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  box.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 3000);
}

/* ---------------- LOGOUT ------------------- */
function logout() {
  localStorage.clear();
  alert("You are now logged out.");
  window.location.href = "/";
}

/* INIT */
loadMenu();
loadOrders();
