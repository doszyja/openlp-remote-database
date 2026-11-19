import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  History as HistoryIcon,
  Restore as RestoreIcon,
  CompareArrows as CompareIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  useSongVersions,
  useRestoreVersion,
  useCompareVersions,
  type SongVersion,
  type VersionComparison,
} from '../hooks/useSongVersions';
import { useNotification } from '../contexts/NotificationContext';
import {
  diffSimpleSideBySide,
  diffVersesSideBySide,
  diffTextLinesSideBySide,
  diffTagsSideBySide,
} from './songVersionDiffUi';

interface SongVersionHistoryProps {
  songId: string;
  open?: boolean;
  onClose?: () => void;
  onRestore?: () => void;
  /** Full page at /songs/:id/history */
  embedded?: boolean;
  canRestore?: boolean;
}

export default function SongVersionHistory({
  songId,
  open = false,
  onClose,
  onRestore,
  embedded = false,
  canRestore = true,
}: SongVersionHistoryProps) {
  const { data: versions, isLoading } = useSongVersions(songId);
  const restoreVersion = useRestoreVersion();
  const compareVersions = useCompareVersions();
  const { showSuccess, showError } = useNotification();
  const [selectedVersions, setSelectedVersions] = useState<[number | null, number | null]>([
    null,
    null,
  ]);
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<VersionComparison | null>(null);

  const handleRestore = async (version: number) => {
    if (
      !window.confirm(
        `Czy na pewno chcesz przywrócić wersję ${version}? Obecna wersja zostanie zapisana jako nowa wersja.`
      )
    ) {
      return;
    }

    try {
      await restoreVersion.mutateAsync({ songId, version });
      showSuccess(`Wersja ${version} została przywrócona!`);
      onRestore?.();
      if (!embedded) onClose?.();
    } catch (error) {
      showError('Nie udało się przywrócić wersji.');
      console.error(error);
    }
  };

  const handleCompare = async () => {
    if (!selectedVersions[0] || !selectedVersions[1]) return;

    try {
      setComparing(true);
      const result = await compareVersions.mutateAsync({
        songId,
        v1: selectedVersions[0],
        v2: selectedVersions[1],
      });
      setComparisonResult(result);
    } catch (error) {
      showError('Nie udało się porównać wersji.');
      console.error(error);
    } finally {
      setComparing(false);
    }
  };

  const handleSelectVersion = (version: number) => {
    if (selectedVersions[0] === null) {
      setSelectedVersions([version, null]);
    } else if (selectedVersions[1] === null && selectedVersions[0] !== version) {
      setSelectedVersions([selectedVersions[0], version]);
    } else {
      setSelectedVersions([version, null]);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const historyBody = (
    <>
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : !versions || versions.length === 0 ? (
          <Alert severity="info">Brak historii wersji dla tej pieśni.</Alert>
        ) : (
          <Stack spacing={2}>
            {selectedVersions[0] && selectedVersions[1] && (
              <Paper sx={{ p: 2, bgcolor: 'action.selected' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="body2">
                    Porównaj wersję {selectedVersions[0]} z wersją {selectedVersions[1]}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CompareIcon />}
                    onClick={handleCompare}
                    disabled={comparing}
                  >
                    Porównaj
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setSelectedVersions([null, null])}
                  >
                    Anuluj
                  </Button>
                </Stack>
              </Paper>
            )}

            {comparisonResult && (
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Porównanie: wersja {comparisonResult.version1.version} ↔{' '}
                  {comparisonResult.version2.version}
                </Typography>
                {(() => {
                  const differences = comparisonResult.differences || {};
                  const diffKeys = Object.keys(differences);
                  const leftLabel = `Wersja ${comparisonResult.version1.version}`;
                  const rightLabel = `Wersja ${comparisonResult.version2.version}`;

                  if (diffKeys.length === 0) {
                    return (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Brak różnic między wybranymi wersjami.
                      </Alert>
                    );
                  }

                  const fieldLabels: Record<string, string> = {
                    title: 'Tytuł',
                    number: 'Numer',
                    language: 'Język',
                    verseOrder: 'Kolejność zwrotek',
                    lyricsXml: 'XML tekstu',
                    verses: 'Zwrotki',
                    tags: 'Tagi',
                    copyright: 'Prawa autorskie',
                    comments: 'Komentarze',
                    ccliNumber: 'Numer CCLI',
                    songbook: 'Śpiewnik',
                  };

                  return (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      {diffKeys.map(field => {
                        const diff = differences[field];
                        if (!diff || (diff.old === undefined && diff.new === undefined)) {
                          return null;
                        }

                        let panel: ReactNode;
                        if (field === 'verses') {
                          panel = diffVersesSideBySide(
                            leftLabel,
                            rightLabel,
                            diff.old,
                            diff.new
                          );
                        } else if (field === 'tags') {
                          panel = diffTagsSideBySide(leftLabel, rightLabel, diff.old, diff.new);
                        } else if (
                          field === 'lyricsXml' ||
                          (typeof diff.old === 'string' &&
                            typeof diff.new === 'string' &&
                            (diff.old.includes('\n') || diff.new.includes('\n')))
                        ) {
                          panel = diffTextLinesSideBySide(
                            leftLabel,
                            rightLabel,
                            String(diff.old ?? ''),
                            String(diff.new ?? '')
                          );
                        } else {
                          panel = diffSimpleSideBySide(leftLabel, rightLabel, diff.old, diff.new);
                        }

                        return (
                          <Accordion
                            key={field}
                            defaultExpanded={field === 'verses' || field === 'title'}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {fieldLabels[field] || field}
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0 }}>{panel}</AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </Stack>
                  );
                })()}
                <Button size="small" onClick={() => setComparisonResult(null)} sx={{ mt: 2 }}>
                  Zamknij porównanie
                </Button>
              </Paper>
            )}

            <List disablePadding>
              {versions.map((version: SongVersion, index: number) => (
                <Box key={version._id}>
                  <ListItem
                    disablePadding
                    secondaryAction={
                      canRestore && index !== 0 ? (
                        <IconButton
                          edge="end"
                          onClick={e => {
                            e.stopPropagation();
                            handleRestore(version.version);
                          }}
                          disabled={restoreVersion.isPending}
                          color="primary"
                          size="small"
                          title={`Przywróć wersję ${version.version}`}
                          aria-label={`Przywróć wersję ${version.version}`}
                        >
                          <RestoreIcon />
                        </IconButton>
                      ) : undefined
                    }
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor:
                        selectedVersions[0] === version.version ||
                        selectedVersions[1] === version.version
                          ? 'action.selected'
                          : 'background.paper',
                    }}
                  >
                    <ListItemButton onClick={() => handleSelectVersion(version.version)} dense>
                      <ListItemText
                        primary={
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={0.75}
                            flexWrap="wrap"
                            component="span"
                          >
                            <Typography variant="subtitle1" component="span">
                              Wersja {version.version}
                            </Typography>
                            {index === 0 && (
                              <Chip label="Aktualna" size="small" color="primary" />
                            )}
                            {version.changeSource === 'openlp' && (
                              <Chip label="OpenLP" size="small" variant="outlined" />
                            )}
                            {version.catalogVersion != null && (
                              <Chip
                                label={`Katalog v${version.catalogVersion}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box component="span" display="block" sx={{ mt: 0.5 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              component="span"
                              display="block"
                            >
                              {formatDate(version.createdAt)}
                            </Typography>
                            {version.changedByUsername && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                component="span"
                                display="block"
                              >
                                Zmienione przez: {version.changedByUsername}
                              </Typography>
                            )}
                            {version.changeReason && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                component="span"
                                display="block"
                              >
                                Powód: {version.changeReason}
                              </Typography>
                            )}
                            {version.changes && Object.keys(version.changes).length > 0 && (
                              <Button
                                size="small"
                                variant="text"
                                onClick={e => {
                                  e.stopPropagation();
                                  if (index > 0) {
                                    const previousVersion = versions[index - 1];
                                    setSelectedVersions([
                                      previousVersion.version,
                                      version.version,
                                    ]);
                                    setTimeout(() => {
                                      void handleCompare();
                                    }, 100);
                                  }
                                }}
                                sx={{
                                  fontSize: '0.75rem',
                                  textTransform: 'none',
                                  mt: 0.5,
                                  px: 0,
                                }}
                              >
                                Porównaj z poprzednią
                              </Button>
                            )}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                </Box>
              ))}
            </List>
          </Stack>
        )}
    </>
  );


  if (embedded) {
    return (
      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, border: 1, borderColor: 'divider' }}>
        {historyBody}
      </Paper>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon />
            <Typography variant="h6">Historia Wersji Pieśni</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>{historyBody}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Zamknij</Button>
      </DialogActions>
    </Dialog>
  );
}
