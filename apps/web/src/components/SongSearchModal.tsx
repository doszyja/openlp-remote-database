import { useState, useEffect, useCallback, useRef } from 'react';
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
} from '@mui/material';
import { Close as CloseIcon, Search as SearchIcon } from '@mui/icons-material';
import type { SongListCacheItem } from '@openlp/shared';

export interface SongSearchModalProps {
    open: boolean;
    onClose: () => void;
    songs: SongListCacheItem[];
    onSongClick?: (songId: string) => void;
    currentSongId?: string;
}

export default function SongSearchModal({
    open,
    onClose,
    songs,
    onSongClick,
    currentSongId,
}: SongSearchModalProps) {
    const [searchValue, setSearchValue] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Focus search input when modal opens
    useEffect(() => {
        if (open && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        } else if (!open) {
            setSearchValue('');
        }
    }, [open]);

    // Filter songs based on search
    const filteredSongs = songs.filter(song => {
        if (!searchValue.trim()) {
            return false;
        }
        const searchLower = searchValue.toLowerCase();
        const title = song.title?.toLowerCase() || '';
        const number = song.number?.toLowerCase() || '';
        return title.includes(searchLower) || number.includes(searchLower);
    });

    // Don't auto-focus first item - let user navigate manually

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
    }, []);

    const handleFirstItemClick = useCallback(() => {
        if (filteredSongs.length > 0 && onSongClick) {
            onSongClick(filteredSongs[0].id);
            onClose();
        }
    }, [filteredSongs, onSongClick, onClose]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter' && filteredSongs.length > 0) {
            e.preventDefault();
            handleFirstItemClick();
        }
    }, [onClose, filteredSongs.length, handleFirstItemClick]);

    const handleItemKeyDown = useCallback((songId: string) => (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (onSongClick) {
                onSongClick(songId);
                onClose();
            }
        }
    }, [onSongClick, onClose]);

    const handleItemClick = useCallback((songId: string) => {
        if (onSongClick) {
            onSongClick(songId);
            onClose();
        }
    }, [onSongClick, onClose]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
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
                            overflowY: 'auto',
                        }}
                    >
                        <Paper
                            elevation={0}
                            sx={{
                                border: (theme: any) =>
                                    theme.palette.mode === 'dark'
                                        ? '1px solid rgba(255, 255, 255, 0.1)'
                                        : '1px solid rgba(0, 0, 0, 0.1)',
                            }}
                        >
                                {filteredSongs.map((song: SongListCacheItem) => {
                                    const displayTitle = song.number
                                        ? `${song.title} (${song.number})`
                                        : song.title;
                                    const isSelected = song.id === currentSongId;

                                    return (
                                        <ListItem
                                            key={song.id}
                                            disablePadding
                                            tabIndex={0}
                                            onKeyDown={handleItemKeyDown(song.id)}
                                        >
                                        <ListItemButton
                                            onClick={() => handleItemClick(song.id)}
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
                                                    },
                                                }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </Paper>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 1, display: 'block' }}
                        >
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

