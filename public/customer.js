let menu = [];
let cart = [];
const socket = io();

function $(id){ return document.getElementById(id); }

function showSection(s){
  $("menuSection").style.display = s==="menu" ? "block" : "none";
  $("cartSection").style.display = s==="cart" ? "block" : "none";
  $("ordersSection").style.display = s==="orders" ? "block" : "none";
}

/* ---------------- MENU ------------------- */
async function loadMenu(){
  const r = await fetch("/api/menu");
  menu = await r.json();

  const box = $("menuGrid");
  box.innerHTML = "";

  menu.forEach(m => {
    box.innerHTML += `
      <div style="background:white;padding:1rem;margin:1rem;border-radius:12px;">
        <h3>${m.name} <span style="float:right">₹${m.price}</span></h3>
        <p>${m.description}</p>
        <button onclick="addToCart(${m.id})">Add to Cart</button>
      </div>
    `;
  });
}

/* ---------------- CART ------------------- */
function addToCart(id){
  const item = menu.find(m => m.id == id);
  const exist = cart.find(c => c.id == id);

  if (exist) exist.qty++;
  else cart.push({ id:item.id, name:item.name, price:item.price, qty:1 });

  updateCartUI();
  showSection("cart");
}

function updateCartUI(){
  $("cartCount").textContent = cart.reduce((a,b)=>a+b.qty,0);

  const box = $("cartItems");
  box.innerHTML = "";
  cart.forEach((c,i)=>{
    box.innerHTML += `
      <div>
        ${c.name} × ${c.qty} — ₹${c.price * c.qty}
        <button onclick="remove(${i})">X</button>
      </div>
    `;
  });
}

function remove(i){
  cart.splice(i,1);
  updateCartUI();
}

/* ---------------- ORDER ------------------- */
async function placeOrder(){
  if (cart.length === 0) return alert("Cart empty");

  const subtotal = cart.reduce((a,b)=>a+b.price*b.qty,0);
  const total = subtotal + subtotal*0.08;
  const items = cart;

  const r = await fetch("/api/orders/public", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ items, total })
  });

  if (r.ok){
    alert("Order placed!");
    cart = [];
    updateCartUI();
    loadOrders();
  }
}

/* ---------------- ORDERS ------------------- */
async function loadOrders(){
  const r = await fetch("/api/orders/public");
  const orders = await r.json();

  const box = $("ordersList");
  box.innerHTML = "";

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

/* ---------------- LOGOUT ------------------- */
function logout(){
  cart = [];
  updateCartUI();
  alert("You are now logged out.");
  showSection("menu");
}

/* INIT */
loadMenu();
