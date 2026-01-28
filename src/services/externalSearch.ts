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

        const response = await axios.get(url, { params: queryParams, timeout: 20000 });

        console.log(`[ExternalSearch] Response Status: ${response.status}`);
        
        if (response.data) {
             if (response.data.results) {
                console.log(`[ExternalSearch] Found ${response.data.results.length} results.`);
                return response.data.results;
             } else {
                console.warn(`[ExternalSearch] Response data has no 'results' property. Keys: ${Object.keys(response.data).join(', ')}`);
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
