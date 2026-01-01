import { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { FixedSizeList } from 'react-window';
import {
  Box,
  TextField,
  InputAdornment,
  Alert,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
  Stack,
} from '@mui/material';
import {
  MusicNote as MusicNoteIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Clear as ClearIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type { SongListCacheItem } from '@openlp/shared';
import SongSearchModal from './SongSearchModal';

export interface SongListProps {
  songs: SongListCacheItem[];
  onSongClick?: (songId: string) => void;
  currentSongId?: string;
  height?: number;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  itemSize?: number;
  sortOrder?: 'asc' | 'desc';
  onSortOrderChange?: (order: 'asc' | 'desc') => void;
  showSortButton?: boolean; // Show sort button in the list (for mobile)
  filterContent?: React.ReactNode; // Content to render below search box (e.g., filter chips)
  hasActiveFilter?: boolean; // Show clear button when filter is active
  onAddSong?: () => void; // Callback for "Add Song" action
  showAddSong?: boolean; // Show "Add Song" element at the bottom
}

// Virtualized list row component
const VirtualizedRow = memo(
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
      selectedIndex: number;
      onSelectIndex: (index: number) => void;
      onFocusInput: () => void;
    };
  }) => {
    const song = data.songs[index];
    const isFocused = data.selectedIndex === index;
    const buttonRef = useRef<HTMLDivElement>(null);

    // Focus button when this item is selected
    useEffect(() => {
      if (isFocused && buttonRef.current && song) {
        const focusableElement = buttonRef.current.querySelector('button') || buttonRef.current;
        if (focusableElement && typeof (focusableElement as HTMLElement).focus === 'function') {
          (focusableElement as HTMLElement).focus();
        }
      }
    }, [isFocused, song]);

    const handleClick = useCallback(() => {
      if (!song) return;
      data.onSelectIndex(index);
      if (data.onSongClick) {
        data.onSongClick(song.id);
      }
    }, [song, data, index]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleClick();
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
            data.onFocusInput();
          }
        }
      },
      [handleClick, index, data]
    );

    if (!song) return null;

    const displayTitle = song.number ? `${song.title} (${song.number})` : song.title;
    const isSelected = song.id === data.currentSongId;

    return (
      <div style={style} data-song-index={index}>
        <ListItem
          disablePadding
          sx={{
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <ListItemButton
            ref={buttonRef}
            onClick={handleClick}
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
            <ListItemText
              primary={displayTitle}
              primaryTypographyProps={{
                variant: 'body1',
                sx: {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.95rem',
                },
              }}
            />
          </ListItemButton>
        </ListItem>
      </div>
    );
  }
);

VirtualizedRow.displayName = 'VirtualizedRow';

type SortOrder = 'asc' | 'desc';

export default function SongList({
  songs,
  onSongClick,
  currentSongId,
  height,
  showSearch = false,
  searchValue = '',
  onSearchChange,
  isLoading = false,
  emptyMessage = 'Nie znaleziono pieśni.',
  itemSize = 48,
  sortOrder: externalSortOrder,
  onSortOrderChange: _onSortOrderChange, // Used when sort button is in parent component
  showSortButton = false, // Show sort button in the list (for mobile)
  filterContent,
  hasActiveFilter = false,
  onAddSong,
  showAddSong = false,
}: SongListProps) {
  const [listHeight, setListHeight] = useState(height || 600);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1); // -1 means input is focused
  const [_internalSortOrder, _setInternalSortOrder] = useState<SortOrder>('asc'); // Used when sortOrder is not provided externally
  const sortOrder = externalSortOrder ?? _internalSortOrder;
  const listRef = useRef<FixedSizeList>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef<number>(height || 600);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Measure container height using ResizeObserver - container has flex:1 so it fills available space
  useEffect(() => {
    if (height) {
      setListHeight(height);
      return;
    }

    const updateHeight = () => {
      if (listContainerRef.current) {
        const containerHeight = listContainerRef.current.clientHeight;
        if (containerHeight > 50 && Math.abs(containerHeight - lastHeightRef.current) > 2) {
          lastHeightRef.current = containerHeight;
          setListHeight(containerHeight);
        }
      }
    };

    // Initial measurement after DOM is ready
    requestAnimationFrame(updateHeight);

    // Watch for container size changes
    const resizeObserver = new ResizeObserver(updateHeight);
    if (listContainerRef.current) {
      resizeObserver.observe(listContainerRef.current);
    }

    // Also listen to visualViewport for mobile Chrome UI changes
    window.visualViewport?.addEventListener('resize', updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.visualViewport?.removeEventListener('resize', updateHeight);
    };
  }, [height]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onSearchChange) {
        onSearchChange(e.target.value);
      }
      setSelectedIndex(-1); // Reset selection when search changes
    },
    [onSearchChange]
  );

  const handleFocusInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  // Sort songs by title - but preserve search result order when searching
  const sortedSongs = useMemo(() => {
    // If there's an active search, preserve the search result order (already sorted by relevance)
    if (searchValue && searchValue.trim()) {
      return songs;
    }
    // Otherwise, sort alphabetically
    const sorted = [...songs].sort((a, b) => {
      const titleA = a.title.toLowerCase();
      const titleB = b.title.toLowerCase();
      if (sortOrder === 'asc') {
        return titleA.localeCompare(titleB, 'pl', { sensitivity: 'base' });
      } else {
        return titleB.localeCompare(titleA, 'pl', { sensitivity: 'base' });
      }
    });
    return sorted;
  }, [songs, sortOrder, searchValue]);

  // Scroll to currentSongId when it changes (for highlighting selected song when coming back)
  useEffect(() => {
    if (currentSongId && listRef.current && sortedSongs.length > 0) {
      const songIndex = sortedSongs.findIndex(song => song.id === currentSongId);
      if (songIndex !== -1) {
        // Scroll to the song with a small delay to ensure the list is rendered
        setTimeout(() => {
          listRef.current?.scrollToItem(songIndex, 'center');
        }, 100);
      }
    }
  }, [currentSongId, sortedSongs]);

  // Reset selection when sort order changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [sortOrder]);

  // Scroll to selected item when it changes
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < sortedSongs.length) {
      listRef.current?.scrollToItem(selectedIndex, 'smart');
    }
  }, [selectedIndex, sortedSongs.length]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (sortedSongs.length > 0) {
          setSelectedIndex(0);
        }
      } else if (e.key === 'Enter' && sortedSongs.length > 0) {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < sortedSongs.length) {
          // Activate selected item
          if (onSongClick) {
            onSongClick(sortedSongs[selectedIndex].id);
          }
        } else if (onSongClick) {
          // Activate first item if nothing selected
          onSongClick(sortedSongs[0].id);
        }
      }
    },
    [sortedSongs, selectedIndex, onSongClick]
  );

  // Handle Ctrl+F / Cmd+F to open search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleModalClose = useCallback(() => {
    setSearchModalOpen(false);
  }, []);

  const listData = useMemo(
    () => ({
      songs: sortedSongs,
      onSongClick,
      currentSongId,
      selectedIndex,
      onSelectIndex: setSelectedIndex,
      onFocusInput: handleFocusInput,
    }),
    [sortedSongs, onSongClick, currentSongId, selectedIndex, handleFocusInput]
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {showSearch && (
        <Box sx={{ mb: { xs: 1, sm: 2 }, flexShrink: 0 }}>
          <TextField
            inputRef={searchInputRef}
            fullWidth
            placeholder="Szukaj pieśni..."
            value={searchValue}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => setSelectedIndex(-1)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MusicNoteIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment:
                searchValue || hasActiveFilter ? (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Wyczyść wyszukiwanie"
                      onClick={() => {
                        if (onSearchChange) {
                          onSearchChange('');
                        }
                        searchInputRef.current?.focus();
                      }}
                      edge="end"
                      size="small"
                      sx={{
                        p: 0.5,
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'text.primary',
                        },
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '16px', // Minimum 16px to prevent iOS zoom
                py: { xs: 0.75, sm: 1 },
              },
            }}
          />
          {/* Filter content (e.g., songbook filter chips) */}
          {filterContent && (
            <Box
              sx={{
                mt: 1.5,
                display: 'flex',
                flexWrap: 'wrap',
                gap: { xs: 1, sm: 0.75 },
                overflow: 'visible',
              }}
            >
              {filterContent}
            </Box>
          )}
          {/* Results count */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mt: 0.5,
              display: 'block',
              textAlign: 'right',
              opacity: 0.5,
              fontSize: '10px',
              userSelect: 'none',
            }}
          >
            {isLoading
              ? ''
              : `${sortedSongs.length} ${sortedSongs.length === 1 ? 'pieśń' : 'pieśni'}`}
          </Typography>
          {showSortButton && (
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <Tooltip title={sortOrder === 'asc' ? 'Sortuj A→Z' : 'Sortuj Z→A'}>
                <IconButton
                  onClick={() => {
                    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                    if (_onSortOrderChange) {
                      _onSortOrderChange(newOrder);
                    } else {
                      _setInternalSortOrder(newOrder);
                    }
                    setSelectedIndex(-1);
                  }}
                  size="small"
                  sx={{
                    opacity: 0.7,
                    transition: 'opacity 0.2s ease',
                    '&:hover': {
                      opacity: 1,
                    },
                  }}
                  aria-label={sortOrder === 'asc' ? 'Sortuj rosnąco' : 'Sortuj malejąco'}
                >
                  {sortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && sortedSongs.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {emptyMessage}
        </Alert>
      )}

      {!isLoading && sortedSongs.length > 0 && (
        <Box
          ref={listContainerRef}
          data-list-container
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            // Custom scrollbar styles
            '& .react-window-scrollbar': {
              width: '8px !important',
              '& > div': {
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
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
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
          <FixedSizeList
            ref={listRef}
            height={Math.min(listHeight, sortedSongs.length * itemSize)}
            itemCount={sortedSongs.length}
            itemSize={itemSize}
            width="100%"
            itemData={listData}
          >
            {VirtualizedRow}
          </FixedSizeList>
        </Box>
      )}

      {/* Add Song element at the bottom */}
      {showAddSong && onAddSong && (
        <Box
          sx={{
            mt: 0.5,
            pt: 0.75,
            borderTop: theme =>
              theme.palette.mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.1)',
            flexShrink: 0,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            onClick={onAddSong}
            sx={{
              cursor: 'pointer',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <AddIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              Dodaj Pieśń
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Search Modal */}
      <SongSearchModal
        open={searchModalOpen}
        onClose={handleModalClose}
        songs={sortedSongs}
        onSongClick={onSongClick}
        currentSongId={currentSongId}
      />
    </Box>
  );
}
