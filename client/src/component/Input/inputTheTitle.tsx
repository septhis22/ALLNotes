import React, { useState } from 'react';

type Props = {
  onSubmit: (title: string) => void;
  onClose: () => void;
};

export const InputTheTitle = ({ onSubmit, onClose }: Props) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title.trim());
    }
  };

  return (
    <div className="bg-[#242424] p-6 rounded-lg w-96 shadow-xl border border-[#3f3f3f]">
      <h2 className="text-xl font-semibold mb-4 text-white">Enter Note Title</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full bg-[#333333] text-white px-4 py-2 rounded border border-[#3f3f3f] mb-4 focus:outline-none focus:border-blue-500"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white hover:bg-[#333333] rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
};
