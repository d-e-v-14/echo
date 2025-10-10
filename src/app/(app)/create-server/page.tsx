"use client";
import { useRouter } from "next/navigation";


export default function CreateServerPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center bg-black">
        <div className="w-full max-w-md p-8 bg-black rounded-lg shadow-lg">
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
          <button
            onClick={() => router.push("/servers")}
            className="mt-6 w-full py-4 text-lg rounded-md bg-gray-700 hover:bg-gray-600 transition-all"
          >
            ← Back to Servers
          </button>
        </div>
      </main>
    </div>
  );
}
