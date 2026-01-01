import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { FixedSizeList } from 'react-window';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Alert,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Chip,
} from '@mui/material';
import { Close as CloseIcon, Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import type { SongListCacheItem, SongbookSlug } from '@openlp/shared';

// Songbook filter options
const SONGBOOK_OPTIONS: { slug: SongbookSlug; label: string; color: string }[] = [
  { slug: 'pielgrzym', label: 'Pielgrzym', color: '#1976d2' },
  { slug: 'zielony', label: 'Zielony', color: '#388e3c' },
  { slug: 'wedrowiec', label: 'Wędrowiec', color: '#f57c00' },
  { slug: 'zborowe', label: 'Zborowe', color: '#7b1fa2' },
];

export interface SongSearchModalProps {
  open: boolean;
  onClose: () => void;
  songs: SongListCacheItem[];
  onSongClick?: (songId: string) => void;
  currentSongId?: string;
}

// Virtualized list row component for search modal
const SearchModalRow = memo(
  ({
    index,
    style,
    data,
  }: {
    index: number;
    style: React.CSSProperties;
    data: {
      songs: SongListCacheItem[];
      onSongClick?: (songId: string) => void;
      currentSongId?: string;
      onClose: () => void;
      selectedIndex: number;
      onSelectIndex: (index: number) => void;
    };
  }) => {
    const song = data.songs[index];
    const isFocused = data.selectedIndex === index;
    const buttonRef = useRef<HTMLDivElement>(null);

    // When currentSongId is undefined we are typically in the service-plans context.
    // There we want double‑click (or explicit "+" icon) to add the song,
    // instead of single‑click immediately zamykający modal.
    const isServicePlansContext = data.currentSongId === undefined;

    // Focus button when this item is selected
    useEffect(() => {
      if (isFocused && buttonRef.current && song) {
        // Find the focusable element inside (button or div)
        const focusableElement = buttonRef.current.querySelector('button') || buttonRef.current;
        if (focusableElement && typeof (focusableElement as HTMLElement).focus === 'function') {
          (focusableElement as HTMLElement).focus();
        }
      }
    }, [isFocused, song]);

    const handleActivate = useCallback(() => {
      if (!song) return;
      if (data.onSongClick) {
        data.onSongClick(song.id);
        data.onClose();
      }
    }, [song, data]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleActivate();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (index < data.songs.length - 1) {
            data.onSelectIndex(index + 1);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (index > 0) {
            data.onSelectIndex(index - 1);
          } else {
            // Move back to input
            data.onSelectIndex(-1);
          }
        }
      },
      [handleActivate, index, data]
    );

    if (!song) return null;

    const displayTitle = song.number ? `${song.title} (${song.number})` : song.title;
    const isSelected = song.id === data.currentSongId;

    return (
      <div style={style} data-song-index={index}>
        <ListItem disablePadding>
          <ListItemButton
            ref={buttonRef}
            onClick={() => {
              data.onSelectIndex(index);
              if (!isServicePlansContext) {
                handleActivate();
              }
            }}
            onDoubleClick={isServicePlansContext ? handleActivate : undefined}
            onKeyDown={handleKeyDown}
            onFocus={() => data.onSelectIndex(index)}
            selected={isSelected}
            tabIndex={isFocused ? 0 : -1}
            sx={{
              '&.Mui-selected': {
                fontWeight: 600,
                '& .MuiListItemText-primary': {
                  fontWeight: 600,
                },
              },
              '&:focus': {
                backgroundColor: theme =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                gap: 1,
              }}
            >
              <ListItemText
                primary={displayTitle}
                primaryTypographyProps={{
                  variant: 'body1',
                  sx: {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    minWidth: 0,
                  },
                }}
              />
              {/* Songbook chip */}
              {song.songbook && (
                <Chip
                  label={
                    SONGBOOK_OPTIONS.find(opt => opt.slug === song.songbook)?.label || song.songbook
                  }
                  size="small"
                  sx={{
                    fontSize: '0.65rem',
                    height: 20,
                    minWidth: 'auto',
                    px: 0.5,
                    '& .MuiChip-label': {
                      px: 0.75,
                      fontSize: '0.65rem',
                      textTransform: 'lowercase',
                    },
                    backgroundColor:
                      SONGBOOK_OPTIONS.find(opt => opt.slug === song.songbook)?.color || 'default',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                />
              )}
              {/* Explicit "+" icon – single click also dodaje pieśń */}
              <IconButton
                edge="end"
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  handleActivate();
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>
          </ListItemButton>
        </ListItem>
      </div>
    );
  }
);

SearchModalRow.displayName = 'SearchModalRow';

export default function SongSearchModal({
  open,
  onClose,
  songs,
  onSongClick,
  currentSongId,
}: SongSearchModalProps) {
  const [searchValue, setSearchValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1); // -1 means input is focused
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<FixedSizeList>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (open) {
      // Use requestAnimationFrame to ensure DOM is ready, then focus
      const timeoutId = setTimeout(() => {
        searchInputRef.current?.focus();
        setSelectedIndex(-1); // Reset to input focus
        // If focus didn't work, try again after a short delay
        if (document.activeElement !== searchInputRef.current) {
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 50);
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    } else if (!open) {
      setSearchValue('');
      setSelectedIndex(-1);
    }
  }, [open]);

  // Filter songs based on search (memoized to prevent unnecessary recalculations)
  // Search in title, number, and lyrics (searchLyrics field)
  const filteredSongs = useMemo(() => {
    if (!searchValue.trim()) {
      return [];
    }
    const searchLower = searchValue.toLowerCase();
    return songs.filter(song => {
      // Search in title (use searchTitle if available for faster matching)
      const title = song.searchTitle || song.title?.toLowerCase() || '';
      const matchesTitle =
        title.includes(searchLower) || song.title?.toLowerCase().includes(searchLower);

      // Search in number
      const number = song.number?.toLowerCase() || '';
      const matchesNumber = number.includes(searchLower);

      // Search in lyrics (use searchLyrics if available for faster matching)
      const lyrics = song.searchLyrics || '';
      const matchesLyrics = lyrics && lyrics.includes(searchLower);

      return matchesTitle || matchesNumber || matchesLyrics;
    });
  }, [songs, searchValue]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    setSelectedIndex(-1); // Reset selection when search changes
  }, []);

  const handleFirstItemClick = useCallback(() => {
    if (filteredSongs.length > 0 && onSongClick) {
      onSongClick(filteredSongs[0].id);
      onClose();
    }
  }, [filteredSongs, onSongClick, onClose]);

  // Scroll to selected item when it changes
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < filteredSongs.length) {
      listRef.current?.scrollToItem(selectedIndex, 'smart');
    }
  }, [selectedIndex, filteredSongs.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedIndex < filteredSongs.length - 1) {
          setSelectedIndex(prev => prev + 1);
        } else if (selectedIndex === -1 && filteredSongs.length > 0) {
          // Move from input to first item
          setSelectedIndex(0);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedIndex > 0) {
          setSelectedIndex(prev => prev - 1);
        } else if (selectedIndex === 0) {
          // Move from first item back to input
          setSelectedIndex(-1);
          searchInputRef.current?.focus();
        }
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < filteredSongs.length) {
          e.preventDefault();
          // Activate selected item
          if (onSongClick) {
            onSongClick(filteredSongs[selectedIndex].id);
            onClose();
          }
        } else if (filteredSongs.length > 0) {
          e.preventDefault();
          handleFirstItemClick();
        }
      }
    },
    [onClose, filteredSongs, selectedIndex, onSongClick, handleFirstItemClick]
  );

  // Memoize list data for virtualized list
  const listData = useMemo(
    () => ({
      songs: filteredSongs,
      onSongClick,
      currentSongId,
      onClose,
      selectedIndex,
      onSelectIndex: setSelectedIndex,
    }),
    [filteredSongs, onSongClick, currentSongId, onClose, selectedIndex]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{
        onEntered: () => {
          // Focus input after dialog animation completes
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 0);
        },
      }}
      PaperProps={{
        sx: {
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Szukaj Pieśni</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <TextField
          inputRef={searchInputRef}
          fullWidth
          placeholder="Szukaj pieśni..."
          value={searchValue}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setSelectedIndex(-1)}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiInputBase-input': {
              fontSize: '16px',
            },
          }}
        />
        {filteredSongs.length > 0 ? (
          <Box
            sx={{
              maxHeight: '50vh',
              overflow: 'hidden',
              // Custom scrollbar styles
              '& .react-window-scrollbar': {
                width: '8px !important',
                '& > div': {
                  backgroundColor: theme =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.2)'
                      : 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: theme =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.3)'
                        : 'rgba(0, 0, 0, 0.3)',
                  },
                },
              },
              // Webkit scrollbar (Chrome, Safari, Edge)
              '& *::-webkit-scrollbar': {
                width: '8px',
              },
              '& *::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '& *::-webkit-scrollbar-thumb': {
                backgroundColor: theme =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: theme =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.3)'
                      : 'rgba(0, 0, 0, 0.3)',
                },
              },
              // Firefox scrollbar
              '& *': {
                scrollbarWidth: 'thin',
                scrollbarColor: theme =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.2) transparent'
                    : 'rgba(0, 0, 0, 0.2) transparent',
              },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                border: theme =>
                  theme.palette.mode === 'dark'
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(0, 0, 0, 0.1)',
                height: Math.min(400, filteredSongs.length * 48),
                maxHeight: '50vh',
              }}
            >
              <FixedSizeList
                ref={listRef}
                height={Math.min(400, filteredSongs.length * 48)}
                itemCount={filteredSongs.length}
                itemSize={48}
                width="100%"
                itemData={listData}
              >
                {SearchModalRow}
              </FixedSizeList>
            </Paper>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Znaleziono {filteredSongs.length} {filteredSongs.length === 1 ? 'pieśń' : 'pieśni'}.
              Naciśnij Enter, aby otworzyć pierwszą pieśń.
            </Typography>
          </Box>
        ) : searchValue.trim() ? (
          <Alert severity="info">Nie znaleziono pieśni.</Alert>
        ) : (
          <Alert severity="info">Wpisz tekst, aby wyszukać pieśni.</Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
