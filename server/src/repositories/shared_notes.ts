import { get } from "http";
import { getSupabase } from "../lib/supabase.js";

export interface NoteRow{
    id: string,
    owner_id: string,
    title : string,
    content : any,
    created_at: string,
    updated_at :string
}



export const sharedNoteRepository = {
   


    async fetchNoteData(noteId: string): Promise<NoteRow[]> {
        const {data,error} = await getSupabase()
        .from('shared_notes')
        .select('*')
        .eq('id',noteId) 

        if(error) throw error;
        return (data ?? [])as NoteRow[] ;
    },

    async updateNotedata(noteId:string, note_data:any): Promise<void> {
        const {data,error} = await getSupabase()
        .from('shared_notes')
        .update({
            content : note_data
        })
        .eq('id',noteId)
        .select('*')
        .maybeSingle();
        if(error) throw error;
        return;
    },

    async fetchOwner(noteId:string):Promise<string>{
        const {data,error} = await getSupabase()
        .from('shared_notes')
        .select('owner_id')
        .eq('id',noteId) 

        if(error) throw error;
        return data[0].owner_id;
    }

    

}