import { Request, Response, NextFunction } from "express";
import { getSupabase } from "../lib/supabase.js";
import { noteCollaboratorsRepository,sharedNoteRepository } from "../repositories/index.js";

interface AuthRequest extends Request {
    user?: any;
}

export const authUserAndNotePermission = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        let token: string | undefined;

        // 1. Try to get token from Authorization header
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith("bearer ")) {
            token = authHeader.substring(7); // Remove 'Bearer ' (length 7)
        } 
        // 2. Fallback to query parameter
        else if (req.query?.token) {
            token = String(req.query.token);
        }
        if (!token) {
            return res.status(401).json({ error: "Missing or invalid authorization token" });
        }

        const supabase = getSupabase();

        // 1. Verify user is authorized
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: "Unauthorized user" });
        }

        req.user = user;

        // 2. Check if the user has permission for the note
        // assuming noteId could be in params or body
        const noteId = req.params.noteId || req.body.noteId || req.query.noteId;

        if (!noteId) {
            return res.status(400).json({ error: "Note ID is required" });
        }

        const owner_id = await sharedNoteRepository.fetchOwner(noteId as string);

        const hasPermission = await noteCollaboratorsRepository.VerifyUser(noteId as string, user.id);

        // Allowed if user has implicit permission (is collaborator) OR is the owner of the note
        if (!hasPermission && user.id !== owner_id) {
            return res.status(403).json({ error: "User does not have permission for this note" });
        }

        next();
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

