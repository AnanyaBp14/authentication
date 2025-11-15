// server.js
require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const initializePostgres = require("./init_pg_auto");

// Initialize PostgreSQL tables & defaults
initializePostgres();

const app = express();
const server = http.createServer(app);

/* ---------------- SOCKET.IO ---------------- */
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://mochamist.onrender.com"
    ],
    credentials: true
  }
});

/* ---------------- MIDDLEWARE ---------------- */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://mochamist.onrender.com"
    ],
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public")); // Serve index.html, customer.html, barista.html

/* ---------------- ROUTES ---------------- */
app.use("/api/auth", require("./routes/auth_pg"));
app.use("/api/menu", require("./routes/menu_pg"));

const orderRoutes = require("./routes/orders_pg");
orderRoutes.setSocketIO(io);
app.use("/api/orders", orderRoutes);

/* ---------------- SOCKET EVENTS ---------------- */
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("register", ({ token }) => {
    try {
      const user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Each user has their own room
      socket.join(`user_${user.id}`);

      // Baristas get live order updates
      if (user.role === "barista") socket.join("baristas");

      console.log("Socket registered:", user.id, user.role);
    } catch (err) {
      console.log("Invalid WS token");
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🔥 Server running on PORT ${PORT}`);
});
