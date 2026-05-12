import { useState } from 'react';
import { profilesRepository , noteCollaboratorsRepository} from '../../repositories';
import { X } from 'lucide-react';

export const EmailSearchBar = ({ noteId, onClose }: { noteId?: string, onClose?: () => void }) => {
    const[loading,setLoading] = useState<boolean>(false);
    const [knowEmail, setKnowEmail] = useState<string[]>([]);
    const [emailInput, setEmailInput] = useState<string>('');
    
    const removeEmail = (emailToRemove: string) => {
        // Placeholder for remove logic if needed on backend
        setKnowEmail(prev => prev.filter(email => email !== emailToRemove));
    }

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#333]">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-sm font-medium">Add Collaborators</h3>
        {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X size={16} />
            </button>
        )}
      </div>
      <div className="flex items-center gap-2">
      <input
        type="email"
        placeholder="Enter email..."
        value={emailInput}
        onChange={(e) => setEmailInput(e.target.value)}
        disabled={loading}
        className="[--background:#000000] [--color:#ffffff] [--muted:#242424] [--muted-foreground:#9c9c9c] [--border:#2e2e2e] relative flex items-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-[--border] bg-[--background] text-[--color] px-4 py-2 rounded-[0.5rem] text-sm font-normal shadow-none h-8 w-64 placeholder:text-[--muted-foreground]"
      />
      
      <button
        type="button"
        disabled={loading}
        className="[--background:#000000] [--color:#ffffff] [--muted:#242424] [--muted-foreground:#9c9c9c] [--border:#2e2e2e] relative inline-flex items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-[--border] bg-[--background] hover:bg-[--muted] text-[--muted-foreground] hover:text-[--color] px-4 py-2 justify-center rounded-[0.5rem] text-sm font-normal shadow-none h-8"
        onClick={async()=>{
            setLoading(true);
            try {
                if(await profilesRepository.checkProfileStatus(emailInput)){
                    setKnowEmail(prevemail => [...prevemail ,emailInput]);
                    setEmailInput('');
                }
            } catch (error) {
                console.error("Error checking profile:", error);
            } finally {
                setLoading(false);
            }
        }}
      >
        {loading ? 'Adding...' : 'Add'}
      </button>

      <button
        type="button" 
        disabled={loading || !noteId}
        className="[--background:#000000] [--color:#ffffff] [--muted:#242424] [--muted-foreground:#9c9c9c] [--border:#2e2e2e] relative inline-flex items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-[--border] bg-[--background] hover:bg-[--muted] text-[--color] px-4 py-2 justify-center rounded-[0.5rem] text-sm font-normal shadow-none h-8 w-20"
        onClick={async() => {
           if (!noteId) return;
           setLoading(true);
           try {
               await noteCollaboratorsRepository.addCollaboratorByEmail(noteId, knowEmail);
               if (onClose) onClose();
           } catch (error) {
               console.error("Error adding collaborators:", error);
           } finally {
               setLoading(false);
           }
        }}
      >
        {loading ? 'Sending...' : 'Send'}
      </button>
      </div>

      {knowEmail.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {knowEmail.map((email) => (
                <div key={email} className="flex items-center gap-1 bg-[#333] text-white px-2 py-1 rounded-full text-xs">
                    <span>{email}</span>
                    <button 
                        onClick={() => removeEmail(email)}
                        className="text-gray-400 hover:text-white rounded-full p-0.5"
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
          </div>
      )}
    </div>
  )
}

 