import { useState, useCallback, useMemo } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useServicePlan, useServicePlans, useCreateServicePlan, useDeleteServicePlan, useAddSongToPlan, useRemoveSongFromPlan, useSetActiveSong } from '../hooks/useServicePlans';
import { useCachedSongs } from '../hooks/useCachedSongs';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import SongSearchModal from '../components/SongSearchModal';
import type { SongListCacheItem } from '@openlp/shared';

export default function ServicePlanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasEditPermission } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [addSongDialogOpen, setAddSongDialogOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SongListCacheItem | null>(null);

  const { data: servicePlan, isLoading, error } = useServicePlan(id || '');
  const { data: allPlans } = useServicePlans();
  const createPlan = useCreateServicePlan();
  const deletePlan = useDeleteServicePlan();
  const addSong = useAddSongToPlan();
  const removeSong = useRemoveSongFromPlan();
  const setActiveSong = useSetActiveSong();
  const { songs: allSongs } = useCachedSongs();

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

  const handleAddSong = useCallback(async () => {
    if (!id || !selectedSong) return;

    try {
      await addSong.mutateAsync({
        planId: id,
        data: {
          songId: selectedSong.id,
        },
      });
      showSuccess('Pieśń została dodana do planu!');
      setAddSongDialogOpen(false);
      setSelectedSong(null);
    } catch (error) {
      showError('Nie udało się dodać pieśni do planu.');
      console.error(error);
    }
  }, [id, selectedSong, addSong, showSuccess, showError]);

  const handleRemoveSong = useCallback(async (itemId: string) => {
    if (!id) return;

    try {
      await removeSong.mutateAsync({ planId: id, itemId });
      showSuccess('Pieśń została usunięta z planu!');
    } catch (error) {
      showError('Nie udało się usunąć pieśni z planu.');
      console.error(error);
    }
  }, [id, removeSong, showSuccess, showError]);

  const handleSetActive = useCallback(async (itemId: string, isActive: boolean) => {
    if (!id) return;

    try {
      await setActiveSong.mutateAsync({
        planId: id,
        data: { itemId, isActive },
      });
      showSuccess(isActive ? 'Pieśń została ustawiona jako aktywna!' : 'Pieśń została dezaktywowana!');
    } catch (error) {
      showError('Nie udało się zmienić statusu pieśni.');
      console.error(error);
    }
  }, [id, setActiveSong, showSuccess, showError]);

  const handleDeletePlan = useCallback(async () => {
    if (!id) return;
    if (!confirm('Czy na pewno chcesz usunąć ten plan nabożeństwa?')) return;

    try {
      await deletePlan.mutateAsync(id);
      showSuccess('Plan nabożeństwa został usunięty!');
      navigate('/service-plans');
    } catch (error) {
      showError('Nie udało się usunąć planu nabożeństwa.');
      console.error(error);
    }
  }, [id, deletePlan, navigate, showSuccess, showError]);

  const sortedItems = useMemo(() => {
    if (!servicePlan) return [];
    return [...servicePlan.items].sort((a, b) => a.order - b.order);
  }, [servicePlan]);

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
              {allPlans.map((plan) => (
                <ListItem
                  key={plan.id}
                  button
                  onClick={() => navigate(`/service-plans/${plan.id}`)}
                  sx={{
                    border: (theme) => `1px solid ${theme.palette.divider}`,
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
                </ListItem>
              ))}
            </List>
          </Paper>
        ) : (
          <Alert severity="info">
            Brak planów nabożeństw. Utwórz pierwszy plan!
          </Alert>
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
        <Alert severity="error">
          Nie udało się załadować planu nabożeństwa.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/service-plans')}
            size="small"
          >
            Wstecz
          </Button>
          <Typography variant="h5" component="h1">
            {servicePlan.name}
          </Typography>
          {servicePlan.date && (
            <Chip label={new Date(servicePlan.date).toLocaleDateString('pl-PL')} size="small" />
          )}
        </Box>
        <Box display="flex" gap={1}>
          {hasEditPermission && (
            <>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setAddSongDialogOpen(true)}
                size="small"
              >
                Dodaj Pieśń
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeletePlan}
                disabled={deletePlan.isPending}
                size="small"
              >
                Usuń Plan
              </Button>
            </>
          )}
        </Box>
      </Box>

      {sortedItems.length === 0 ? (
        <Alert severity="info">
          Ten plan nie zawiera jeszcze żadnych pieśni. Dodaj pierwszą pieśń!
        </Alert>
      ) : (
        <Paper elevation={0} sx={{ p: 2 }}>
          <List>
            {sortedItems.map((item) => {
              const itemId = item.id;
              return (
                <ListItem
                  key={itemId}
                  sx={{
                    border: (theme) =>
                      item.isActive
                        ? `2px solid ${theme.palette.primary.main}`
                        : `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: item.isActive ? 'action.selected' : 'background.paper',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1" fontWeight={item.isActive ? 600 : 400}>
                          {item.songTitle}
                        </Typography>
                        {item.isActive && (
                          <Chip label="AKTYWNA" color="primary" size="small" />
                        )}
                      </Box>
                    }
                    secondary={item.notes}
                  />
                  <ListItemSecondaryAction>
                    <Box display="flex" gap={0.5}>
                      {hasEditPermission && (
                        <>
                          <Tooltip title={item.isActive ? 'Dezaktywuj' : 'Ustaw jako aktywną'}>
                            <IconButton
                              edge="end"
                              onClick={() => handleSetActive(itemId, !item.isActive)}
                              color={item.isActive ? 'primary' : 'default'}
                              size="small"
                            >
                              {item.isActive ? <StopIcon /> : <PlayArrowIcon />}
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveSong(itemId)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                      <IconButton
                        edge="end"
                        onClick={() => navigate(`/songs/${item.songId}`)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}

      {/* Add Song Dialog */}
      <Dialog open={addSongDialogOpen} onClose={() => setAddSongDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dodaj Pieśń do Planu</DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setAddSongDialogOpen(false);
                setSearchModalOpen(true);
              }}
              startIcon={<AddIcon />}
            >
              Wybierz z listy pieśni
            </Button>
          </Box>
          {selectedSong && (
            <Alert severity="info">
              Wybrano: {selectedSong.title}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSongDialogOpen(false)}>Anuluj</Button>
          <Button
            variant="contained"
            onClick={handleAddSong}
            disabled={!selectedSong || addSong.isPending}
          >
            Dodaj
          </Button>
        </DialogActions>
      </Dialog>

      {/* Song Search Modal */}
      <SongSearchModal
        open={searchModalOpen}
        onClose={() => {
          setSearchModalOpen(false);
          setAddSongDialogOpen(true);
        }}
        songs={allSongs || []}
        onSongClick={(songId) => {
          const song = allSongs?.find(s => s.id === songId);
          if (song) {
            setSelectedSong(song);
            setSearchModalOpen(false);
            setAddSongDialogOpen(true);
          }
        }}
      />
    </Box>
  );
}

