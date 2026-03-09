import express from "express";
import pool from "./Database/db";
import { error } from "console";
import { authenticateSupabaseToken } from "./middleware/supebaseAuth";

const router = express.Router();

router.get('/',authenticateSupabaseToken, async (req, res) => {
    let client;
    const userId = req.user?.id;
    const { id } = req.query;
    if(!userId){
      res.sendStatus(403);
      return;
    }
    try {
      client = await pool.connect();
  
      let result;
      if (id) {
        result = await client.query("select * from notes where Id=$1;", [id]);
        if(result.rows.length===0){
          res.sendStatus(402);
          return;
        }
        res.json(result.rows[0]);

      }
    } catch (error) {
      console.error("Internal server error:", error);
      if (!res.headersSent) {  // check if headers already sent
        res.status(500).json({ error: "Internal server error" });
      }
    } finally {
      if (client) {
        client.release();
      }
    }
  });
  

export default router;