"use client";
import { useRouter } from "next/navigation";

export default function CreateServerPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Sidebar */}
      <div className="w-16 p-2 flex flex-col items-center bg-black space-y-3 border-r border-gray-800">
        <button
          onClick={() => router.push("/create-server")}
          className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl flex items-center justify-center transition-transform hover:scale-105 mb-2"
          title="Create Server"
        >
          +
        </button>
      </div>

      {/* Main content centered */}
      <main className="flex-1 flex items-center justify-center bg-black">
        <div className="w-full max-w-md p-8 bg-gray-900 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-center">
            Create a Server
          </h1>
          <form className="space-y-4">
            <input
              type="text"
              placeholder="Server Name"
              className="w-full p-2 bg-gray-800 rounded-lg text-white"
            />
            <button
              type="submit"
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg"
            >
              Create
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
