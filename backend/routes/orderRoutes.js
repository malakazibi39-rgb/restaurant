const express = require("express");
const router = express.Router();
const db = require("../config/db");


// =====================================================
// GET ALL ORDERS
// =====================================================

router.get("/", (req, res) => {

    const sql = `
        SELECT *
        FROM orders
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error("❌ Error fetching orders:", err);

            return res.status(500).json({
                message: "Error fetching orders"
            });
        }

        res.json(results);
    });
});


// =====================================================
// GET ONE ORDER + ITEMS
// =====================================================

router.get("/:id", (req, res) => {

    const orderId = req.params.id;

    const orderSQL = `
        SELECT *
        FROM orders
        WHERE id = ?
    `;

    db.query(orderSQL, [orderId], (err, orders) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                message: "Error fetching order"
            });
        }

        if (orders.length === 0) {

            return res.status(404).json({
                message: "Order not found"
            });
        }


        const itemsSQL = `
            SELECT
                order_items.id,
                order_items.menu_item_id,
                order_items.quantity,
                order_items.price,
                menu_items.name,
                menu_items.image
            FROM order_items
            JOIN menu_items
                ON order_items.menu_item_id = menu_items.id
            WHERE order_items.order_id = ?
        `;


        db.query(itemsSQL, [orderId], (err, items) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    message: "Error fetching order items"
                });
            }


            res.json({
                order: orders[0],
                items: items
            });

        });

    });

});


// =====================================================
// CREATE ORDER
// =====================================================

router.post("/", async (req, res) => {

    const {
        customer_name,
        phone,
        total_price,
        payment_method,
        items
    } = req.body;


    console.log("=================================");
    console.log("📦 NEW ORDER RECEIVED");
    console.log("Customer:", customer_name);
    console.log("Items:", items);
    console.log("=================================");


    // -------------------------------------------------
    // Validate customer
    // -------------------------------------------------

    if (!customer_name) {

        return res.status(400).json({
            message: "Customer name is required"
        });
    }


    // -------------------------------------------------
    // Validate items
    // -------------------------------------------------

    if (!Array.isArray(items) || items.length === 0) {

        return res.status(400).json({
            message: "Order items are required"
        });
    }


    try {

        // =================================================
        // FIND MENU ITEM IDs
        // =================================================

        const fixedItems = [];


        for (const item of items) {

            let menuItemId =
                item.menu_item_id ||
                item.id;


            // ---------------------------------------------
            // If ID doesn't exist, search by name
            // ---------------------------------------------

            if (!menuItemId && item.name) {

                const searchSQL = `
                    SELECT id
                    FROM menu_items
                    WHERE name = ?
                    LIMIT 1
                `;


                const [rows] =
                    await db.promise().query(
                        searchSQL,
                        [item.name]
                    );


                if (rows.length > 0) {

                    menuItemId =
                        rows[0].id;

                }

            }


            // ---------------------------------------------
            // Still no ID
            // ---------------------------------------------

            if (!menuItemId) {

                console.error(
                    "❌ Cannot find menu item:",
                    item
                );


                return res.status(400).json({

                    message:
                        `Menu item "${item.name || "Unknown"}" was not found in the database.`

                });

            }


            fixedItems.push({

                menu_item_id:
                    Number(menuItemId),

                quantity:
                    Number(item.quantity) || 1,

                price:
                    Number(item.price) || 0

            });

        }


        console.log(
            "✅ Fixed items:",
            fixedItems
        );


        // =================================================
        // CREATE ORDER
        // =================================================

        const orderSQL = `
            INSERT INTO orders
            (
                customer_name,
                phone,
                total_price,
                status,
                payment_method
            )
            VALUES (?, ?, ?, ?, ?)
        `;


        const [orderResult] =
            await db.promise().query(
                orderSQL,
                [
                    customer_name,
                    phone || null,
                    Number(total_price) || 0,
                    "Pending",
                    payment_method || "Cash"
                ]
            );


        const orderId =
            orderResult.insertId;


        console.log(
            `✅ Order #${orderId} created`
        );


        // =================================================
        // CREATE ORDER ITEMS
        // =================================================

        const itemValues =
            fixedItems.map(item => [

                orderId,

                item.menu_item_id,

                item.quantity,

                item.price

            ]);


        const itemsSQL = `
            INSERT INTO order_items
            (
                order_id,
                menu_item_id,
                quantity,
                price
            )
            VALUES ?
        `;


        await db.promise().query(
            itemsSQL,
            [itemValues]
        );


        console.log(
            `✅ Order items saved for order #${orderId}`
        );


        // =================================================
        // SUCCESS
        // =================================================

        res.status(201).json({

            message:
                "Order created successfully",

            order_id:
                orderId,

            orderId:
                orderId

        });


    } catch (error) {

        console.error(
            "❌ ORDER ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Error creating order",

            error:
                error.message

        });

    }

});


// =====================================================
// UPDATE ORDER STATUS
// =====================================================

router.put("/:id/status", (req, res) => {

    const { status } = req.body;


    const allowedStatuses = [

        "Pending",
        "Preparing",
        "Ready",
        "Delivered",
        "Completed",
        "Cancelled"

    ];


    if (!allowedStatuses.includes(status)) {

        return res.status(400).json({

            message:
                "Invalid order status"

        });

    }


    const sql = `
        UPDATE orders
        SET status = ?
        WHERE id = ?
    `;


    db.query(
        sql,
        [status, req.params.id],
        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    message:
                        "Error updating order status"

                });

            }


            if (result.affectedRows === 0) {

                return res.status(404).json({

                    message:
                        "Order not found"

                });

            }


            res.json({

                message:
                    "Order status updated successfully"

            });

        }
    );

});


// =====================================================
// UPDATE PAYMENT
// =====================================================

router.put("/:id/payment", (req, res) => {

    const {
        payment_method
    } = req.body;


    if (!payment_method) {

        return res.status(400).json({

            message:
                "Payment method is required"

        });

    }


    const sql = `
        UPDATE orders
        SET payment_method = ?
        WHERE id = ?
    `;


    db.query(
        sql,
        [
            payment_method,
            req.params.id
        ],
        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    message:
                        "Error updating payment"

                });

            }


            if (result.affectedRows === 0) {

                return res.status(404).json({

                    message:
                        "Order not found"

                });

            }


            res.json({

                message:
                    "Payment updated successfully"

            });

        }
    );

});


// =====================================================
// DELETE ORDER
// =====================================================

router.delete("/:id", (req, res) => {

    const orderId =
        req.params.id;


    db.query(
        "DELETE FROM order_items WHERE order_id = ?",
        [orderId],
        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    message:
                        "Error deleting order items"

                });

            }


            db.query(
                "DELETE FROM orders WHERE id = ?",
                [orderId],
                (err, result) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            message:
                                "Error deleting order"

                        });

                    }


                    if (result.affectedRows === 0) {

                        return res.status(404).json({

                            message:
                                "Order not found"

                        });

                    }


                    res.json({

                        message:
                            "Order deleted successfully"

                    });

                }
            );

        }
    );

});


module.exports = router;