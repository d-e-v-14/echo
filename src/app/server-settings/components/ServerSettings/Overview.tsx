import { useState, useRef } from "react";

export default function Overview() {
  const [serverName, setServerName] = useState<string>("Hack Battle");
  const [region, setRegion] = useState<string>("");
  const [serverIcon, setServerIcon] = useState<string>("/server-default.png");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => fileInputRef.current?.click();
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setServerIcon(URL.createObjectURL(file));
  };

  return (
    <div className="max-w-xl mx-auto p-8 text-white">
      <h1 className="text-2xl font-bold mb-8">Overview</h1>
      <div className="mb-6">
        <label className="block font-semibold mb-2 text-[#b5bac1]">Server Name</label>
        <div className="flex items-center gap-2">
          <input
            className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 focus:border-[#b5bac1] focus:outline-none transition-all duration-200 transform hover:-translate-y-1 focus:-translate-y-1"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder="Server Name"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block font-semibold mb-2 text-[#b5bac1]">Server Icon</label>
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              className="w-16 h-16 rounded-full border-2 border-[#72767d] cursor-pointer object-cover transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 hover:scale-105"
              src={serverIcon}
              alt="Server Icon"
              onClick={handleIconClick}
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleIconChange}
            />
            <div
              className="absolute bottom-0 right-0 bg-[#72767d] rounded-full p-1 cursor-pointer hover:bg-[#b5bac1] transition"
              onClick={handleIconClick}
              title="Change Icon"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                  fill="#23272a"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-8">
        <label className="block font-semibold mb-2 text-[#b5bac1]">Region</label>
        <div className="relative w-full">
          <select
            className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 pr-10 appearance-none focus:border-[#b5bac1] focus:outline-none transition-all duration-200 transform hover:-translate-y-1 focus:-translate-y-1"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">Select a region</option>
            <option value="us-east">US East</option>
            <option value="us-west">US West</option>
            <option value="us-central">US Central</option>
            <option value="eu-west">EU West</option>
            <option value="eu-central">EU Central</option>
            <option value="singapore">Singapore</option>
            <option value="sydney">Sydney</option>
            <option value="japan">Japan</option>
            <option value="russia">Russia</option>
            <option value="brazil">Brazil</option>
            <option value="hongkong">Hong Kong</option>
            <option value="southafrica">South Africa</option>
            <option value="india">India</option>
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
      <div className="flex justify-end">
        <button
          className="bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded px-6 py-2 shadow transition-all duration-200
            hover:from-[#ffcc33] hover:to-[#ffb347] hover:-translate-y-1 hover:scale-105 focus:outline-none"
          style={{
            backgroundSize: "200% 200%",
            backgroundPosition: "left center",
            transition: "background-position 0.5s, transform 0.2s"
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundPosition = "right center")}
          onMouseLeave={e => (e.currentTarget.style.backgroundPosition = "left center")}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
