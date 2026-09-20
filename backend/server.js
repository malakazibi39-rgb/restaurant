require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// FRONTEND
// ===============================

// Your structure:
// restaurant management
// ├── backend
// │   └── server.js
// └── frontend
//     ├── login.html
//     ├── admen
//     ├── chef
//     ├── server
//     └── cashier

app.use(
    "/frontend",
    express.static(path.join(__dirname, "../frontend"))
);

// ===============================
// API ROUTES
// ===============================

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
    res.json({
        message: "Restaurant Management API is running"
    });
});

// ===============================
// LOGIN PAGE
// ===============================

app.get("/login", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/login.html")
    );
});

// ===============================
// 404
// ===============================

app.use((req, res) => {
    res.status(404).json({
        message: "Route not found",
        path: req.originalUrl
    });
});

// ===============================
// SERVER
// ===============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("=================================");
    console.log("🍽️ Restaurant Management System");
    console.log("=================================");
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(
        `🌐 Login: http://localhost:${PORT}/frontend/login.html`
    );
    console.log(
        `👨‍🍳 Chef: http://localhost:${PORT}/frontend/chef/chef.html`
    );
    console.log(
        `👨‍💼 Admin: http://localhost:${PORT}/frontend/admen/home.html`
    );
    console.log(
        `💰 Cashier: http://localhost:${PORT}/frontend/cashier/cashier.html`
    );
    console.log(
        `🧑‍🍽️ Waiter: http://localhost:${PORT}/frontend/server/waiter.html`
    );
    console.log("=================================");
});