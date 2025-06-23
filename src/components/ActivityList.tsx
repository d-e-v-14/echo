interface Props {
  activities: string[];
}

export default function ActivityList({ activities }: Props) {
  return (
    <ul className="space-y-3">
      {activities.map((item, idx) => (
        <li key={idx} className="text-sm text-gray-300">
          {item}
        </li>
      ))}
    </ul>
  );
}
