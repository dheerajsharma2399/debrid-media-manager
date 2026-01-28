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
        
        const response = await axios.get(url, { params: queryParams, timeout: 20000 });
        if (response.data && response.data.results) {
            return response.data.results;
        }
        return [];
    } catch (e: any) {
        console.error('External search failed:', e.message);
        return [];
    }
}
