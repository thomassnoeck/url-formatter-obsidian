export interface UrlPattern {
    name: string;
    pattern: string;
    formatString: string;
    patternEnabled: boolean;
}

export interface UrlFormatterSettings {
    urlPatterns: UrlPattern[];
}

export const DEFAULT_SETTINGS: UrlFormatterSettings = {
    urlPatterns: [
        {
            name: 'Tickets per company',
            pattern: 'https:\\/\\/([A-Za-z0-9-]+)\\.example\\.com\\/([A-Z0-9-]+)',
            formatString: '$2 ($1)', // Example output: ABC-123 (company) (if URL is company.example.com/ABC-123)
            patternEnabled: true,
        },
    ]
};
