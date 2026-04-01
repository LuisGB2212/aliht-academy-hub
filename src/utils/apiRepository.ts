// import { useLoadingActions } from "@/stores/loading-actions";
// import { openNotification } from "./notification-util";
// import { ApiError } from "@/exceptions/ApiError";

import { config } from '../types/lib-config-type';

export const BASE_URL = () => config.apiBaseUrl;
export const API_TOKEN = () => config.apiToken;

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

const token = localStorage.getItem('authToken')?.replace(/['"]+/g, '');

export const apiRepository = {
    token: localStorage.getItem('authToken')?.replace(/['"]+/g, ''),
    async request<T>(endpoint: string, options: RequestOptions = {}, agencyIdentifier: string | null = null): Promise<ApiResponse<T>> {
        const { method = 'GET', headers = {}, body } = options;

        const config: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'API-Key': API_TOKEN(),
                ...headers,
                ...(agencyIdentifier ? { 'Agency-Identifier': agencyIdentifier } : {})
            },
        };

        if (body) config.body = JSON.stringify(body);

        try {
            const url = `${BASE_URL()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
            const response = await fetch(url, config);
            
            // Si la respuesta es 204 (No Content), no intentamos parsear JSON
            if (response.status === 204) return { success: true, data: {} as T };

            const data = await response.json();

            if (!response.ok || (data && data.success === false)) {
                console.log(data);
                // throw new ApiError({
                //     message: data.message || `${response.status}`, 
                //     statusCode: response.status,
                //     code: data.message ? 'ERROR_API' : 'GENERIC_ERROR',
                //     errors: (Object.values(data.errors || {}) as string[][]).flat()
                // });
            }

            return data;
        } catch (error: any) {
            // console.error(`API Repository Error [${method} ${endpoint}]:`, error.message);
            // openNotification(
            //     "error", 
            //     error.message ?? "Algo salió mal, intente de nuevo.",
            //     error instanceof ApiError ? (error.errors.join('<br>')) : ""
            // );
            throw error;
        }
    },

    async get<T>({endpoint, auth = true, loading = true, headers = {}, agencyIdentifier = null }: {
        endpoint: string; auth?: boolean; loading?: boolean; headers?: Record<string, string>; agencyIdentifier?: string | null;
    }) {
        // const { setLoadingGet } = useLoadingActions();
        // if (loading) setLoadingGet(true);
        try {
            const finalHeaders = {
                ...headers,
                ...(auth && token ? { Authorization: `Bearer ${token}` } : {})
            };
            return await this.request<T>(endpoint, { method: 'GET', headers: finalHeaders }, agencyIdentifier);
        } finally {
            // if (loading) setLoadingGet(false);
        }
    },

    async post<T>({endpoint, body, headers = {}, agencyIdentifier = null }: {
        endpoint: string; body?: any; headers?: Record<string, string>; agencyIdentifier?: string | null;
    }) {
        // const { setLoadingPost } = useLoadingActions(); 
        // setLoadingPost(true);
        try {
            const finalHeaders = {
                ...headers,
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            };
            return await this.request<T>(endpoint, { method: 'POST', body, headers: finalHeaders }, agencyIdentifier);
        } finally {
            // setLoadingPost(false);
        }
    },

    async put<T>({endpoint, body, headers = {}, agencyIdentifier = null }: {
        endpoint: string; body?: any; headers?: Record<string, string>; agencyIdentifier?: string | null;
    }) {
        // const { setLoadingPut } = useLoadingActions();
        // setLoadingPut(true);
        try {
            const finalHeaders = {
                ...headers,
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            };
            return await this.request<T>(endpoint, { method: 'PUT', body, headers: finalHeaders }, agencyIdentifier);
        } finally {
            // setLoadingPut(false);
        }
    },

    async delete<T>({endpoint, headers = {}, agencyIdentifier = null }: {
        endpoint: string; headers?: Record<string, string>; agencyIdentifier?: string | null;
    }) {
        const finalHeaders = {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
        return await this.request<T>(endpoint, { method: 'DELETE', headers: finalHeaders }, agencyIdentifier);
    }
};
