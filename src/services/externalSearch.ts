import axios from 'axios';
import { SearchResult } from './mediasearch';

const EXTERNAL_SEARCH_URL = process.env.EXTERNAL_SEARCH_API_HOSTNAME;

export async function searchExternal(path: string, queryParams: any): Promise<SearchResult[]> {
    if (!EXTERNAL_SEARCH_URL) return [];
    
    try {
        // Construct the full URL.
        // Assuming EXTERNAL_SEARCH_API_HOSTNAME is like "https://corsproxy.org/?https://debridmediamanager.com" or just "https://debridmediamanager.com"
        // We append the path (e.g. "api/torrents/movie") to it.
        
        const baseUrl = EXTERNAL_SEARCH_URL.replace(/\/$/, '');
        // If the URL already contains a query string (like corsproxy), we need to be careful
        // But usually the instruction is to append the path.
        
        const url = `${baseUrl}/${path}`;
        
        console.log(`[ExternalSearch] Requesting: ${url}`);
        console.log(`[ExternalSearch] Params:`, JSON.stringify(queryParams));

        // Manually construct the query string to avoid Axios incorrectly using '&' 
        // when the baseUrl (proxy) already has a '?'
        const queryString = new URLSearchParams(queryParams).toString();
        const fullUrl = `${url}?${queryString}`;

        console.log(`[ExternalSearch] Requesting (Manual): ${fullUrl}`);

        const response = await axios.get(fullUrl, { 
            // params: queryParams, // Do not pass params to axios, we added them to URL
            timeout: 20000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
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
