import express,{Response,Request} from "express";
import pool from "./Database/db";
import { PoolClient } from '../node_modules/@types/pg';
import { authenticateSupabaseToken } from "./middleware/supebaseAuth";

const router = express.Router();

router.get('/', authenticateSupabaseToken,async (req:Request, res:Response):Promise<any> => {
  let client: PoolClient | undefined;
  
  try {
   const userId = req.user?.id;
    
    // Validate userId parameter
    if (!userId) {
      return res.status(400).json({ 
        error: "userId parameter is required" 
      });
    }

    // Get database connection
    client = await pool.connect();
    console.log("Database connected successfully");
    
    // Execute query - using double quotes for camelCase column name
    const result = await client.query(
      `SELECT * FROM notes WHERE owner = $1 ORDER BY "updatedat" ASC`, 
      [userId]
    );
    
    console.log(`Found ${result.rows.length} notes for user ${userId}`);
    
    // Send successful response
    res.status(200).json(result.rows);
    
  } catch (error) {
    console.error("Database error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: req.query.userId
    });
    
    // Send error response if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : 
          undefined
      });
    }
  } finally {
    // Always release the client connection
    if (client) {
      try {
        client.release();
        console.log("Database connection released");
      } catch (releaseError) {
        console.error("Error releasing client:", releaseError);
      }
    }
  }
});

export default router;