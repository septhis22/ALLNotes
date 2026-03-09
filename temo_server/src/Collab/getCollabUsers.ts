import express, { Request, Response } from "express";
import pool from "../Database/db";
import { authenticateSupabaseToken } from "../middleware/supebaseAuth";

const router = express.Router();

router.get('/getCollabUsers', authenticateSupabaseToken, async (req: Request, res: Response): Promise<any> => {
    const userId = req.user?.id;
    let client;
    
    if (!userId) {
        console.log("unauthorized");
        return res.sendStatus(403);
    }

    try {
        client = await pool.connect();
        
        // Get note IDs owned by the user
        const noteResponse = await client.query("SELECT id FROM notes WHERE owner = $1", [userId]);
        if (noteResponse.rows.length === 0) {
            return res.status(404).json({ message: "No notes found for this user" });
        }
        
        // Extract just the ID values from the response objects
        const noteIds = noteResponse.rows.map(row => row.id);
        
        // Get collaborators for those notes
        const collabResponse = await client.query(
            "SELECT note_id, user_id FROM note_collaborators WHERE note_id = ANY($1)", 
            [noteIds]
        );
        
        if (collabResponse.rows.length === 0) {
            return res.status(200).json({ 
                message: "No collaborators found", 
                data: [] 
            });
        }
        
        return res.status(200).json({ data: collabResponse.rows });
        
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
