
import ChatList from "../components/ChatList";

import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";


export default function ChatPage() {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar />
      <ChatList />
      <ChatWindow />
    </div>
  );
}
