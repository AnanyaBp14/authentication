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

/* ---------------- MENU ------------------- */
async function loadMenu() {
  try {
    const r = await fetch("http://localhost:5000/api/menu");
    menu = await r.json();

    const box = $("menuGrid");
    box.innerHTML = "";

    menu.forEach(m => {
      box.innerHTML += `
        <div style="background:white;padding:1rem;margin:1rem;border-radius:12px;">
          <img src="${m.img}" style="width:100%;border-radius:10px;">
          <h3>${m.name} <span style="float:right">₹${m.price}</span></h3>
          <p>${m.description}</p>
          <button onclick="addToCart(${m.id})">Add to Cart</button>
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

  alert(item.name + " added to cart!");

  updateCartUI();
}

function updateCartUI() {
  $("cartCount").textContent = cart.reduce((a, b) => a + b.qty, 0);

  const box = $("cartItems");
  box.innerHTML = "";

  cart.forEach((c, i) => {
    box.innerHTML += `
      <div style="margin:0.5rem 0;">
        ${c.name} × ${c.qty} — ₹${c.price * c.qty}
        <button onclick="remove(${i})">X</button>
      </div>
    `;
  });
}

function remove(i) {
  cart.splice(i, 1);
  updateCartUI();
}

/* ---------------- PLACE ORDER ------------------- */
async function placeOrder(){
  if (cart.length === 0) return alert("Cart empty");

  const subtotal = cart.reduce((a,b)=>a+b.price*b.qty,0);
  const total = subtotal + subtotal*0.08;

  const token = localStorage.getItem("accessToken");
  if (!token) return alert("Not logged in");

  const r = await fetch("http://localhost:5000/api/orders", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization": "Bearer " + token
    },
    body:JSON.stringify({ items:cart, total })
  });

  const data = await r.json();

  if (!r.ok) {
    console.error("Order error:", data);
    alert("Order failed: " + data.message);
    return;
  }

  alert("Order placed!");
  cart = [];
  updateCartUI();
  loadOrders();
}

async function loadOrders(){
  const token = localStorage.getItem("accessToken");

  const r = await fetch("http://localhost:5000/api/orders/mine", {
    headers: { Authorization: "Bearer " + token }
  });

  const orders = await r.json();
  const box = $("ordersList");
  box.innerHTML = "";

  if (!Array.isArray(orders)) {
    console.error("Orders error:", orders);
    return;
  }

  orders.forEach(o=>{
    box.innerHTML += `
      <div style="background:white;padding:1rem;margin:1rem;border-radius:10px;">
        <b>Order #${o.id}</b> — ${o.status}<br>
        <small>${o.time}</small><br>
        Total: ₹${o.total}
      </div>
    `;
  });
}

/* ---------------- GET MY ORDERS ------------------- */
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

/* ---------------- LOGOUT ------------------- */
function logout() {
  localStorage.clear();
  alert("You are now logged out.");
  window.location.href = "/";
}

/* INIT */
loadMenu();
loadOrders();
