import axios from 'axios';
import { SearchResult } from './mediasearch';

const JACKETT_URL = process.env.JACKETT;
const JACKETT_KEY = process.env.JACKETT_KEY;

export class JackettClient {
	private baseUrl: string;
	private apiKey: string;

	constructor() {
		this.baseUrl = JACKETT_URL || '';
		this.apiKey = JACKETT_KEY || '';
	}

	isConfigured(): boolean {
		return !!this.baseUrl && !!this.apiKey;
	}

	async searchMovie(imdbId: string): Promise<SearchResult[]> {
		if (!this.isConfigured()) return [];
		// Jackett/Torznab expects imdbid without 'tt' usually, but some indexers support with 'tt'.
		// Standard Torznab says: imdbid (integer).
		const imdbIdNum = imdbId.replace('tt', '');
		const url = `${this.baseUrl}/api/v2.0/indexers/all/results/torznab/api`;
		
		try {
			const response = await axios.get(url, {
				params: {
					apikey: this.apiKey,
					t: 'movie',
					imdbid: imdbIdNum,
					cat: '2000,2010,2020,2030,2040,2045,2050,2060', // Movie categories
				},
				timeout: 15000,
			});

			return this.parseTorznabXml(response.data);
		} catch (error) {
			console.error('Jackett movie search failed:', error);
			return [];
		}
	}

	async searchShow(imdbId: string, season: number, episode?: number): Promise<SearchResult[]> {
		if (!this.isConfigured()) return [];
		const imdbIdNum = imdbId.replace('tt', '');
		const url = `${this.baseUrl}/api/v2.0/indexers/all/results/torznab/api`;
		
		try {
			const params: any = {
				apikey: this.apiKey,
				t: 'tvsearch',
				imdbid: imdbIdNum,
				season: season,
				cat: '5000,5010,5020,5030,5040,5045,5050,5060,5070,5080', // TV categories
			};
			if (episode) {
				params.ep = episode;
			}

			const response = await axios.get(url, {
				params,
				timeout: 15000,
			});

			return this.parseTorznabXml(response.data);
		} catch (error) {
			console.error('Jackett TV search failed:', error);
			return [];
		}
	}

	private parseTorznabXml(xml: string): SearchResult[] {
		const results: SearchResult[] = [];
		// Simple regex parsing for <item> blocks
		const itemRegex = /<item>([\s\S]*?)<\/item>/g;
		let match;

		while ((match = itemRegex.exec(xml)) !== null) {
			const itemContent = match[1];
			
			const titleMatch = /<title>(.*?)<\/title>/.exec(itemContent);
			const linkMatch = /<link>(.*?)<\/link>/.exec(itemContent); // This might be a .torrent DL link or magnet
			const sizeMatch = /<size>(.*?)<\/size>/.exec(itemContent);
			// Torznab usually puts magnet in <torznab:attr name="magneturl" value="..." />
			const magnetMatch = /magneturl"\s+value="(.*?)"/.exec(itemContent);
            const seedersMatch = /seeders"\s+value="(.*?)"/.exec(itemContent);
            const peersMatch = /peers"\s+value="(.*?)"/.exec(itemContent);
            const infoHashMatch = /infohash"\s+value="(.*?)"/.exec(itemContent);

			const title = titleMatch ? titleMatch[1] : 'Unknown';
			const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;
            // Prefer magnet attribute, fallback to link if it looks like a magnet
            let magnet = magnetMatch ? magnetMatch[1] : '';
            if (!magnet && linkMatch && linkMatch[1].startsWith('magnet:')) {
                magnet = linkMatch[1];
            }
            
            // We strictly need a magnet link (hash extraction happens from it usually) or at least an infohash
            // If we have infohash but no magnet, we can construct a magnet
            let hash = infoHashMatch ? infoHashMatch[1] : '';
            if (!hash && magnet) {
                const hashMatch = magnet.match(/xt=urn:btih:([a-zA-Z0-9]+)/);
                if (hashMatch) hash = hashMatch[1];
            }

            if (!hash) continue; // Skip if no hash

            // Clean hash
            hash = hash.toLowerCase();

			results.push({
				title,
				fileSize: size,
				hash,
				rdAvailable: false, // Will be checked later
				adAvailable: false,
				tbAvailable: false,
				files: [], // Jackett doesn't give file list usually
				noVideos: false,
				medianFileSize: size,
				biggestFileSize: size,
				videoCount: 1, // Assumption
				imdbId: '', // We searched by it, but response might not have it easily parsed
			});
		}

		return results;
	}
}

export const jackettService = new JackettClient();
