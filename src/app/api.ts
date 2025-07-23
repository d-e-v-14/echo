import axios from 'axios';
export interface User {
    id: string;
    email: string;
    username: string;
    fullname: string;
    avatar_url: string | null;
    bio: string;
    date_of_birth: string;
    status: string;
    created_at: string;
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
export const register = async (
    email: string,
    username: string,
    password: string
) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        username,
        password,
    });
    return response.data;
};

export const login = async (
    identifier: string,
    password: string
) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        identifier,
        password,
    });
    if (response.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
};
export async function forgotPassword(email: string) {
    const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email,
    });
    return response.data;
}
export async function getUser(): Promise<User | null> {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
        return JSON.parse(storedUser) as User;
    }
    return null;
}
export async function resetPassword(newPassword: string, token: string) {
    const response = await axios.post(
        `${API_BASE_URL}/auth/reset-password`,
        { new_password: newPassword },
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
    return response.data;
}
