import { useState } from "react";

export default function InvitePeople() {
  const [inviteLink, setInviteLink] = useState<string>("https://echo.gg/ABC123");
  const [expiresAfter, setExpiresAfter] = useState<string>("7 days");
  const [maxUses, setMaxUses] = useState<string>("No limit");

  const handleGenerateLink = () => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setInviteLink(`https://echo.gg/${randomCode}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
  };

  return (
    <div className="max-w-lg mx-auto p-8 text-white">
      <h1 className="text-2xl font-bold mb-8">Invite People</h1>
      <div className="mb-7">
        <label className="block text-sm text-[#b5bac1] mb-2 font-semibold">Invite Link</label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={inviteLink}
            readOnly
            className="bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 text-base flex-1 focus:border-[#b5bac1] focus:outline-none transition-all duration-200"
          />
          <button
            className="bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded px-4 py-2 shadow transition-all duration-200
              hover:from-[#ffcc33] hover:to-[#ffb347] hover:-translate-y-1 hover:scale-105 focus:outline-none"
            style={{
              backgroundSize: "200% 200%",
              backgroundPosition: "left center",
              transition: "background-position 0.5s, transform 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundPosition = "right center")}
            onMouseLeave={e => (e.currentTarget.style.backgroundPosition = "left center")}
            onClick={handleCopyLink}
          >
            Copy
          </button>
        </div>
      </div>
      <div className="flex gap-6 mb-8 flex-col md:flex-row">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm text-[#b5bac1] mb-2 font-semibold">Expires after</label>
          <div className="relative w-full">
            <select
              className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 pr-10 appearance-none focus:border-[#b5bac1] focus:outline-none transition-all duration-200"
              value={expiresAfter}
              onChange={(e) => setExpiresAfter(e.target.value)}
            >
              <option value="30 minutes">30 minutes</option>
              <option value="1 hour">1 hour</option>
              <option value="6 hours">6 hours</option>
              <option value="12 hours">12 hours</option>
              <option value="1 day">1 day</option>
              <option value="7 days">7 days</option>
              <option value="30 days">30 days</option>
              <option value="Never">Never</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg
                className="w-5 h-5 text-[#b5bac1]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm text-[#b5bac1] mb-2 font-semibold">Max number of uses</label>
          <div className="relative w-full">
            <select
              className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 pr-10 appearance-none focus:border-[#b5bac1] focus:outline-none transition-all duration-200"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            >
              <option value="No limit">No limit</option>
              <option value="1 use">1 use</option>
              <option value="5 uses">5 uses</option>
              <option value="10 uses">10 uses</option>
              <option value="25 uses">25 uses</option>
              <option value="50 uses">50 uses</option>
              <option value="100 uses">100 uses</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg
                className="w-5 h-5 text-[#b5bac1]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          className="bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded px-6 py-2 shadow transition-all duration-200
            hover:from-[#ffcc33] hover:to-[#ffb347] hover:-translate-y-1 hover:scale-105 focus:outline-none"
          style={{
            backgroundSize: "200% 200%",
            backgroundPosition: "left center",
            transition: "background-position 0.5s, transform 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundPosition = "right center")}
          onMouseLeave={e => (e.currentTarget.style.backgroundPosition = "left center")}
          onClick={handleGenerateLink}
        >
          Generate New Link
        </button>
      </div>
    </div>
  );
}
