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
const VirtualizedRow = memo(({ index, style, data }: {
    index: number;
    style: React.CSSProperties;
    data: {
        songs: SongListCacheItem[];
        onSongClick?: (songId: string) => void;
        currentSongId?: string;
    };
}) => {
    const song = data.songs[index];
    if (!song) return null;

    const displayTitle = song.number
        ? `${song.title} (${song.number})`
        : song.title;

    const isSelected = song.id === data.currentSongId;

    const handleClick = useCallback(() => {
        if (data.onSongClick) {
            data.onSongClick(song.id);
        }
    }, [song.id, data]);

    return (
        <div style={style}>
            <ListItem
                disablePadding
                sx={{
                    '&:hover': {
                        backgroundColor: 'action.hover',
                    },
                }}
            >
                <ListItemButton
                    onClick={handleClick}
                    selected={isSelected}
                    sx={{
                        '&.Mui-selected': {
                            fontWeight: 600,
                            '& .MuiListItemText-primary': {
                                fontWeight: 600,
                            },
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
});

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
    const listRef = useRef<FixedSizeList>(null);

    // Calculate list height based on viewport if calculateHeight function is provided
    useEffect(() => {
        if (calculateHeight && !height) {
            const updateHeight = () => {
                const calculatedHeight = calculateHeight(window.innerHeight);
                setListHeight(Math.max(450, calculatedHeight));
            };

            updateHeight();
            window.addEventListener('resize', updateHeight);
            return () => window.removeEventListener('resize', updateHeight);
        } else if (height) {
            setListHeight(height);
        }
    }, [height, calculateHeight]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (onSearchChange) {
            onSearchChange(e.target.value);
        }
    }, [onSearchChange]);

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

    const listData = useMemo(() => ({
        songs,
        onSongClick,
        currentSongId,
    }), [songs, onSongClick, currentSongId]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {showSearch && (
                <Box sx={{ mb: { xs: 1.5, sm: 2 }, flexShrink: 0 }}>
                    <TextField
                        fullWidth
                        placeholder="Szukaj pieśni..."
                        value={searchValue}
                        onChange={handleSearchChange}
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

