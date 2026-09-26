


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

            console.error(
                "❌ Error fetching orders:",
                err
            );

            return res.status(500).json({

                success: false,

                message:
                    "Error fetching orders",

                error:
                    err.message

            });
        }


        console.log(
            `✅ Orders fetched: ${results.length}`
        );


        // The frontend can directly use this array
        res.json(results);

    });

});


// =====================================================
// GET ONE ORDER + ITEMS
// =====================================================

router.get("/:id", (req, res) => {

    const orderId = req.params.id;


    // -------------------------------------------------
    // GET ORDER
    // -------------------------------------------------

    const orderSQL = `
        SELECT *
        FROM orders
        WHERE id = ?
    `;


    db.query(
        orderSQL,
        [orderId],
        (err, orders) => {

            if (err) {

                console.error(
                    "❌ Error fetching order:",
                    err
                );

                return res.status(500).json({

                    message:
                        "Error fetching order",

                    error:
                        err.message

                });

            }


            if (orders.length === 0) {

                return res.status(404).json({

                    message:
                        "Order not found"

                });

            }


            // -------------------------------------------------
            // GET ORDER ITEMS
            // -------------------------------------------------

            const itemsSQL = `
                SELECT
                    order_items.id,
                    order_items.order_id,
                    order_items.menu_item_id,
                    order_items.quantity,
                    order_items.price,
                    menu_items.name,
                    menu_items.image
                FROM order_items
                LEFT JOIN menu_items
                    ON order_items.menu_item_id = menu_items.id
                WHERE order_items.order_id = ?
            `;


            db.query(
                itemsSQL,
                [orderId],
                (err, items) => {

                    if (err) {

                        console.error(
                            "❌ Error fetching order items:",
                            err
                        );

                        return res.status(500).json({

                            message:
                                "Error fetching order items",

                            error:
                                err.message

                        });

                    }


                    res.json({

                        order:
                            orders[0],

                        items:
                            items

                    });

                }
            );

        }
    );

});


// =====================================================
// CREATE ORDER
// =====================================================

router.post("/", async (req, res) => {

    const {

        customer_name,
        phone,
        table_number,
        total_price,
        payment_method,
        items

    } = req.body;


    console.log("=================================");
    console.log("📦 NEW ORDER RECEIVED");
    console.log("Customer:", customer_name);
    console.log("Phone:", phone);
    console.log("Table:", table_number);
    console.log("Total:", total_price);
    console.log("Payment:", payment_method);
    console.log("Items:", items);
    console.log("=================================");


    // =================================================
    // VALIDATE CUSTOMER
    // =================================================

    if (
        !customer_name ||
        !String(customer_name).trim()
    ) {

        return res.status(400).json({

            message:
                "Customer name is required"

        });

    }


    // =================================================
    // VALIDATE TABLE
    // =================================================

    if (

        table_number === undefined ||

        table_number === null ||

        table_number === "" ||

        Number(table_number) <= 0

    ) {

        return res.status(400).json({

            message:
                "Table number is required"

        });

    }


    const tableNumber =
        Number(table_number);


    // =================================================
    // VALIDATE ITEMS
    // =================================================

    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        return res.status(400).json({

            message:
                "Order items are required"

        });

    }


    try {

        // =================================================
        // FIX MENU ITEMS
        // =================================================

        const fixedItems = [];


        for (const item of items) {

            let menuItemId =
                item.menu_item_id ||
                item.id;


            // -------------------------------------------------
            // SEARCH MENU ITEM BY NAME
            // -------------------------------------------------

            if (
                !menuItemId &&
                item.name
            ) {

                const searchSQL = `
                    SELECT id
                    FROM menu_items
                    WHERE name = ?
                    LIMIT 1
                `;


                const [rows] =
                    await db
                        .promise()
                        .query(
                            searchSQL,
                            [item.name]
                        );


                if (rows.length > 0) {

                    menuItemId =
                        rows[0].id;

                }

            }


            // -------------------------------------------------
            // MENU ITEM NOT FOUND
            // -------------------------------------------------

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


            // -------------------------------------------------
            // ADD FIXED ITEM
            // -------------------------------------------------

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
                table_number,
                total_price,
                status,
                payment_method
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;


        const [orderResult] =
            await db
                .promise()
                .query(
                    orderSQL,
                    [

                        String(
                            customer_name
                        ).trim(),

                        phone
                            ? String(phone).trim()
                            : null,

                        tableNumber,

                        Number(total_price) || 0,

                        "Pending",

                        payment_method ||
                            "Cash"

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


        await db
            .promise()
            .query(
                itemsSQL,
                [itemValues]
            );


        console.log(
            `✅ Order items saved for order #${orderId}`
        );


        // =================================================
        // RESPONSE
        // =================================================

        res.status(201).json({

            success:
                true,

            message:
                "Order created successfully",

            order_id:
                orderId,

            orderId:
                orderId,

            table_number:
                tableNumber,

            status:
                "Pending",

            payment_method:
                payment_method || "Cash"

        });

    }

    catch (error) {

        console.error(
            "❌ ORDER ERROR:",
            error
        );


        return res.status(500).json({

            success:
                false,

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

    const {
        status
    } = req.body;


    const allowedStatuses = [

        "Pending",
        "Preparing",
        "Ready",
        "Delivered",
        "Completed",
        "Cancelled"

    ];


    if (
        !allowedStatuses.includes(status)
    ) {

        return res.status(400).json({

            success:
                false,

            message:
                "Invalid order status",

            allowedStatuses:
                allowedStatuses

        });

    }


    const sql = `
        UPDATE orders
        SET status = ?
        WHERE id = ?
    `;


    db.query(
        sql,
        [
            status,
            req.params.id
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "❌ Error updating status:",
                    err
                );

                return res.status(500).json({

                    success:
                        false,

                    message:
                        "Error updating order status",

                    error:
                        err.message

                });

            }


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Order not found"

                });

            }


            console.log(
                `✅ Order #${req.params.id} status → ${status}`
            );


            res.json({

                success:
                    true,

                message:
                    "Order status updated successfully",

                order_id:
                    req.params.id,

                status:
                    status

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


    // =================================================
    // VALIDATE PAYMENT METHOD
    // =================================================

    if (
        !payment_method ||
        !String(payment_method).trim()
    ) {

        return res.status(400).json({

            success:
                false,

            message:
                "Payment method is required"

        });

    }


    const method =
        String(payment_method).trim();


    // =================================================
    // UPDATE PAYMENT
    //
    // Payment means:
    //
    // payment_method = Cash/Card
    // status = Completed
    //
    // =================================================

    const sql = `
        UPDATE orders
        SET
            payment_method = ?,
            status = 'Completed'
        WHERE id = ?
    `;


    db.query(
        sql,
        [
            method,
            req.params.id
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "❌ Error updating payment:",
                    err
                );

                return res.status(500).json({

                    success:
                        false,

                    message:
                        "Error updating payment",

                    error:
                        err.message

                });

            }


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Order not found"

                });

            }


            console.log(
                `💰 Order #${req.params.id} payment completed`
            );

            console.log(
                `💳 Payment method: ${method}`
            );


            res.json({

                success:
                    true,

                message:
                    "Payment completed successfully",

                order_id:
                    req.params.id,

                payment_method:
                    method,

                status:
                    "Completed"

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


    // =================================================
    // DELETE ORDER ITEMS FIRST
    // =================================================

    db.query(

        `
            DELETE FROM order_items
            WHERE order_id = ?
        `,

        [orderId],

        (err) => {

            if (err) {

                console.error(
                    "❌ Error deleting order items:",
                    err
                );

                return res.status(500).json({

                    success:
                        false,

                    message:
                        "Error deleting order items",

                    error:
                        err.message

                });

            }


            // =================================================
            // DELETE ORDER
            // =================================================

            db.query(

                `
                    DELETE FROM orders
                    WHERE id = ?
                `,

                [orderId],

                (err, result) => {

                    if (err) {

                        console.error(
                            "❌ Error deleting order:",
                            err
                        );

                        return res.status(500).json({

                            success:
                                false,

                            message:
                                "Error deleting order",

                            error:
                                err.message

                        });

                    }


                    if (
                        result.affectedRows === 0
                    ) {

                        return res.status(404).json({

                            success:
                                false,

                            message:
                                "Order not found"

                        });

                    }


                    console.log(
                        `🗑️ Order #${orderId} deleted`
                    );


                    res.json({

                        success:
                            true,

                        message:
                            "Order deleted successfully"

                    });

                }

            );

        }

    );

});


module.exports = router;

