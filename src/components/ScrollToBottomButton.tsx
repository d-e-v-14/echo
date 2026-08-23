"use client";

export function ScrollToBottomButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to latest message"
      title="Scroll to latest message"
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
    </button>
  );
}
