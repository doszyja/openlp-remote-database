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
} from '@mui/material';
import { MusicNote as MusicNoteIcon } from '@mui/icons-material';
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
  calculateHeight?: (viewportHeight: number) => number;
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
  calculateHeight,
}: SongListProps) {
  const [listHeight, setListHeight] = useState(height || 600);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1); // -1 means input is focused
  const listRef = useRef<FixedSizeList>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef<number>(height || 600);

  // Calculate list height based on container or viewport if calculateHeight function is provided
  useEffect(() => {
    if (calculateHeight && !height) {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const updateHeight = () => {
        if (!containerRef.current) return;

        const viewportHeight = window.innerHeight;
        const searchInputHeight = showSearch ? 60 : 0;

        // Always use viewport height as the base for minimum height calculation
        // This ensures the list always fills at least the viewport height
        // Use viewport height minus typical header/navbar height (64px) and search input if shown
        const minViewportHeight = viewportHeight - 64 - searchInputHeight;

        const containerRect = containerRef.current.getBoundingClientRect();
        let newHeight: number;

        if (containerRect.height > 0) {
          // Use container height directly, minus search input height if search is shown
          const availableHeight = containerRect.height - searchInputHeight;

          // If calculateHeight is provided, use it to adjust the height (e.g., subtract padding)
          // Otherwise, use available height directly
          const calculatedHeight = calculateHeight(availableHeight);

          // Always use the maximum of calculated height and minimum viewport height
          // This ensures the list always has at least the viewport height, even if content is smaller
          newHeight = Math.max(calculatedHeight, minViewportHeight);
        } else {
          // Fallback to viewport-based calculation if container height not available yet
          const calculatedHeight = calculateHeight(viewportHeight);
          newHeight = Math.max(calculatedHeight, minViewportHeight);
        }

        // Never decrease height - always use the maximum of new height, minimum viewport height, and current height
        // This ensures the list never shrinks below its current size or minimum viewport height
        const currentHeight = lastHeightRef.current;
        const finalHeight = Math.max(newHeight, minViewportHeight, currentHeight);

        // Only update if there's a significant change (more than 10px) to prevent jitter
        if (Math.abs(finalHeight - currentHeight) > 10) {
          lastHeightRef.current = finalHeight;
          setListHeight(finalHeight);
        }
      };

      // Debounced update function to prevent too frequent recalculations
      const debouncedUpdateHeight = () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(updateHeight, 100);
      };

      // Initial calculation
      const timeoutId = setTimeout(updateHeight, 0);

      // Use ResizeObserver to watch container size changes
      // Use debounced version to prevent excessive updates
      let resizeObserver: ResizeObserver | null = null;
      if (containerRef.current && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(debouncedUpdateHeight);
        resizeObserver.observe(containerRef.current);
      }

      window.addEventListener('resize', debouncedUpdateHeight);
      return () => {
        clearTimeout(timeoutId);
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        window.removeEventListener('resize', debouncedUpdateHeight);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    } else if (height) {
      setListHeight(height);
      lastHeightRef.current = height;
    }
  }, [height, calculateHeight, showSearch]);

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

  // Scroll to selected item when it changes
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < songs.length) {
      listRef.current?.scrollToItem(selectedIndex, 'smart');
    }
  }, [selectedIndex, songs.length]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (songs.length > 0) {
          setSelectedIndex(0);
        }
      } else if (e.key === 'Enter' && songs.length > 0) {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < songs.length) {
          // Activate selected item
          if (onSongClick) {
            onSongClick(songs[selectedIndex].id);
          }
        } else if (onSongClick) {
          // Activate first item if nothing selected
          onSongClick(songs[0].id);
        }
      }
    },
    [songs, selectedIndex, onSongClick]
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
      songs,
      onSongClick,
      currentSongId,
      selectedIndex,
      onSelectIndex: setSelectedIndex,
      onFocusInput: handleFocusInput,
    }),
    [songs, onSongClick, currentSongId, selectedIndex, handleFocusInput]
  );

  return (
    <Box
      ref={containerRef}
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
    >
      {showSearch && (
        <Box sx={{ mb: { xs: 1.5, sm: 2 }, flexShrink: 0 }}>
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
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '16px', // Minimum 16px to prevent iOS zoom
                py: { xs: 0.75, sm: 1 },
              },
            }}
          />
        </Box>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && songs.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {emptyMessage}
        </Alert>
      )}

      {!isLoading && songs.length > 0 && (
        <Box
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
            height={listHeight}
            itemCount={songs.length}
            itemSize={itemSize}
            width="100%"
            itemData={listData}
          >
            {VirtualizedRow}
          </FixedSizeList>
        </Box>
      )}

      {/* Search Modal */}
      <SongSearchModal
        open={searchModalOpen}
        onClose={handleModalClose}
        songs={songs}
        onSongClick={onSongClick}
        currentSongId={currentSongId}
      />
    </Box>
  );
}
