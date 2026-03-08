import { getUnsyncedNotes,updateNoteSync } from "../IndexDB/db";
import axios from 'axios';
import getAuthToken from "./getToken";


import React from 'react'

const autoSync= async(userId:string)=>{
    const token = getAuthToken();
    const unsycnedNotes  = await getUnsyncedNotes(userId);
    if(userId!=="Guest"){
        try{
            
            for(const note of unsycnedNotes){
                try{
                    console.log(note);
                    const res = await axios.post(
                        "http://localhost:8080/update_notes",
                        {
                            _userId:note.userId,
                            id:note.id,
                            title:note.title,
                            content:note.content,
                            updatedAt:note.updatedAt,
                        },  // Data object
                        {
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        }  // Config object with headers
                      );                      
                    console.log(res);
                    updateNoteSync(note.id, true);
                }catch(error){
                    console.log("error updating table: ",error);
                }
            }
    
            console.log("auto synced sucess");
        }catch{
            console.log("Auto synced failed");
        }
    }
    else{
        return;
    }
    
    
}

export default autoSync;