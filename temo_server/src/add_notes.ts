import express, { Request, Response } from "express";
import pool from "./Database/db";
import { authenticateSupabaseToken } from "./middleware/supebaseAuth";
// Create a router
const router = express.Router();

router.post('/add_notes',authenticateSupabaseToken,async (req: Request, res: Response):Promise<void> => {
  const { id, title, content, updated_at } = req.body;
  const userId = req.user?.id;

  try {
    const client = await pool.connect();
    try {
      
      const response = await client.query(
        'INSERT INTO notes(id, title, content, updatedat,owner) VALUES ($1, $2, $3, $4 ,$5) RETURNING id',
        [id, title, content, updated_at,userId]
      );
      const addmember = await client.query(
        "INSERT INTO note_collaborators(note_id, user_id, permission) VALUES ($1, $2, $3) RETURNING note_id",
        [id, userId, ["w", "r"]]
    );
      res.status(201).json(response.rows[0]);
    } catch (err) {
      console.error("DB insert error:", err);
      res.status(500).json({ error: "Database insert failed" });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error inserting data:", err);
    res.status(500).json({ error: "Failed to save note" });
  }
});

export default router;
