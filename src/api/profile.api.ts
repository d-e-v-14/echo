import {api} from "./axios";
import {profile} from "./types/profile.types";

export const fetchProfile = async (): Promise<profile> => {
    if (typeof window === "undefined") throw new Error("Client only");

    const res = await api.get("/api/profile/getProfile", {
        withCredentials: true,
    });

    return res.data.user;
};

export async function getUser(): Promise<profile | null> {
    if (typeof window !== "undefined") {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            return JSON.parse(storedUser) as profile;
        }
    }
    return null;
}
