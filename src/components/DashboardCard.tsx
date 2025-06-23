interface Props {
  title: string;
  image: string;
  members?: string;
}

export default function DashboardCard({ title, image, members }: Props) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-cover bg-center h-40 shadow-md hover:shadow-lg transition"
      style={{ backgroundImage: `url(${image})` }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-50 p-4 flex flex-col justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        {members && <p className="text-sm text-white/70">{members} Members</p>}
      </div>
    </div>
  );
}
