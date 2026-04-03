export interface LibConfig {
    apiBaseUrl: string;
    apiToken: string;
    cloudFrontUrl: string;
    agencyIdentifier: number;
    apiRepository?: any;
    isAdmin?: boolean;
}

export const config: LibConfig = {
    apiBaseUrl: 'http://127.0.0.1:8080',
    apiToken: '',
    cloudFrontUrl: '',
    agencyIdentifier: 1,
    isAdmin: false,
};

/**
 * Updates the global library configuration.
 */
export function setLibConfig(options: Partial<LibConfig>) {
    if (options.apiBaseUrl !== undefined) config.apiBaseUrl = options.apiBaseUrl;
    if (options.apiToken !== undefined) config.apiToken = options.apiToken;
    if (options.cloudFrontUrl !== undefined) config.cloudFrontUrl = options.cloudFrontUrl;
    if (options.agencyIdentifier !== undefined) config.agencyIdentifier = options.agencyIdentifier;
    if (options.isAdmin !== undefined) config.isAdmin = options.isAdmin;
}
