"""
API Client for fetching songs from the backend API
Uses the standard library (urllib) to avoid external dependencies.
"""

import json
import logging
from typing import List, Optional, Dict, Any
from urllib import request, parse, error

log = logging.getLogger(__name__)


class ApiClient:
    """Client for communicating with the backend API"""

    def __init__(self, base_url: str, api_key: Optional[str] = None):
        """
        Initialize API client

        Args:
            base_url: Base URL of the API (e.g., 'http://localhost:3000/api')
            api_key: Optional API key for authentication
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key

    def _build_request(self, url: str, params: Optional[Dict[str, Any]] = None) -> request.Request:
        """
        Build a urllib request with optional query parameters and headers.
        """
        if params:
            query = parse.urlencode(params)
            url = f"{url}?{query}"

        req = request.Request(url)
        req.add_header('Content-Type', 'application/json')
        if self.api_key:
            req.add_header('Authorization', f'Bearer {self.api_key}')
        return req

    def _execute(self, req: request.Request) -> Dict[str, Any]:
        """
        Execute a request and return parsed JSON.
        """
        try:
            with request.urlopen(req, timeout=30) as response:
                data = response.read().decode('utf-8')
                return json.loads(data) if data else {}
        except error.HTTPError as http_error:
            message = http_error.read().decode('utf-8', errors='ignore')
            log.error("HTTP error %s: %s", http_error.code, message)
            raise Exception(f"Błąd API ({http_error.code}): {message or http_error.reason}")
        except error.URLError as url_error:
            log.error("Connection error: %s", url_error.reason)
            raise Exception(f"Błąd połączenia: {url_error.reason}")
        except json.JSONDecodeError as json_error:
            log.error("Invalid JSON response: %s", json_error)
            raise Exception("Nieprawidłowa odpowiedź JSON z API")

    def fetch_all_songs(self) -> List[Dict[str, Any]]:
        """
        Fetch all songs from the API with pagination.

        Returns:
            List of song dictionaries
        """
        all_songs: List[Dict[str, Any]] = []
        page = 1
        limit = 100

        while True:
            url = f"{self.base_url}/songs"
            params = {'page': page, 'limit': limit}
            req = self._build_request(url, params=params)

            log.debug("Fetching songs page %s", page)
            data = self._execute(req)

            songs = data.get('data', [])
            all_songs.extend(songs)

            meta = data.get('meta', {})
            total_pages = meta.get('totalPages', page)

            if page >= total_pages or len(songs) < limit:
                break

            page += 1

        log.info("Fetched %s songs from API", len(all_songs))
        return all_songs

    def get_song_by_id(self, song_id: str) -> Dict[str, Any]:
        """
        Get a single song by ID

        Args:
            song_id: Song ID

        Returns:
            Song dictionary
        """
        url = f"{self.base_url}/songs/{song_id}"
        req = self._build_request(url)
        return self._execute(req)

