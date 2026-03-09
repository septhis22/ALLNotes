import express, { Request, Response } from "express";
import pool from "../Database/db";
import { authenticateSupabaseToken } from "../middleware/supebaseAuth";

const router = express.Router();

router.post('/', authenticateSupabaseToken, async (req: Request, res: Response): Promise<void> => {
    console.log("this route was hit");
    let client;
    const { removeId, id } = req.body;
    
    const userId = req.user?.id;
    
    // Check if removeId exists and handle both single and array cases
    if (!removeId) {
        console.log("No removeId provided");
        res.sendStatus(408);
        return;
    }
    
    if (!userId) {
        res.sendStatus(401);
        return;
    }

    // Convert to array if single value, keep as array if already array
    const removeIds = Array.isArray(removeId) ? removeId : [removeId];
    
    // Additional check for empty array
    if (removeIds.length === 0) {
        console.log("Empty removeId array provided");
        res.sendStatus(408);
        return;
    }

    try {
        client = await pool.connect();
        
        // Check ownership
        const response = await client.query("SELECT 1 FROM notes WHERE id = $1 AND owner = $2", [id, userId]);
        if (response.rows.length === 0) {
            console.log("you are not authorized to delete the users from collab");
            res.sendStatus(403);
            return;
        }
        
        // Delete collaborators - works for both single and multiple IDs
        const response1 = await client.query(
            "DELETE FROM note_collaborators WHERE note_id = $1 AND user_id = ANY($2) RETURNING 1",
            [id, removeIds]
        );
        
        if (response1.rows.length === 0) {
            console.log("No collaborators found to delete");
            res.sendStatus(404);
            return;
        }
        
        res.status(200).json({ 
            message: 'Collaborators removed successfully', 
            deletedCount: response1.rows.length,
            removedIds: removeIds // Optional: return which IDs were processed
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (client) client.release();
    }
});

export default router;
