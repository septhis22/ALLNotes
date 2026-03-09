import express, { Request, Response } from "express";
import pool from "../Database/db";
import { authenticateSupabaseToken } from "../middleware/supebaseAuth";

const router = express.Router();

router.post('/', authenticateSupabaseToken, async (req: Request, res: Response): Promise<any> => {
    let client;
    console.log("Update profile route was hit");
    
    const { userName } = req.body;
    const user_id = req.user?.id;
    
    // Validate input
    if (!userName || typeof userName !== 'string' || userName.trim() === '') {
        return res.status(400).json({ error: "Username is required and must be a non-empty string" });
    }
    
    if (!user_id) {
        return res.status(401).json({ error: "User not authenticated" });
    }
    
    try {
        client = await pool.connect();
        
        // Fixed SQL syntax: "RETURNING" not "returnig"
        const response = await client.query(
            "UPDATE profiles SET full_name = $1 WHERE id = $2 RETURNING *",
            [userName.trim(), user_id]
        );
        
        // Check if update was successful
        if (response.rows.length === 0) {
            return res.status(404).json({ error: "Profile not found or no changes made" });
        }
        
        // Return success with updated profile data
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: response.rows[0]
        });
        
    } catch (error) {
        console.error("Database error in update profile:", error);
        return res.status(500).json({ error: "Internal server error" });
    } finally {
        if (client) {
            client.release();
        }
    }
});

export default router;
