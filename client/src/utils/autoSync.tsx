import { getUnsyncedNotes,updateNoteSync } from "../IndexDB/db";
import { notesRepository } from "../repositories";

const autoSync= async(userId:string)=>{
    const unsycnedNotes  = await getUnsyncedNotes(userId);
    if(userId!=="Guest"){
        try{
            
            for(const note of unsycnedNotes){
                try{
                    console.log(note);
                    const res = await notesRepository.updateOwned({
                      id: note.id,
                      title: note.title,
                      content: note.content,
                      updatedat: note.updatedat || note.updatedAt,
                    });
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
