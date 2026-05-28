import { getSupabase } from "../lib/supabase.js";

export const profilesRepository = {
    async getUserName (userId :string) : Promise <string>{
        const {data,error} = await getSupabase()
        .from('profiles')
        .select('full_name')
        .eq('id',userId)
        .maybeSingle();

    if(error) throw error;

    if(!data) return "user";

    return data.full_name;
    },

    
}