interface Props {
  users: string[];
}

export default function UserList({ users }: Props) {
  return (
    <ul className="space-y-3">
      {users.map((user, idx) => (
        <li key={idx} className="flex items-center gap-3">
          <img
            src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${user}`}
            className="w-8 h-8 rounded-full"
            alt={user}
          />
          <span>{user}</span>
        </li>
      ))}
    </ul>
  );
}
