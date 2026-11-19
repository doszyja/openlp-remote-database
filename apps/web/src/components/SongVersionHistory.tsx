import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
  Tooltip,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
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
  const [versionOlder, setVersionOlder] = useState<number | ''>('');
  const [versionNewer, setVersionNewer] = useState<number | ''>('');
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<VersionComparison | null>(null);
  const didSetDefaultVersions = useRef(false);

  useEffect(() => {
    if (didSetDefaultVersions.current || !versions?.length) {
      return;
    }
    if (versions.length >= 2) {
      setVersionOlder(versions[1].version);
      setVersionNewer(versions[0].version);
    } else {
      setVersionNewer(versions[0].version);
    }
    didSetDefaultVersions.current = true;
  }, [versions]);

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

  const runCompare = async (older: number, newer: number) => {
    if (older === newer) {
      showError('Wybierz dwie różne wersje.');
      return;
    }
    const v1 = Math.min(older, newer);
    const v2 = Math.max(older, newer);

    try {
      setComparing(true);
      setComparisonResult(null);
      const result = await compareVersions.mutateAsync({
        songId,
        v1,
        v2,
      });
      setComparisonResult(result);
      setVersionOlder(v1);
      setVersionNewer(v2);
    } catch (error) {
      showError('Nie udało się porównać wersji.');
      console.error(error);
    } finally {
      setComparing(false);
    }
  };

  const handleCompare = () => {
    if (versionOlder === '' || versionNewer === '') {
      showError('Wybierz obie wersje do porównania.');
      return;
    }
    void runCompare(versionOlder, versionNewer);
  };

  const handleSwapVersions = () => {
    const a = versionOlder;
    const b = versionNewer;
    setVersionOlder(b);
    setVersionNewer(a);
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

  const renderVersionMenuItem = (version: SongVersion, index: number) => {
    const date = formatDate(version.createdAt);
    const user = version.changedByUsername ? ` · ${version.changedByUsername}` : '';
    const suffix =
      index === 0 ? ' (aktualna)' : version.changeReason ? ` · ${version.changeReason}` : '';
    return (
      <MenuItem key={version.version} value={version.version} dense>
        <ListItemText
          primary={`Wersja ${version.version}${index === 0 ? ' — aktualna' : ''}`}
          secondary={`${date}${user}${suffix}`}
          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
          secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
        />
      </MenuItem>
    );
  };

  const canCompare =
    versionOlder !== '' && versionNewer !== '' && versionOlder !== versionNewer && !comparing;

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
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                Porównaj wersje
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'flex-end' }}
              >
                <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
                  <InputLabel id="version-older-label">Wersja starsza</InputLabel>
                  <Select
                    labelId="version-older-label"
                    label="Wersja starsza"
                    value={versionOlder}
                    onChange={(e: SelectChangeEvent<number | ''>) => {
                      setVersionOlder(e.target.value === '' ? '' : Number(e.target.value));
                      setComparisonResult(null);
                    }}
                  >
                    {versions.map((v, index) => renderVersionMenuItem(v, index))}
                  </Select>
                </FormControl>
                <Tooltip title="Zamień strony">
                  <span>
                    <IconButton
                      onClick={handleSwapVersions}
                      disabled={versionOlder === '' || versionNewer === ''}
                      aria-label="Zamień wersje"
                      sx={{ alignSelf: { xs: 'center', sm: 'center' }, mb: { sm: 0.25 } }}
                    >
                      <SwapHorizIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
                  <InputLabel id="version-newer-label">Wersja nowsza</InputLabel>
                  <Select
                    labelId="version-newer-label"
                    label="Wersja nowsza"
                    value={versionNewer}
                    onChange={(e: SelectChangeEvent<number | ''>) => {
                      setVersionNewer(e.target.value === '' ? '' : Number(e.target.value));
                      setComparisonResult(null);
                    }}
                  >
                    {versions.map((v, index) => renderVersionMenuItem(v, index))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={comparing ? <CircularProgress size={18} color="inherit" /> : <CompareIcon />}
                  onClick={handleCompare}
                  disabled={!canCompare}
                  sx={{
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    minHeight: 40,
                  }}
                >
                  Porównaj
                </Button>
              </Stack>
              {versionOlder !== '' &&
                versionNewer !== '' &&
                versionOlder === versionNewer && (
                  <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
                    Wybierz dwie różne wersje.
                  </Typography>
                )}
            </Paper>

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
                      borderColor:
                        versionOlder === version.version
                          ? 'error.main'
                          : versionNewer === version.version
                            ? 'success.main'
                            : 'divider',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor:
                        versionOlder === version.version
                          ? theme =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(211, 47, 47, 0.12)'
                                : 'rgba(211, 47, 47, 0.06)'
                          : versionNewer === version.version
                            ? theme =>
                                theme.palette.mode === 'dark'
                                  ? 'rgba(46, 125, 50, 0.12)'
                                  : 'rgba(46, 125, 50, 0.06)'
                            : 'background.paper',
                    }}
                  >
                    <ListItemButton
                      onClick={() => {
                        setVersionNewer(version.version);
                        setComparisonResult(null);
                      }}
                      dense
                    >
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
                            {index === 0 && <Chip label="Aktualna" size="small" color="primary" />}
                            {versionOlder === version.version && (
                              <Chip label="Starsza" size="small" color="error" variant="outlined" />
                            )}
                            {versionNewer === version.version && (
                              <Chip label="Nowsza" size="small" color="success" variant="outlined" />
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
                            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                              <Button
                                size="small"
                                variant="text"
                                onClick={e => {
                                  e.stopPropagation();
                                  setVersionOlder(version.version);
                                  setComparisonResult(null);
                                }}
                                sx={{ fontSize: '0.75rem', textTransform: 'none', px: 0, minWidth: 0 }}
                              >
                                Ustaw jako starszą
                              </Button>
                              <Button
                                size="small"
                                variant="text"
                                onClick={e => {
                                  e.stopPropagation();
                                  setVersionNewer(version.version);
                                  setComparisonResult(null);
                                }}
                                sx={{ fontSize: '0.75rem', textTransform: 'none', px: 0, minWidth: 0 }}
                              >
                                Ustaw jako nowszą
                              </Button>
                              {index > 0 && (
                                <Button
                                  size="small"
                                  variant="text"
                                  startIcon={<CompareIcon sx={{ fontSize: 16 }} />}
                                  onClick={e => {
                                    e.stopPropagation();
                                    void runCompare(versions[index - 1].version, version.version);
                                  }}
                                  sx={{ fontSize: '0.75rem', textTransform: 'none', px: 0, minWidth: 0 }}
                                >
                                  Porównaj z poprzednią
                                </Button>
                              )}
                            </Stack>
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
