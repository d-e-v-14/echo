"use client";

export function ScrollToBottomButton({
  onClick,
  className,
  count = 0,
}: {
  onClick: () => void;
  className?: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to latest message"
      title="Jump to present"
      className={`absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-lg ring-1 ring-black/30 transition ${
        className ??
        "bg-[#2b2d31] text-[#b5bac1] hover:bg-[#3a3c43] hover:text-white"
      }`}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 5v14m0 0l-6-6m6 6l6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#FFC341] text-black text-[10px] font-bold">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
