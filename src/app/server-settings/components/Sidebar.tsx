interface SidebarProps {
  selected: string;
  onSelect: (tab: string) => void;
}

const menuItems = [
  "Overview",
  "Role",
  "Members",
  "Invite people",
  "Leave",
  "Danger Zone",
];

export default function Sidebar({ selected, onSelect }: SidebarProps) {
  return (
    <nav className="w-64 min-h-screen bg-[#18191c] p-6 flex flex-col border-r border-[#23272a]">
      <h2 className="text-2xl font-extrabold mb-8 text-white tracking-wide">Server Settings</h2>
      <ul className="flex flex-col gap-1">
        {menuItems.map((item) => (
          <li
            key={item}
            className={`px-4 py-2 rounded cursor-pointer font-medium transition-all duration-150
              ${
                selected === item
                  ? "bg-[#23272a] text-white"
                  : "text-[#b5bac1] hover:bg-[#23272a] hover:text-white"
              }
            `}
            onClick={() => onSelect(item)}
          >
            {item}
          </li>
        ))}
      </ul>
    </nav>
  );
}
