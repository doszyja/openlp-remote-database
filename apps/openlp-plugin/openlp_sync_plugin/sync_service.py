"""
Service for syncing songs to OpenLP database
"""

import logging
import sqlite3
from typing import List, Dict, Any, Optional, Callable
import json
import re
from datetime import datetime

log = logging.getLogger(__name__)


class SyncService:
    """Service for syncing songs to OpenLP SQLite database"""
    
    def __init__(self, db_path: str):
        """
        Initialize sync service
        
        Args:
            db_path: Path to OpenLP SQLite database file
        """
        self.db_path = db_path
    
    def sync_songs(
        self,
        songs: List[Dict[str, Any]],
        progress_callback: Optional[Callable[[str], None]] = None
    ) -> Dict[str, int]:
        """
        Sync songs to OpenLP database
        
        Args:
            songs: List of song dictionaries from API
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dictionary with sync statistics
        """
        result = {
            'created': 0,
            'updated': 0,
            'errors': 0
        }
        
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get existing songs with backend IDs
            existing_songs = self._get_existing_songs(cursor)
            
            for idx, song in enumerate(songs):
                try:
                    if progress_callback:
                        progress_callback(f"Przetwarzanie pieśni {idx + 1}/{len(songs)}: {song.get('title', 'Bez tytułu')}")
                    
                    song_id = song.get('id')
                    if not song_id:
                        log.warning(f"Song missing ID: {song.get('title')}")
                        result['errors'] += 1
                        continue
                    
                    # Check if song already exists
                    openlp_id = existing_songs.get(song_id)
                    
                    if openlp_id:
                        # Update existing song
                        self._update_song(cursor, openlp_id, song)
                        result['updated'] += 1
                    else:
                        # Insert new song
                        self._insert_song(cursor, song)
                        result['created'] += 1
                    
                except Exception as e:
                    log.exception(f"Error syncing song {song.get('title', 'Unknown')}: {e}")
                    result['errors'] += 1
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            log.exception("Error during sync")
            raise Exception(f"Błąd podczas synchronizacji: {str(e)}")
        
        return result
    
    def _get_existing_songs(self, cursor: sqlite3.Cursor) -> Dict[str, int]:
        """
        Get mapping of backend IDs to OpenLP IDs from comments field
        
        Returns:
            Dictionary mapping backend_id -> openlp_id
        """
        mapping = {}
        
        try:
            cursor.execute("SELECT id, comments FROM songs WHERE comments IS NOT NULL")
            rows = cursor.fetchall()
            
            for row in rows:
                openlp_id = row['id']
                comments = row['comments']
                
                # Try to parse JSON from comments
                try:
                    metadata = json.loads(comments)
                    backend_id = metadata.get('backendId')
                    if backend_id:
                        mapping[backend_id] = openlp_id
                except (json.JSONDecodeError, TypeError):
                    # Comments might not be JSON, skip
                    pass
        
        except sqlite3.Error as e:
            log.warning(f"Error reading existing songs: {e}")
        
        return mapping
    
    def _insert_song(self, cursor: sqlite3.Cursor, song: Dict[str, Any]):
        """Insert a new song into OpenLP database"""
        title = song.get('title', '')
        number = song.get('number')
        copyright = song.get('copyright')
        ccli_number = song.get('ccliNumber') or number
        lyrics = self._format_lyrics(song)
        search_title = title.lower().strip()
        search_lyrics = lyrics.lower() if lyrics else ''
        
        # Store backend ID in comments as JSON
        comments = json.dumps({
            'backendId': song.get('id'),
            'lastSynced': datetime.now().isoformat()
        })
        
        cursor.execute("""
            INSERT INTO songs (
                title, alternate_title, lyrics, copyright, comments,
                ccli_number, search_title, search_lyrics, last_modified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, (
            title,
            number,
            lyrics,
            copyright,
            comments,
            ccli_number,
            search_title,
            search_lyrics
        ))
    
    def _update_song(self, cursor: sqlite3.Cursor, openlp_id: int, song: Dict[str, Any]):
        """Update an existing song in OpenLP database"""
        title = song.get('title', '')
        number = song.get('number')
        copyright = song.get('copyright')
        ccli_number = song.get('ccliNumber') or number
        lyrics = self._format_lyrics(song)
        search_title = title.lower().strip()
        search_lyrics = lyrics.lower() if lyrics else ''
        
        # Update comments with backend ID
        comments = json.dumps({
            'backendId': song.get('id'),
            'lastSynced': datetime.now().isoformat()
        })
        
        cursor.execute("""
            UPDATE songs
            SET title = ?, alternate_title = ?, lyrics = ?, copyright = ?,
                comments = ?, ccli_number = ?, search_title = ?, search_lyrics = ?,
                last_modified = datetime('now')
            WHERE id = ?
        """, (
            title,
            number,
            lyrics,
            copyright,
            comments,
            ccli_number,
            search_title,
            search_lyrics,
            openlp_id
        ))
    
    def _format_lyrics(self, song: Dict[str, Any]) -> str:
        """
        Format song lyrics for OpenLP XML format
        
        Args:
            song: Song dictionary from API
            
        Returns:
            XML formatted lyrics string
        """
        parts = []
        
        # Add chorus if present
        chorus = song.get('chorus')
        if chorus:
            parts.append(f'<verse label="c">{self._escape_xml(chorus)}</verse>')
        
        # Format verses
        verses = song.get('verses', '')
        if verses:
            # Verses can be a string (from MongoDB) or already formatted
            # Try to parse if it's XML, otherwise treat as plain text
            if isinstance(verses, str):
                if verses.strip().startswith('<verse'):
                    # Already XML formatted
                    parts.append(verses)
                else:
                    # Plain text - split by double newlines and format
                    verse_blocks = verses.split('\n\n')
                    for idx, block in enumerate(verse_blocks):
                        if block.strip():
                            parts.append(f'<verse label="v{idx + 1}">{self._escape_xml(block.strip())}</verse>')
            elif isinstance(verses, list):
                # List of verse objects
                for verse in verses:
                    label = verse.get('label', f"v{verse.get('order', 1)}")
                    content = verse.get('content', '')
                    if content:
                        parts.append(f'<verse label="{label}">{self._escape_xml(content)}</verse>')
        
        return ''.join(parts)
    
    def _escape_xml(self, text: str) -> str:
        """Escape XML special characters"""
        if not text:
            return ''
        
        return (text
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&apos;'))


