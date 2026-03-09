import express from "express";
import cors from "cors";
import { json } from "stream/consumers";
import get_notes from "./get_notes";
import add_notes from "./add_notes"
import update_notes from "./update_notes"
import verifyMail from  "./Collab/verifyMail";
import verifyPermission from "./Collab/verifyPermisssion"
import  getAllNotes  from "./getAllnotes"
import removeUser from "./Collab/removeUsersFromCollab";
import getCollabUsers from "./Collab/getCollabUsers";
import getProfile from "./User/getProfile";
import updateUserName from "./User/updateUserName";
const app = express();
const port = 8080;

const corsOption = {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOption));
app.options('*', cors(corsOption)); // Enable pre-flight for all routes
app.use(express.json()); 

app.get('/api',(req,res)=>{
    res.json({"msg":"hello"});
})
app.use('/getAllNotes',getAllNotes);
app.use('/get_note',get_notes);
app.use('/verifyPermission',verifyPermission);
app.use('/verifyMail',verifyMail);
app.use('/update_notes',update_notes);
app.get('/notes',get_notes);
app.post('/add_notes',add_notes);
app.use('/removeUser',removeUser);
app.use('/getProfile',getProfile);
app.use('/updateUsername',updateUserName);
app.get('/getCollabUsers',getCollabUsers);

app.listen(port,()=>{
    console.log(`The app is listenin on the port ${port}`);
})
