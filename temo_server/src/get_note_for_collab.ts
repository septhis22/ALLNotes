import express from "express";
const router  = express.Router();
import pool from "./Database/db";
router.get('/', async (req, res) => {
    try {
        const { id } = req.query;
        const client = await pool.connect();
        const dbRes = await client.query("select * from notes where id=$1", [id]);
        res.json(dbRes.rows);
        client.release();
    } catch (error) {
        res.sendStatus(500);
        console.log("No id provided", error);
    }
});