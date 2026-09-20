const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Dashboard statistics
router.get("/stats", (req, res) => {

    const queries = {

        orders: `
            SELECT COUNT(*) AS total
            FROM orders
            WHERE DATE(id) = CURDATE()
        `,

        revenue: `
            SELECT COALESCE(SUM(total_price), 0) AS total
            FROM orders
            WHERE status = 'Completed'
        `,

        menu: `
            SELECT COUNT(*) AS total
            FROM menu_items
        `,

        staff: `
            SELECT COUNT(*) AS total
            FROM users
        `
    };

    db.query(queries.orders, (err, ordersResult) => {

        if (err) {
            return res.status(500).json({
                message: "Error getting orders statistics"
            });
        }

        db.query(queries.revenue, (err, revenueResult) => {

            if (err) {
                return res.status(500).json({
                    message: "Error getting revenue statistics"
                });
            }

            db.query(queries.menu, (err, menuResult) => {

                if (err) {
                    return res.status(500).json({
                        message: "Error getting menu statistics"
                    });
                }

                db.query(queries.staff, (err, staffResult) => {

                    if (err) {
                        return res.status(500).json({
                            message: "Error getting staff statistics"
                        });
                    }

                    res.json({
                        todayOrders: ordersResult[0].total,
                        revenue: revenueResult[0].total,
                        menuItems: menuResult[0].total,
                        staff: staffResult[0].total
                    });
                });
            });
        });
    });
});

module.exports = router;