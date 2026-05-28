import React, { useEffect, useState } from "react";

// Minimal inline SVG icons to avoid external icon font dependency
const FileTextIcon: React.FC = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.25)"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const LockIcon: React.FC = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.15)"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UsersIcon: React.FC = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.15)"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const EmptyNoteState: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    // Trigger fade-up animation on mount
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const centerClasses = `text-center p-8 flex flex-col items-center transition-all duration-700 ease-in-out ${
    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3.5"
  }`;

  return (
    <>
      {/* Google Fonts import — add to your index.html or global CSS instead */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400&display=swap');
      `}</style>

      <div className="min-h-[480px] bg-[#1a1a1a] flex items-center justify-center rounded-xl relative overflow-hidden w-full h-full" role="region" aria-label="No note selected">
        {/* Subtle radial glow */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)" }}
        />

        <div className={centerClasses}>
          {/* Icon ring */}
          <div className="w-[72px] h-[72px] rounded-full border border-white/10 bg-white/5 flex items-center justify-center mb-8">
            <FileTextIcon />
          </div>

          {/* Headline */}
          <p className="font-['DM_Serif_Display'] text-[28px] font-normal text-white/20 tracking-[-0.3px] leading-[1.3] mb-4 max-w-[380px]">
            Click a note to start{" "}
            <em className="italic text-white/30">editing</em>
            <br />
            or create a new one
          </p>

          {/* Thin divider */}
          <div className="w-8 h-px bg-white/10 my-5 mx-auto" />

          {/* Sub-hints */}
          <div className="font-['DM_Sans'] text-[13px] font-light text-white/20 tracking-[0.5px] flex items-center justify-center gap-2.5">
            <span className="flex items-center gap-[5px]">
              <LockIcon />
              Private Note
            </span>
            <span className="w-[3px] h-[3px] rounded-full bg-white/10 inline-block" />
            <span className="flex items-center gap-[5px]">
              <UsersIcon />
              Shared Note
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmptyNoteState;