import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useStore } from "../../store/store";
import getAuthToken from "../../utils/getToken";

interface CollabdropdownProps {
  onClose: () => void;
}

const Collabdropdown: React.FC<CollabdropdownProps> = ({ onClose }) => {
  const { id, userId } = useStore();
  
  const [email, setEmail] = useState<string>("");
  const [verifiedEmail, setVerifiedEmail] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  let link = `http://localhost:5173/collab?id=${encodeURIComponent(id)}`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const startCollab = async () => {
    setIsLoading(true);
    try {
      // Send invites to all verified emails
      const token = getAuthToken();
      // await axios.post("http://localhost:8080/sendInvites", {
      //   noteId: id,
      //   emails: verifiedEmail
      // }, {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });

      const url = `/collab?id=${encodeURIComponent(id)}`;
      console.log("Invites sent successfully!");
      window.open(url, '_blank');
      onClose(); // Close dropdown after success
    } catch (error) {
      console.error("Error sending invites:", error);
      alert("Failed to send invites. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  const copyToClipboard = async () => {
    try {
      // Replace this with your actual collaboration link
      
      await navigator.clipboard.writeText(link);
      
      // Optional: Show success feedback
      alert('Link copied to clipboard!');
      // Or use a toast notification if you have one
      
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      
      // Fallback for older browsers
      fallbackCopyToClipboard(link);
    }
  };
  
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const token = getAuthToken();
    setIsLoading(true);
    
    try {
      const response = await axios.get("http://localhost:8080/verifyMail", { 
        params: { email: email, note_id: id }, 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        console.log("Received data", response.data["id"]);
        if (email && !verifiedEmail.includes(email)) {
          setVerifiedEmail(prev => [...prev, email]);
        }
        setEmail(""); // Clear input after successful add
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        alert("User is not registered or invalid email");
      } else {
        console.error(error);
        alert("Error verifying email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setVerifiedEmail(prev => prev.filter(email => email !== emailToRemove));
  };

  return (
    <div 
  ref={dropdownRef}
  className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50"
>

      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Add Collaborators</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ×
        </button>
      </div>

      {/* Verified Email List */}
      {verifiedEmail.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Collaborators to invite:</p>
          <div className="space-y-1">
            {verifiedEmail.map((elem, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded">
                <span className="text-sm text-gray-800">{elem}</span>
                <button
                  onClick={() => removeEmail(elem)}
                  className="text-red-500 hover:text-red-700 text-sm font-bold ml-2"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Email Form */}
      <form onSubmit={handleAddEmail} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter collaborator email"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "..." : "Add"}
          </button>
        </div>
        <div className="flex gap-2 w-full">
          <button 
            type="button"
            onClick={startCollab}
            disabled={isLoading}
            className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending..." : "Go to Collab Page"}
          </button>
          
          <button
            type="button"
            onClick={copyToClipboard}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
          >
            Copy Link
          </button>
        </div>

        
      </form>
    </div>
  );
};

export default Collabdropdown;
function fallbackCopyToClipboard(link: string) {
  throw new Error("Function not implemented.");
}

