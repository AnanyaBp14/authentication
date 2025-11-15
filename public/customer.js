const API = "https://mochamist.onrender.com";
let menu = [];
let cart = [];

const socket = io(API, {
  transports: ["websocket", "polling"],
  withCredentials: true
});

function $(x) { return document.getElementById(x); }

/* LOAD MENU */
async function loadMenu() {
  try {
    const r = await fetch(`${API}/api/menu`);
    menu = await r.json();

    const box = $("menuGrid");
    box.innerHTML = "";

    menu.forEach(m =>
      box.innerHTML += `
        <div class="menu-card">
          <div class="menu-title">${m.name}</div>
          <div class="menu-desc">${m.description || ""}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
            <div class="menu-price">₹${m.price}</div>
            <button class="add-btn" onclick="addToCart(${m.id})">Add</button>
          </div>
        </div>
      `
    );
  } catch {
    showToast("Failed to load menu");
  }
}

/* CART */
function addToCart(id) {
  const item = menu.find(x => x.id == id);
  const exist = cart.find(x => x.id == id);

  if (exist) exist.qty++;
  else cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });

  updateCart();
}

function updateCart() {
  $("cartCount").innerText = cart.reduce((a,b)=>a+b.qty,0);
  const box = $("cartItems");
  box.innerHTML = "";

  cart.forEach((c,i) =>
    box.innerHTML += `
      <div class="cart-item">
        <div>${c.name} (x${c.qty})</div>
        <button onclick="removeItem(${i})">Remove</button>
      </div>`
  );
}

function removeItem(i) { cart.splice(i,1); updateCart(); }

/* PLACE ORDER — FIXED URL */
async function placeOrder() {
  const token = localStorage.getItem("accessToken");
  if (!token) return showToast("Login first");

  const total = cart.reduce((a,b)=>a + b.qty*b.price,0);

  const r = await fetch(`${API}/api/orders`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ items: cart, total })
  });

  const data = await r.json();

  if (!r.ok) return showToast("Order failed");

  showToast("Order placed!");
  cart = [];
  updateCart();
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
    `<div>Order #${o.id} — ${o.status} — ₹${o.total}</div>`
  ).join("");
}

/* SOCKET */
socket.on("order:update", () => loadOrders());

function showToast(msg) {
  alert(msg);
}

/* INIT */
loadMenu();
loadOrders();
updateCart();
