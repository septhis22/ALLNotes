import express, { Request, Response } from "express";
import pool from "../Database/db";
import { authenticateSupabaseToken } from "../middleware/supebaseAuth";

const router = express.Router();

router.get('/', authenticateSupabaseToken, async (req: Request, res: Response): Promise<any> => {
    let client;
    const userId = req.user?.id;
    console.log("the profile route was hit");
    if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
    }

    try {
        client = await pool.connect();
        const response = await client.query("SELECT * FROM profiles WHERE id = $1", [userId]);
        
        if (response.rows.length === 0) {
            return res.status(404).json({ error: "Profile not found" });
        }
        
        // Return the first profile found
        return res.status(200).json({ 
            success: true,
            user: response.rows[0] 
        });
        
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: "Internal server error" });
    } finally {
        if (client) {
            client.release();
        }
    }
});

export default router;
