import axios from 'axios';

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
    return response.data;
};
export async function forgotPassword(email: string) {
    const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email,
    });
    return response.data;
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