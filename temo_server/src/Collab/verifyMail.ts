import express, { Response, Request } from "express";
import pool from "../Database/db";
import { json } from "stream/consumers";
import { error } from "console";
import { authenticateSupabaseToken } from "../middleware/supebaseAuth";

const router = express.Router();

router.get('/', authenticateSupabaseToken ,async (req:Request, res:Response):Promise<any> => {
    const client = await pool.connect();
    const userId = req.user?.id;
    if(!userId){
        res.sendStatus(401).json({error:"Not authenticaed"});
    }
    try {
        const { email, note_id } = req.query;
        if (!email) {
            client.release();
            return res.status(400).json({ error: "No email provided" });
        }

        const verify = await client.query(
            "SELECT 1 FROM notes WHERE owner = $1 AND id = $2", 
            [userId, note_id]
        );
        
        if (verify.rows.length === 0) {
            console.log("The user is not the owner");
            return res.status(403).json({ error: "You don't own this note" }); // ✅ 403 Forbidden + return
        }
        // Find user by email
        const response = await client.query(
            "SELECT id FROM auth.users WHERE email = $1",
            [email]
        );

        if (response.rows.length > 0) {
            const user_id = response.rows[0].id;

            try {
                const addmember = await client.query(
                    "INSERT INTO note_collaborators(note_id, user_id, permission) VALUES ($1, $2, $3) RETURNING note_id",
                    [note_id, user_id, ["w", "r"]]
                );
                if (addmember.rows.length > 0) {
                    res.status(200).json({ note_id: addmember.rows[0].note_id, user_id });
                } else {
                    res.status(500).json({ error: "Failed to add collaborator" });
                }
            } catch (e) {
                // Likely a conflict or constraint error
                res.status(409).json({ error: e || "Could not add collaborator" });
            }
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
});


export default router;