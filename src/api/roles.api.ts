import { api } from "./axios";
import { Role, RoleCategory } from "./types/roles.types";

export const getAllRoles = async (serverId: string): Promise<Role[]> => {
  const response = await api.get(`/api/roles/${serverId}/all`);
  return response.data;
};

export const getMyRoles = async (serverId: string): Promise<Role[]> => {
  const response = await api.get(`/api/roles/${serverId}/my-roles`);
  return response.data;
};

export const getSelfAssignableRoles = async (
  serverId: string
): Promise<Role[]> => {
  const response = await api.get(`/api/roles/${serverId}/self-assignable`);
  return response.data;
};

export const selfAssignRole = async (
  serverId: string,
  roleId: string
): Promise<{ message: string; role: Role }> => {
  const response = await api.post(`/api/roles/${serverId}/self-assign`, {
    roleId,
  });
  return response.data;
};

export const selfUnassignRole = async (
  serverId: string,
  roleId: string
): Promise<{ message: string }> => {
  const response = await api.post(`/api/roles/${serverId}/self-unassign`, {
    roleId,
  });
  return response.data;
};

export const createRole = async (
  serverId: string,
  data: {
    name: string;
    color?: string;
    position?: number;
    is_self_assignable?: boolean;
    category_id?: string;
  }
): Promise<Role> => {
  const response = await api.post(`/api/roles/${serverId}/create`, data);
  return response.data;
};

export const updateRole = async (
  serverId: string,
  roleId: string,
  data: {
    name?: string;
    color?: string;
    position?: number;
    is_self_assignable?: boolean;
    category_id?: string;
  }
): Promise<Role> => {
  const response = await api.put(
    `/api/roles/${serverId}/${roleId}/update`,
    data
  );
  return response.data;
};

export const deleteRole = async (
  serverId: string,
  roleId: string
): Promise<{ message: string }> => {
  const response = await api.delete(`/api/roles/${serverId}/${roleId}/delete`);
  return response.data;
};

export const assignRoleToUser = async (
  serverId: string,
  userId: string,
  roleId: string
): Promise<{ message: string }> => {
  const response = await api.post(`/api/roles/${serverId}/assign-to-user`, {
    userId,
    roleId,
  });
  return response.data;
};

export const removeRoleFromUser = async (
  serverId: string,
  userId: string,
  roleId: string
): Promise<{ message: string }> => {
  const response = await api.post(`/api/roles/${serverId}/remove-from-user`, {
    userId,
    roleId,
  });
  return response.data;
};

export const getRoleCategories = async (
  serverId: string
): Promise<RoleCategory[]> => {
  const response = await api.get(`/api/roles/${serverId}/categories`);
  return response.data;
};

export const createRoleCategory = async (
  serverId: string,
  data: {
    name: string;
    description?: string;
    position?: number;
  }
): Promise<RoleCategory> => {
  const response = await api.post(`/api/roles/${serverId}/categories`, data);
  return response.data;
};

export const updateRoleCategory = async (
  serverId: string,
  categoryId: string,
  data: {
    name?: string;
    description?: string;
    position?: number;
  }
): Promise<RoleCategory> => {
  const response = await api.put(
    `/api/roles/${serverId}/categories/${categoryId}`,
    data
  );
  return response.data;
};

export const deleteRoleCategory = async (
  serverId: string,
  categoryId: string
): Promise<{ message: string }> => {
  const response = await api.delete(
    `/api/roles/${serverId}/categories/${categoryId}`
  );
  return response.data;
};
