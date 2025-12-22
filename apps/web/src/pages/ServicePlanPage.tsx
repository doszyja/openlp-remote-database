import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import {
  useServicePlan,
  useServicePlans,
  useCreateServicePlan,
  useAddSongToPlan,
  useRemoveSongFromPlan,
  useSetActiveSong,
  useSetActiveVerse,
  useDeleteServicePlan,
  useUpdateServicePlan,
} from '../hooks/useServicePlans';
import { useCachedSongs, useCachedSongSearch } from '../hooks/useCachedSongs';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import SongSearchModal from '../components/SongSearchModal';
import SongList from '../components/SongList';
import { parseVerses, getVerseDisplayLabel } from '../utils/verseParser';
import { useActiveSongWs } from '../hooks/useActiveSongWs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable List Item Component
interface SortableListItemProps {
  item: {
    id: string;
    songTitle: string;
    notes?: string;
    isActive: boolean;
  };
  isMobile: boolean;
  hasEditPermission: boolean;
  onSetActive: (itemId: string, isActive: boolean) => void;
  onRemove: (itemId: string) => void;
}

function SortableListItem({
  item,
  isMobile,
  hasEditPermission,
  onSetActive,
  onRemove,
}: SortableListItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !hasEditPermission,
  });

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const SWIPE_THRESHOLD = 100; // Minimum distance for swipe
  const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity for swipe (px/ms)
  const SWIPE_DIRECTION_THRESHOLD = 1.5; // Ratio of horizontal to vertical movement to consider it a swipe

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!hasEditPermission || isDragging) return;
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      setIsSwiping(false);
    },
    [hasEditPermission, isDragging]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!hasEditPermission || isDragging || !touchStartRef.current) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      const absDeltaX = Math.abs(deltaX);

      // Determine if this is a horizontal swipe (more horizontal than vertical)
      const isHorizontalSwipe = absDeltaX > deltaY * SWIPE_DIRECTION_THRESHOLD;

      if (isHorizontalSwipe && deltaX > 0) {
        // Swipe right - show visual feedback
        setIsSwiping(true);
        setSwipeOffset(Math.min(deltaX, 200)); // Cap at 200px
        // Prevent drag & drop during swipe
        e.preventDefault();
      } else if (deltaX < 0 || !isHorizontalSwipe) {
        // Swipe left or vertical movement - reset
        setSwipeOffset(0);
        if (absDeltaX < 10) {
          setIsSwiping(false);
        }
      }
    },
    [hasEditPermission, isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    if (!hasEditPermission || isDragging || !touchStartRef.current) {
      touchStartRef.current = null;
      setSwipeOffset(0);
      setIsSwiping(false);
      return;
    }

    const touchEnd = touchStartRef.current;
    const duration = Date.now() - touchEnd.time;
    const deltaX = swipeOffset;
    const velocity = deltaX / duration;

    // Check if swipe meets threshold (distance or velocity)
    if (deltaX >= SWIPE_THRESHOLD || (deltaX > 50 && velocity > SWIPE_VELOCITY_THRESHOLD)) {
      // Swipe right detected - remove song
      onRemove(item.id);
    }

    touchStartRef.current = null;
    setSwipeOffset(0);
    setIsSwiping(false);
  }, [hasEditPermission, isDragging, swipeOffset, onRemove, item.id]);

  // Restrict transform to vertical (Y-axis) only
  const restrictedTransform = transform
    ? {
        ...transform,
        x: 0, // Block horizontal movement
      }
    : null;

  const style = {
    transform: restrictedTransform ? CSS.Transform.toString(restrictedTransform) : undefined,
    transition: isDragging ? transition : undefined,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  const swipeStyle = {
    transform: `translateX(${swipeOffset}px)`,
    transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none',
  };

  // Disable drag listeners when swiping
  const dragListeners = hasEditPermission && !isSwiping ? listeners : {};
  const dragAttributes = hasEditPermission && !isSwiping ? attributes : {};

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      {...dragAttributes}
      {...dragListeners}
      disablePadding
      dense={!isMobile}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        if (hasEditPermission && !isDragging && swipeOffset === 0 && !isSwiping) {
          onSetActive(item.id, !item.isActive);
        }
      }}
      sx={{
        mb: { xs: 0.5, sm: 0.25 },
        py: { xs: 1.5, sm: 1 },
        px: { xs: 1.5, sm: 1 },
        minHeight: { xs: 56, sm: 'auto' },
        border: theme => (item.isActive ? 'none' : `1px solid ${theme.palette.divider}`),
        borderRadius: 0.5,
        bgcolor: item.isActive ? 'action.selected' : 'background.paper',
        cursor: hasEditPermission ? (isSwiping ? 'default' : 'grab') : 'default',
        transition: 'all 0.15s',
        touchAction: hasEditPermission ? 'none' : 'pan-y', // Disable default touch actions for drag, but allow scroll when no edit permission
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        overflow: 'hidden',
        '&:hover': hasEditPermission
          ? {
              bgcolor: item.isActive ? 'action.selected' : 'action.hover',
            }
          : {},
        '&:active':
          hasEditPermission && !isSwiping
            ? {
                cursor: 'grabbing',
                bgcolor: item.isActive ? 'action.selected' : undefined,
              }
            : {},
      }}
    >
      {/* Swipe delete indicator */}
      {swipeOffset > 0 && hasEditPermission && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '100%',
            bgcolor: 'error.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            pr: 2,
            zIndex: 0,
            transform: `translateX(${Math.max(0, swipeOffset - 100)}px)`,
          }}
        >
          <DeleteIcon sx={{ color: 'error.contrastText' }} />
        </Box>
      )}
      <Box
        style={swipeStyle}
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          bgcolor: swipeOffset > 50 ? 'error.light' : 'transparent',
          transition: 'background-color 0.2s',
        }}
      >
        <ListItemText
          primary={
            <Box display="flex" alignItems="center" gap={0.5} sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="body2"
                fontWeight={item.isActive ? 600 : 400}
                sx={{
                  fontSize: '0.8rem',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {item.songTitle}
              </Typography>
            </Box>
          }
          secondary={
            item.notes ? (
              <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                {item.notes}
              </Typography>
            ) : null
          }
          sx={{ my: 0, flex: 1, minWidth: 0, overflow: 'hidden' }}
        />
        {hasEditPermission && (
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto', flexShrink: 0 }}>
            <IconButton
              onClick={e => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              color="error"
              size={isMobile ? 'medium' : 'small'}
              sx={{
                minWidth: { xs: 44, sm: 'auto' },
                minHeight: { xs: 44, sm: 'auto' },
                touchAction: 'manipulation',
              }}
            >
              <DeleteIcon fontSize={isMobile ? 'medium' : 'small'} />
            </IconButton>
          </Box>
        )}
      </Box>
    </ListItem>
  );
}

export default function ServicePlanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { hasEditPermission, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const deletePlan = useDeleteServicePlan();
  const [search, setSearch] = useState('');
  const hasAutoActivatedRef = useRef(false);

  const { data: servicePlan, isLoading, error } = useServicePlan(id || '');
  const { data: allPlans } = useServicePlans();
  const createPlan = useCreateServicePlan();
  const addSong = useAddSongToPlan();
  const removeSong = useRemoveSongFromPlan();
  const setActiveSong = useSetActiveSong();
  const setActiveVerse = useSetActiveVerse();
  const updatePlan = useUpdateServicePlan();
  const { songs: allCachedSongs, isLoading: isCacheLoading } = useCachedSongs();
  const { results: searchResults, isLoading: isSearchLoading } = useCachedSongSearch(search);
  // Get active song state via WebSocket for real-time updates
  const { data: activeSongData } = useActiveSongWs();

  // Alias for allSongs to maintain compatibility
  const allSongs = allCachedSongs;

  // Drag and drop sensors - restricted to vertical movement only
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - reorder songs
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!id || !servicePlan || !over || active.id === over.id) return;

      const oldIndex = servicePlan.items.findIndex(item => item.id === active.id);
      const newIndex = servicePlan.items.findIndex(item => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Create new items array with updated order
      const reorderedItems = arrayMove(servicePlan.items, oldIndex, newIndex);
      const updatedItems = reorderedItems.map((item, index) => ({
        ...item,
        order: index,
      }));

      try {
        await updatePlan.mutateAsync({
          id,
          data: {
            items: updatedItems,
          },
        });
        showSuccess('Kolejność pieśni została zmieniona!');
      } catch (error) {
        showError('Nie udało się zmienić kolejności pieśni.');
        console.error(error);
      }
    },
    [id, servicePlan, updatePlan, showSuccess, showError]
  );

  const handleCreateNew = useCallback(async () => {
    const name = prompt('Nazwa planu nabożeństwa:');
    if (!name) return;

    try {
      const newPlan = await createPlan.mutateAsync({ name });
      showSuccess('Plan nabożeństwa został utworzony!');
      navigate(`/service-plans/${newPlan.id}`);
    } catch (error) {
      showError('Nie udało się utworzyć planu nabożeństwa.');
      console.error(error);
    }
  }, [createPlan, navigate, showSuccess, showError]);

  const handleAddSong = useCallback(
    async (songId: string) => {
      if (!id) return;

      try {
        const updatedPlan = await addSong.mutateAsync({
          planId: id,
          data: {
            songId: songId,
          },
        });

        // Find the newly added item by songId
        const newItem = updatedPlan.items.find(item => item.songId === songId);
        if (newItem) {
          // Automatically set the newly added song as active
          try {
            await setActiveSong.mutateAsync({
              planId: id,
              data: { itemId: newItem.id, isActive: true },
            });
          } catch (activeError) {
            console.error('Failed to set song as active:', activeError);
            // Don't show error to user, just log it - song was added successfully
          }
        }

        showSuccess('Pieśń została dodana do planu i ustawiona jako aktywna!');
        setSearchModalOpen(false);
      } catch (error) {
        showError('Nie udało się dodać pieśni do planu.');
        console.error(error);
      }
    },
    [id, addSong, setActiveSong, showSuccess, showError]
  );

  const handleRemoveSong = useCallback(
    async (itemId: string) => {
      if (!id || !servicePlan) return;

      // Check if the song being removed is currently active
      const removedItem = servicePlan.items.find(item => item.id === itemId);
      const wasActive = removedItem?.isActive;

      try {
        await removeSong.mutateAsync({ planId: id, itemId });

        // If the removed song was active, activate the first remaining song
        if (wasActive) {
          // Get remaining items (excluding the one being removed)
          const remainingItems = servicePlan.items
            .filter(item => item.id !== itemId)
            .sort((a, b) => a.order - b.order);

          if (remainingItems.length > 0) {
            const firstItem = remainingItems[0];
            try {
              await setActiveSong.mutateAsync({
                planId: id,
                data: { itemId: firstItem.id, isActive: true },
              });
            } catch (activeError) {
              console.error('Failed to activate first song after removal:', activeError);
              // Don't show error to user, just log it
            }
          }
        }

        showSuccess('Pieśń została usunięta z planu!');
      } catch (error) {
        showError('Nie udało się usunąć pieśni z planu.');
        console.error(error);
      }
    },
    [id, servicePlan, removeSong, setActiveSong, showSuccess, showError]
  );

  const handleSetActive = useCallback(
    async (itemId: string, isActive: boolean) => {
      if (!id) return;

      try {
        await setActiveSong.mutateAsync({
          planId: id,
          data: { itemId, isActive },
        });
        showSuccess(
          isActive ? 'Pieśń została ustawiona jako aktywna!' : 'Pieśń została dezaktywowana!'
        );
      } catch (error) {
        showError('Nie udało się zmienić statusu pieśni.');
        console.error(error);
      }
    },
    [id, setActiveSong, showSuccess, showError]
  );

  // Auto-activate first song on initial load if no active song exists
  useEffect(() => {
    if (!id || !servicePlan || !hasEditPermission || hasAutoActivatedRef.current) return;

    const sortedItems = [...servicePlan.items].sort((a, b) => a.order - b.order);
    const hasActiveSong = sortedItems.some(item => item.isActive);

    if (!hasActiveSong && sortedItems.length > 0) {
      hasAutoActivatedRef.current = true;
      const firstItem = sortedItems[0];
      handleSetActive(firstItem.id, true);
    }
  }, [id, servicePlan, hasEditPermission, handleSetActive]);

  // Search results for column 1
  const allSearchSongs = useMemo(() => {
    if (!search.trim()) {
      return allCachedSongs || [];
    }
    return searchResults || [];
  }, [search, searchResults, allCachedSongs]);

  const isSearchLoadingState = search.trim() ? isSearchLoading : isCacheLoading;

  // Get all songs with verses from plan for column 3
  const planSongsWithVerses = useMemo(() => {
    if (!servicePlan || !allCachedSongs) return [];

    return servicePlan.items
      .sort((a, b) => a.order - b.order)
      .map(item => {
        // Use allCachedSongs instead of songsCache.getSongById for better reactivity
        const song = allCachedSongs.find(s => s.id === item.songId);
        if (!song) {
          console.warn(`[ServicePlanPage] Song not found in cache: ${item.songId}`);
          return null;
        }

        // Ensure verses are available - if not, try to get from cache
        const verses = song.verses || '';
        if (!verses) {
          console.warn(`[ServicePlanPage] Song has no verses: ${item.songId}`);
        }

        // Use verseOrder and lyricsXml from song if available (1:1 transparent with SQLite)
        const parsed = parseVerses(
          verses,
          song.verseOrder || null,
          song.lyricsXml || null,
          song.versesArray || null
        ).filter(v => v.content && v.content.trim());
        const allVerses = parsed.map((v, idx) => {
          // Hide technical labels like \"v1\", \"v2\" etc. in the service plan view.
          const rawLabel = v.label || '';
          const normalized = rawLabel.trim().toLowerCase();
          const isTechnicalLabel = /^v\\d+$/i.test(normalized);

          return {
            type: v.type || 'verse',
            content: v.content,
            label: isTechnicalLabel ? null : v.label || null,
            stepLabel: getVerseDisplayLabel(v, idx),
            songId: song.id,
            songTitle: song.title,
            itemId: item.id,
          };
        });

        return {
          itemId: item.id,
          songId: song.id,
          songTitle: song.title,
          songNumber: song.number,
          isActive: item.isActive,
          verses: allVerses,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [servicePlan, allCachedSongs]);

  // Navigation handlers for active song verses
  const handleNextVerse = useCallback(() => {
    if (!id || !activeSongData?.item) return;

    const activeItem = activeSongData.item;
    const activeSong = planSongsWithVerses.find(s => s.itemId === activeItem.id);
    if (!activeSong) return;

    const currentIndex = activeItem.activeVerseIndex ?? 0;
    const nextIndex = currentIndex + 1;

    if (nextIndex < activeSong.verses.length) {
      setActiveVerse.mutate({
        planId: id,
        data: {
          itemId: activeItem.id,
          verseIndex: nextIndex,
        },
      });
    }
  }, [id, activeSongData, planSongsWithVerses, setActiveVerse]);

  const handlePreviousVerse = useCallback(() => {
    if (!id || !activeSongData?.item) return;

    const activeItem = activeSongData.item;
    const activeSong = planSongsWithVerses.find(s => s.itemId === activeItem.id);
    if (!activeSong) return;

    const currentIndex = activeItem.activeVerseIndex ?? 0;
    const previousIndex = currentIndex - 1;

    if (previousIndex >= 0) {
      setActiveVerse.mutate({
        planId: id,
        data: {
          itemId: activeItem.id,
          verseIndex: previousIndex,
        },
      });
    }
  }, [id, activeSongData, planSongsWithVerses, setActiveVerse]);

  // Keyboard navigation for verses (only when active song exists and user has edit permission)
  useEffect(() => {
    if (!hasEditPermission || !activeSongData?.item) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePreviousVerse();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextVerse();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hasEditPermission, activeSongData, handleNextVerse, handlePreviousVerse]);

  // Calculate list height
  const calculateListHeight = useCallback((viewportHeight: number) => {
    const headerHeight = 60;
    const searchHeight = 120;
    const padding = 40;
    const calculatedHeight = viewportHeight - headerHeight - searchHeight - padding;
    return Math.max(300, calculatedHeight);
  }, []);

  // Column 1: Song List (memoized before conditional returns)
  const songListColumn = useMemo(
    () => (
      <Paper
        sx={{
          p: { xs: 1, md: 1.5 },
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <Box
          sx={{ mb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography
            variant="h6"
            sx={{ fontSize: { xs: '0.875rem', md: '0.95rem' }, fontWeight: 600 }}
          >
            Szukaj Pieśni
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <SongList
            songs={allSearchSongs}
            onSongClick={songId => {
              if (hasEditPermission) {
                handleAddSong(songId);
              } else {
                navigate(`/songs/${songId}`);
              }
            }}
            showSearch={true}
            searchValue={search}
            onSearchChange={setSearch}
            isLoading={isSearchLoadingState}
            emptyMessage="Nie znaleziono pieśni."
            calculateHeight={calculateListHeight}
          />
        </Box>
      </Paper>
    ),
    [
      isSearchLoadingState,
      search,
      allSearchSongs,
      hasEditPermission,
      navigate,
      calculateListHeight,
      handleAddSong,
    ]
  );

  // Column 2: Plan Songs with Add button (memoized before conditional returns)
  const planSongsColumn = useMemo(() => {
    if (!servicePlan) return null;
    const sortedItems = [...servicePlan.items].sort((a, b) => a.order - b.order);

    return (
      <Paper
        sx={{
          p: { xs: 1, md: 1.5 },
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            mb: 0.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.5,
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontSize: { xs: '0.875rem', md: '0.95rem' }, fontWeight: 600 }}
          >
            {servicePlan.name}
          </Typography>
          {isAuthenticated && (
            <Button
              variant="contained"
              size={isMobile ? 'medium' : 'small'}
              startIcon={<AddIcon />}
              onClick={() => setSearchModalOpen(true)}
              sx={{
                minWidth: 'auto',
                px: { xs: 1.5, sm: 1 },
                py: { xs: 1, sm: 0.5 },
                fontSize: { xs: '0.875rem', sm: '0.75rem' },
                minHeight: { xs: 44, sm: 'auto' },
                touchAction: 'manipulation',
              }}
            >
              Dodaj
            </Button>
          )}
        </Box>
        {servicePlan.date && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem' }}
          >
            {new Date(servicePlan.date).toLocaleDateString('pl-PL')}
          </Typography>
        )}
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {sortedItems.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Brak pieśni w planie
            </Alert>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <List dense sx={{ padding: { xs: 1, sm: 0.5 } }}>
                  {sortedItems.map(item => (
                    <SortableListItem
                      key={item.id}
                      item={{
                        id: item.id,
                        songTitle: item.songTitle,
                        notes: item.notes,
                        isActive: item.isActive ?? false,
                      }}
                      isMobile={isMobile}
                      hasEditPermission={hasEditPermission}
                      onSetActive={handleSetActive}
                      onRemove={handleRemoveSong}
                    />
                  ))}
                </List>
              </SortableContext>
            </DndContext>
          )}
        </Box>
      </Paper>
    );
  }, [
    servicePlan,
    isAuthenticated,
    hasEditPermission,
    handleSetActive,
    handleRemoveSong,
    isMobile,
    sensors,
    handleDragEnd,
  ]);

  // Column 3: Verses display (only for currently active song, memoized before conditional returns)
  const activeSongColumn = useMemo(() => {
    if (!servicePlan || planSongsWithVerses.length === 0) {
      return (
        <Paper
          sx={{
            p: { xs: 1, md: 1.5 },
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Alert severity="info" sx={{ py: 1, fontSize: '0.8rem' }}>
            Brak pieśni w planie
          </Alert>
        </Paper>
      );
    }

    // Show only verses for the currently active song
    const activeItemId = activeSongData?.item?.id || null;
    const visibleSongs = activeItemId
      ? planSongsWithVerses.filter(song => song.itemId === activeItemId)
      : planSongsWithVerses.filter(song => song.isActive);

    if (visibleSongs.length === 0) {
      return (
        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Alert
            severity="info"
            sx={{
              py: 2,
              px: 2,
              fontSize: { xs: '0.875rem', sm: '0.95rem' },
              '& .MuiAlert-message': {
                width: '100%',
                color: 'text.primary',
              },
              '& a': {
                color: 'primary.main',
                textDecoration: 'underline',
                fontWeight: 500,
                '&:hover': {
                  color: 'primary.dark',
                },
              },
            }}
          >
            Brak aktywnej pieśni. Ustaw pieśń jako aktywną w kolumnie planu.
          </Alert>
        </Paper>
      );
    }

    // Derive current song title for header from the visible (active) song
    const headerSong = visibleSongs[0];
    const headerTitle = headerSong.songNumber
      ? `${headerSong.songTitle} (${headerSong.songNumber})`
      : headerSong.songTitle;

    return (
      <Paper
        sx={{
          p: { xs: 1, md: 1.5 },
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            mb: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.5,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              component="h1"
              sx={{
                fontSize: { xs: '0.95rem', sm: '1rem', md: '1.1rem' },
                fontWeight: 600,
                mb: 0.25,
              }}
            >
              {headerTitle}
            </Typography>
          </Box>
          {activeSongData?.item && hasEditPermission && (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Poprzedni wers">
                <IconButton
                  onClick={handlePreviousVerse}
                  disabled={(activeSongData.item.activeVerseIndex ?? 0) === 0}
                  color="primary"
                  size={isMobile ? 'medium' : 'small'}
                  sx={{
                    minWidth: { xs: 44, sm: 'auto' },
                    minHeight: { xs: 44, sm: 'auto' },
                    touchAction: 'manipulation',
                  }}
                >
                  <NavigateBeforeIcon fontSize={isMobile ? 'medium' : 'small'} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Następny wers">
                <IconButton
                  onClick={handleNextVerse}
                  disabled={(() => {
                    const activeItem = activeSongData.item;
                    const activeSong = planSongsWithVerses.find(s => s.itemId === activeItem.id);
                    if (!activeSong) return true;
                    const currentIndex = activeItem.activeVerseIndex ?? 0;
                    return currentIndex >= activeSong.verses.length - 1;
                  })()}
                  color="primary"
                  size={isMobile ? 'medium' : 'small'}
                  sx={{
                    minWidth: { xs: 44, sm: 'auto' },
                    minHeight: { xs: 44, sm: 'auto' },
                    touchAction: 'manipulation',
                  }}
                >
                  <NavigateNextIcon fontSize={isMobile ? 'medium' : 'small'} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            minHeight: 0,
          }}
        >
          {visibleSongs.map(songData => (
            <Box key={songData.itemId}>
              <Stack spacing={0.5}>
                {songData.verses.map((verse, verseIndex) => {
                  // Check if this verse is currently active (displayed on live view)
                  const isCurrentlyActive =
                    songData.isActive &&
                    activeSongData?.item?.id === songData.itemId &&
                    (activeSongData.item.activeVerseIndex ?? 0) === verseIndex;

                  return (
                    <Paper
                      key={`${songData.itemId}-verse-${verseIndex}`}
                      elevation={0}
                      onClick={() => {
                        if (!hasEditPermission) return;
                        // Ensure this song is active in the plan
                        if (!songData.isActive) {
                          handleSetActive(songData.itemId, true);
                        }
                        // Set active verse index for live view
                        if (id) {
                          setActiveVerse.mutate({
                            planId: id,
                            data: {
                              itemId: songData.itemId,
                              verseIndex: verseIndex,
                            },
                          });
                        }
                      }}
                      sx={{
                        p: { xs: 0.75, sm: 1 },
                        cursor: hasEditPermission ? 'pointer' : 'default',
                        // Subtle background for active verse, neutral for others
                        bgcolor: isCurrentlyActive
                          ? 'action.selected'
                          : songData.isActive
                            ? 'background.default'
                            : 'background.paper',
                        color: 'text.primary',
                        border: 'none',
                        borderRadius: 0.5,
                        transition: 'all 0.15s',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                        '&:hover': {
                          bgcolor:
                            hasEditPermission && !isCurrentlyActive ? 'action.hover' : undefined,
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-line',
                          lineHeight: 1.5,
                          fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' },
                          fontWeight: isCurrentlyActive ? 600 : 400,
                          color: 'text.primary',
                        }}
                      >
                        {verse.content}
                      </Typography>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }, [
    servicePlan,
    planSongsWithVerses,
    hasEditPermission,
    handleSetActive,
    activeSongData,
    handleNextVerse,
    handlePreviousVerse,
    id,
    setActiveVerse,
  ]);

  // Column 4: Live Preview (what's displayed on presentation)
  const livePreviewColumn = useMemo(() => {
    const song = activeSongData?.song ?? null;
    if (!song) {
      return (
        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Alert
            severity="info"
            sx={{
              py: 2,
              px: 2,
              fontSize: { xs: '0.875rem', sm: '0.95rem' },
              '& .MuiAlert-message': {
                width: '100%',
                color: 'text.primary',
              },
              '& a': {
                color: 'primary.main',
                textDecoration: 'underline',
                fontWeight: 500,
                '&:hover': {
                  color: 'primary.dark',
                },
              },
            }}
          >
            Brak aktywnej pieśni
          </Alert>
        </Paper>
      );
    }

    const parsedVerses = parseVerses(
      song.verses?.map(v => ({ ...v, label: v.label ?? null })) ?? null,
      song.verseOrder || null,
      song.lyricsXml || null,
      song.versesArray?.map(
        (v: { order: number; content: string; label?: string; originalLabel?: string }) => ({
          ...v,
          label: v.label ?? undefined,
        })
      ) ?? null
    ).filter(v => v.content && v.content.trim());
    const allContent = parsedVerses.map(v => {
      const stepLabel = getVerseDisplayLabel(v, parsedVerses.indexOf(v));
      return { type: v.type || 'verse', content: v.content, label: v.label, stepLabel };
    });

    const currentVerseIndex = activeSongData?.item?.activeVerseIndex ?? 0;
    const currentContent = allContent[currentVerseIndex] || allContent[0] || null;
    const displayTitle = song.number ? `${song.title} (${song.number})` : song.title;

    return (
      <Paper
        sx={{
          p: { xs: 1, md: 1.5 },
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          position: 'relative',
          bgcolor: 'background.default',
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          sx={{
            fontSize: { xs: '0.875rem', sm: '0.95rem' },
            fontWeight: 600,
            mb: 1,
            opacity: 0.7,
          }}
        >
          Podgląd prezentacji
        </Typography>
        {currentContent && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: { xs: 8, sm: 12 },
                left: { xs: 8, sm: 12 },
                opacity: 0.5,
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                fontWeight: 600,
              }}
            >
              {displayTitle}
            </Typography>
            <Typography
              variant="body1"
              component="div"
              sx={{
                fontSize: { xs: '1rem', sm: '1.2rem', md: '1.4rem' },
                lineHeight: 1.4,
                whiteSpace: 'pre-line',
                px: { xs: 1, sm: 2 },
                wordBreak: 'break-word',
                maxWidth: '100%',
                fontWeight: 500,
              }}
            >
              {currentContent.content}
            </Typography>
            {allContent.length > 0 && (
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: { xs: 8, sm: 12 },
                  right: { xs: 8, sm: 12 },
                  opacity: 0.5,
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                }}
              >
                {currentContent.stepLabel} ({currentVerseIndex + 1}/{allContent.length})
              </Typography>
            )}
          </Box>
        )}
      </Paper>
    );
  }, [activeSongData]);

  if (!id) {
    // List of all service plans
    return (
      <Box sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h1">
            Plany Nabożeństw
          </Typography>
          {hasEditPermission && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateNew}
              disabled={createPlan.isPending}
            >
              Nowy Plan
            </Button>
          )}
        </Box>
        {allPlans && allPlans.length > 0 ? (
          <Paper elevation={0} sx={{ p: 2 }}>
            <List>
              {allPlans.map(plan => {
                const handleDelete = async (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (!window.confirm(`Czy na pewno chcesz usunąć plan "${plan.name}"?`)) return;

                  try {
                    await deletePlan.mutateAsync(plan.id);
                    showSuccess('Plan nabożeństwa został usunięty');
                  } catch (error) {
                    showError('Nie udało się usunąć planu nabożeństwa');
                  }
                };

                return (
                  <ListItem
                    key={plan.id}
                    button
                    onClick={() => navigate(`/service-plans/${plan.id}`)}
                    sx={{
                      border: theme => `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemText
                      primary={plan.name}
                      secondary={
                        <Box>
                          {plan.date && (
                            <Typography variant="caption" component="span">
                              {new Date(plan.date).toLocaleDateString('pl-PL')} •{' '}
                            </Typography>
                          )}
                          <Typography variant="caption" component="span">
                            {plan.items.length} {plan.items.length === 1 ? 'pieśń' : 'pieśni'}
                          </Typography>
                        </Box>
                      }
                    />
                    {hasEditPermission && (
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={handleDelete}
                          disabled={deletePlan.isPending}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        ) : (
          <Alert severity="info">Brak planów nabożeństw. Utwórz pierwszy plan!</Alert>
        )}
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !servicePlan) {
    return (
      <Box sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">Nie udało się załadować planu nabożeństwa.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 0.5, sm: 1, md: 2 }, px: { xs: 0.5, sm: 1, md: 2 } }}>
      {/* 4-Column Layout */}
      <Box
        display="flex"
        flexDirection={{ xs: 'column', lg: 'row' }}
        gap={{ xs: 0.5, sm: 1 }}
        alignItems="flex-start"
        maxWidth={{ xs: '100%', lg: '2000px' }}
        mx="auto"
        width="100%"
        sx={{ overflowX: 'hidden' }}
      >
        {/* Column 1: Song List */}
        <Box
          sx={{
            width: { xs: '100%', lg: '300px' },
            minWidth: { xs: '100%', lg: '300px' },
            maxWidth: { xs: '100%', lg: '300px' },
            flexShrink: 0,
            display: { xs: 'none', lg: 'block' },
          }}
        >
          <Box
            sx={{
              position: { xs: 'static', lg: 'sticky' },
              top: { lg: 20 },
              height: { xs: 'auto', lg: 'calc(100vh - 100px)' },
            }}
          >
            {songListColumn}
          </Box>
        </Box>
        {/* Column 2: Plan Songs */}
        <Box
          sx={{
            width: { xs: '100%', lg: '300px' },
            minWidth: { xs: '100%', lg: '300px' },
            maxWidth: { xs: '100%', lg: '300px' },
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              position: { xs: 'static', lg: 'sticky' },
              top: { lg: 20 },
              height: { xs: 'auto', lg: 'calc(100vh - 100px)' },
            }}
          >
            {planSongsColumn}
          </Box>
        </Box>
        {/* Column 3: Active Song Display */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            width: { xs: '100%', lg: 'auto' },
          }}
        >
          {activeSongColumn}
        </Box>
        {/* Column 4: Live Preview */}
        <Box
          sx={{
            width: { xs: '100%', lg: '350px' },
            minWidth: { xs: '100%', lg: '350px' },
            maxWidth: { xs: '100%', lg: '350px' },
            flexShrink: 0,
            display: { xs: 'none', xl: 'block' },
          }}
        >
          <Box
            sx={{
              position: { xs: 'static', lg: 'sticky' },
              top: { lg: 20 },
              height: { xs: 'auto', lg: 'calc(100vh - 100px)' },
            }}
          >
            {livePreviewColumn}
          </Box>
        </Box>
      </Box>

      {/* Add Song Dialog */}
      {/* Song Search Modal */}
      <SongSearchModal
        open={searchModalOpen}
        onClose={() => {
          setSearchModalOpen(false);
        }}
        songs={allSongs || []}
        onSongClick={songId => {
          handleAddSong(songId);
        }}
      />
    </Box>
  );
}
