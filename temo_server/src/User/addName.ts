import express,{Request,Response} from "express";
import pool from "../Database/db";
import { authenticateSupabaseToken } from "../middleware/supebaseAuth";

const router = express.Router();

router.post('/',authenticateSupabaseToken,async(req:Request,res:Response):Promise<any>=>{
    let client;
    const{name} = req.body;
    const userId = req.user?.id;
    const email = req.user?.email;
    
    if(!name){
        console.log("No name found")
        return res.sendStatus(404); // Add return
    }
    if(!userId){
        console.log("No user found");
        return res.sendStatus(401); // Add return
    }
    if(!email){
        console.log("no email found");
        return res.sendStatus(402); // Add return
    }
    
    try{
        client = await pool.connect();
        const response = await client.query("UPDATE profiles SET email = $1, full_name = $2 WHERE id = $3",[email,name,userId]);
        
        if(response.rows.length> 0){ // Use rowCount instead of rows.length
            return res.sendStatus(200);
        }
        else{
            console.log("No rows updated - user profile not found");
            return res.sendStatus(404); // 404 is more appropriate than 403
        }
    }catch(error){
        console.log("Internal error:", error);
        return res.sendStatus(500);
    }
    finally {
        if (client) {
            client.release();
        }
    }
})
