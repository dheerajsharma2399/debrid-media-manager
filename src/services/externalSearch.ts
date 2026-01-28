import axios from 'axios';
import { SearchResult } from './mediasearch';

const EXTERNAL_SEARCH_URL = process.env.EXTERNAL_SEARCH_API_HOSTNAME;

export async function searchExternal(path: string, queryParams: any): Promise<SearchResult[]> {
    if (!EXTERNAL_SEARCH_URL) return [];
    
    try {
        console.log(`[ExternalSearch] Params:`, JSON.stringify(queryParams));
        const queryString = new URLSearchParams(queryParams).toString();
        let fullUrl = '';

        // Check for proxy pattern "https://proxy/?https://target"
        // We look for "/?http" to identify this pattern
        if (EXTERNAL_SEARCH_URL.includes('/?http')) {
            const splitIndex = EXTERNAL_SEARCH_URL.indexOf('/?');
            // proxyBase will be like "https://corsproxy.org/?"
            const proxyBase = EXTERNAL_SEARCH_URL.substring(0, splitIndex + 2); 
            // targetBase will be like "https://debridmediamanager.com"
            const targetBase = EXTERNAL_SEARCH_URL.substring(splitIndex + 2);
            
            // Construct the complete target URL with params
            const targetUrl = `${targetBase.replace(/\/$/, '')}/${path}?${queryString}`;
            
            // Encode the entire target URL so the proxy handles it correctly
            fullUrl = `${proxyBase}${encodeURIComponent(targetUrl)}`;
        } else {
            // Standard direct connection
            const baseUrl = EXTERNAL_SEARCH_URL.replace(/\/$/, '');
            fullUrl = `${baseUrl}/${path}?${queryString}`;
        }

        console.log(`[ExternalSearch] Requesting (Smart): ${fullUrl}`);

        const response = await axios.get(fullUrl, { 
            timeout: 20000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                // Use a browser-like User-Agent to avoid blocking by some proxies/WAFs
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        console.log(`[ExternalSearch] Response Status: ${response.status}`);
        
        if (response.data) {
             if (response.data.results) {
                console.log(`[ExternalSearch] Found ${response.data.results.length} results.`);
                return response.data.results;
             } else {
                let dataSnippet = '';
                try {
                    dataSnippet = typeof response.data === 'string' 
                        ? response.data.substring(0, 500) 
                        : JSON.stringify(response.data).substring(0, 500);
                } catch (e) {
                    dataSnippet = 'Could not stringify data';
                }
                console.warn(`[ExternalSearch] Response data has no 'results' property. Data preview: ${dataSnippet}`);
             }
        } else {
            console.warn(`[ExternalSearch] Response has no data.`);
        }
        return [];
    } catch (e: any) {
        console.error('External search failed:', e.message);
        if (axios.isAxiosError(e)) {
             console.error('[ExternalSearch] Axios Error Details:', {
                status: e.response?.status,
                statusText: e.response?.statusText,
                data: e.response?.data,
                url: e.config?.url
             });
        }
        return [];
    }
}