import express, { Request, Response } from "express";
import pool from "./Database/db";
import { error } from "console";
import { authenticateSupabaseToken } from "./middleware/supebaseAuth";

const router = express.Router();


router.post('/', authenticateSupabaseToken,async (req: Request, res: Response): Promise<any> => {
  const { _userId,id, title, content, note_data, updatedAt } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({error: "Authentication required"});
  }

  if (!_userId) {
    return res.status(400).json({error: "userId is required in request body"});
  }

  // Then compare
  if(String(userId) !== String(_userId)){
    return res.status(401).json({error: "Unauthorized: User ID mismatch"});
  }

  if (!id || !title || (!content && !note_data)) {
    return res.status(400).json({ error: "Missing required fields: id, title, or content/note_data" });
  }

  if(userId==="Guest" || !userId){
    res.sendStatus(406);
    return;
  }

  let client;
  try {
    client = await pool.connect();

    // Ownership check
    const ownershipResult = await client.query(
      "SELECT 1 FROM notes WHERE id = $1 AND owner = $2",
      [id, userId]
    );
    if (ownershipResult.rows.length === 0) {
      return res.status(403).json({ error: "User does not own this note" });
      return;
    }

    // Update note
    const updateResult = await client.query(
      'UPDATE notes SET content = $1, title = $2, updatedat = $3, note_data = $4 WHERE id = $5 RETURNING *',
      [content || "", title, updatedAt, note_data ? JSON.stringify(note_data) : null, id]
    );

    if (updateResult.rows.length > 0) {
      return res.status(200).json(updateResult.rows[0]);
    } else {
      return res.status(404).json({ error: "Note not found" });
    }
  } catch (error) {
    console.error("Error processing update request:", error);
    return res.status(500).json({ error: "Error processing update request" });
  } finally {
    if (client) client.release();
  }
});

export default router;
