import { getUnsyncedNotes,updateNoteSync } from "../IndexDB/db";
import { notesRepository } from "../repositories";

const autoSync= async(userId:string)=>{
    const unsycnedNotes  = await getUnsyncedNotes(userId);
    if(userId!=="Guest"){
        try{
            for(const note of unsycnedNotes){
                try{
                    const res = await notesRepository.updateOwned({
                      id: note.id,
                      title: note.title,
                      note_data: note.note_data,
                      updatedat: note.updatedat || (note as any).updatedAt,
                    });
                    updateNoteSync(note.id, true);
                }catch(error){}
            }
        }catch{}
    }
    else{
        return;
    }
    
    
}

export default autoSync;
