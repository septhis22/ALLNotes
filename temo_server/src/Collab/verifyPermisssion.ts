import express,{Request,Response} from "express";
import pool from "../Database/db";
// import { authenticateSupabaseToken } from "../middleware/supebaseAuth";
import { authenticateSupabaseToken } from "../middleware/supebaseAuth";
const router = express.Router();

router.get('/',authenticateSupabaseToken, async (req:Request, res:Response):Promise<any> => {
    console.log("verifyPermission route hit");
    let client;
    try {
        const  {id}  = req.query;
        const userId = req.user?.id;
        console.log("id:", id, "userId:", userId);

        if (!id || !userId || id === "anonymous") {
            console.log("Missing id or userId or id is anonymous");
            return res.sendStatus(401);
        }

        client = await pool.connect();
        const response = await client.query(
            "SELECT permission FROM note_collaborators WHERE note_id=$1 AND user_id=$2",
            [id, userId]
        );

        if (response.rows.length > 0) {
            res.send({data:response.rows,userId:userId});
        } else {
            res.status(409).send({ error: "the user does not exist" });
        }
    } catch (e) {
        console.error("error", e); // Log full error
        res.status(500).send({ error: "Internal server error", detail: e });
    } finally {
        if (client) client.release();
    }
});


export default router;
