import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Chip,
  Divider,
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
import type { Tag } from '@openlp/shared';

type Verse = {
  order: number;
  content: string;
  label?: string;
  originalLabel?: string;
};

interface SongVersionHistoryProps {
  songId: string;
  open: boolean;
  onClose: () => void;
  onRestore?: () => void;
}

export default function SongVersionHistory({
  songId,
  open,
  onClose,
  onRestore,
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
      onClose();
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
      console.log('Comparison result:', result);
      console.log('Differences:', result?.differences);
      console.log(
        'Differences keys:',
        result?.differences ? Object.keys(result.differences) : 'none'
      );
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
      <DialogContent>
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
                  Różnice między wersjami:
                </Typography>
                {(() => {
                  const differences = comparisonResult.differences || {};
                  const diffKeys = Object.keys(differences);
                  console.log('Rendering comparison, differences keys:', diffKeys);

                  if (diffKeys.length === 0) {
                    return (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Brak różnic między wybranymi wersjami.
                      </Alert>
                    );
                  }

                  return (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      {diffKeys.map(field => {
                        const diff = differences[field];
                        if (!diff || (diff.old === undefined && diff.new === undefined)) {
                          return null;
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
                        };

                        const renderVersesDiff = (oldVerses: unknown, newVerses: unknown) => {
                          const oldArray = Array.isArray(oldVerses) ? oldVerses : [];
                          const newArray = Array.isArray(newVerses) ? newVerses : [];

                          const oldMap = new Map(
                            oldArray.map((v: Verse, i: number) => [v.order || i, v])
                          );
                          const newMap = new Map(
                            newArray.map((v: Verse, i: number) => [v.order || i, v])
                          );

                          const allOrders = new Set([...oldMap.keys(), ...newMap.keys()]);
                          const changes: Array<{
                            order: number;
                            type: 'removed' | 'added' | 'changed';
                            old?: Verse;
                            new?: Verse;
                          }> = [];

                          allOrders.forEach(order => {
                            const oldVerse = oldMap.get(order);
                            const newVerse = newMap.get(order);

                            if (!oldVerse && newVerse) {
                              changes.push({ order, type: 'added', new: newVerse });
                            } else if (oldVerse && !newVerse) {
                              changes.push({ order, type: 'removed', old: oldVerse });
                            } else if (
                              oldVerse &&
                              newVerse &&
                              JSON.stringify(oldVerse) !== JSON.stringify(newVerse)
                            ) {
                              changes.push({
                                order,
                                type: 'changed',
                                old: oldVerse,
                                new: newVerse,
                              });
                            }
                          });

                          if (changes.length === 0) {
                            return (
                              <Typography variant="body2" color="text.secondary">
                                Brak zmian w zwrotkach
                              </Typography>
                            );
                          }

                          return (
                            <Stack spacing={1}>
                              {changes.map((change, idx) => (
                                <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                                  >
                                    Zwrotka {change.order} (
                                    {change.type === 'removed'
                                      ? 'Usunięta'
                                      : change.type === 'added'
                                        ? 'Dodana'
                                        : 'Zmieniona'}
                                    )
                                  </Typography>
                                  {change.type === 'removed' && change.old && (
                                    <Box sx={{ mb: 1 }}>
                                      <Typography
                                        variant="caption"
                                        sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                                      >
                                        Usunięto:
                                      </Typography>
                                      <Box
                                        sx={{
                                          textDecoration: 'line-through',
                                          textDecorationColor: 'error.main',
                                          textDecorationThickness: '2px',
                                          color: 'error.main',
                                          bgcolor: theme =>
                                            theme.palette.mode === 'dark'
                                              ? 'rgba(211, 47, 47, 0.2)'
                                              : 'rgba(211, 47, 47, 0.1)',
                                          p: 1,
                                          borderRadius: 1,
                                          fontSize: '0.875rem',
                                          whiteSpace: 'pre-line',
                                        }}
                                      >
                                        {change.old.label && (
                                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                            {change.old.label}:{' '}
                                          </Typography>
                                        )}
                                        {change.old.content}
                                      </Box>
                                    </Box>
                                  )}
                                  {change.type === 'added' && change.new && (
                                    <Box>
                                      <Typography
                                        variant="caption"
                                        sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                                      >
                                        Dodano:
                                      </Typography>
                                      <Box
                                        sx={{
                                          borderBottom: '2px solid',
                                          borderColor: 'success.main',
                                          color: 'success.main',
                                          bgcolor: theme =>
                                            theme.palette.mode === 'dark'
                                              ? 'rgba(46, 125, 50, 0.2)'
                                              : 'rgba(46, 125, 50, 0.1)',
                                          p: 1,
                                          borderRadius: 1,
                                          fontSize: '0.875rem',
                                          whiteSpace: 'pre-line',
                                        }}
                                      >
                                        {change.new.label && (
                                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                            {change.new.label}:{' '}
                                          </Typography>
                                        )}
                                        {change.new.content}
                                      </Box>
                                    </Box>
                                  )}
                                  {change.type === 'changed' && change.old && change.new && (
                                    <Stack spacing={1}>
                                      <Box>
                                        <Typography
                                          variant="caption"
                                          sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                                        >
                                          Stare:
                                        </Typography>
                                        <Box
                                          sx={{
                                            textDecoration: 'line-through',
                                            textDecorationColor: 'error.main',
                                            textDecorationThickness: '2px',
                                            color: 'error.main',
                                            bgcolor: theme =>
                                              theme.palette.mode === 'dark'
                                                ? 'rgba(211, 47, 47, 0.2)'
                                                : 'rgba(211, 47, 47, 0.1)',
                                            p: 1,
                                            borderRadius: 1,
                                            fontSize: '0.875rem',
                                            whiteSpace: 'pre-line',
                                          }}
                                        >
                                          {change.old.label && (
                                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                              {change.old.label}:{' '}
                                            </Typography>
                                          )}
                                          {change.old.content}
                                        </Box>
                                      </Box>
                                      <Box>
                                        <Typography
                                          variant="caption"
                                          sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                                        >
                                          Nowe:
                                        </Typography>
                                        <Box
                                          sx={{
                                            borderBottom: '2px solid',
                                            borderColor: 'success.main',
                                            color: 'success.main',
                                            bgcolor: theme =>
                                              theme.palette.mode === 'dark'
                                                ? 'rgba(46, 125, 50, 0.2)'
                                                : 'rgba(46, 125, 50, 0.1)',
                                            p: 1,
                                            borderRadius: 1,
                                            fontSize: '0.875rem',
                                            whiteSpace: 'pre-line',
                                          }}
                                        >
                                          {change.new.label && (
                                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                              {change.new.label}:{' '}
                                            </Typography>
                                          )}
                                          {change.new.content}
                                        </Box>
                                      </Box>
                                    </Stack>
                                  )}
                                </Paper>
                              ))}
                            </Stack>
                          );
                        };

                        const renderTagsDiff = (oldTags: unknown, newTags: unknown) => {
                          const oldArray = Array.isArray(oldTags)
                            ? oldTags.map((t: Tag | string) => (typeof t === 'string' ? t : t.name))
                            : [];
                          const newArray = Array.isArray(newTags)
                            ? newTags.map((t: Tag | string) => (typeof t === 'string' ? t : t.name))
                            : [];

                          const removed = oldArray.filter((t: string) => !newArray.includes(t));
                          const added = newArray.filter((t: string) => !oldArray.includes(t));

                          if (removed.length === 0 && added.length === 0) {
                            return (
                              <Typography variant="body2" color="text.secondary">
                                Brak zmian w tagach
                              </Typography>
                            );
                          }

                          return (
                            <Stack spacing={1}>
                              {removed.length > 0 && (
                                <Box>
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                                  >
                                    Usunięte tagi:
                                  </Typography>
                                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                    {removed.map((tag: string, idx: number) => (
                                      <Chip
                                        key={idx}
                                        label={tag}
                                        size="small"
                                        sx={{
                                          textDecoration: 'line-through',
                                          textDecorationColor: 'error.main',
                                          bgcolor: theme =>
                                            theme.palette.mode === 'dark'
                                              ? 'rgba(211, 47, 47, 0.2)'
                                              : 'rgba(211, 47, 47, 0.1)',
                                          color: 'error.main',
                                        }}
                                      />
                                    ))}
                                  </Stack>
                                </Box>
                              )}
                              {added.length > 0 && (
                                <Box>
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                                  >
                                    Dodane tagi:
                                  </Typography>
                                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                    {added.map((tag: string, idx: number) => (
                                      <Chip
                                        key={idx}
                                        label={tag}
                                        size="small"
                                        sx={{
                                          borderBottom: '2px solid',
                                          borderColor: 'success.main',
                                          bgcolor: theme =>
                                            theme.palette.mode === 'dark'
                                              ? 'rgba(46, 125, 50, 0.2)'
                                              : 'rgba(46, 125, 50, 0.1)',
                                          color: 'success.main',
                                        }}
                                      />
                                    ))}
                                  </Stack>
                                </Box>
                              )}
                            </Stack>
                          );
                        };

                        const renderTextDiff = (oldText: string, newText: string) => {
                          const oldLines = oldText.split('\n');
                          const newLines = newText.split('\n');

                          // Simple line-by-line comparison
                          const maxLines = Math.max(oldLines.length, newLines.length);
                          const changes: Array<{
                            line: number;
                            type: 'removed' | 'added' | 'changed' | 'unchanged';
                            old?: string;
                            new?: string;
                          }> = [];

                          for (let i = 0; i < maxLines; i++) {
                            const oldLine = oldLines[i];
                            const newLine = newLines[i];

                            if (oldLine === undefined && newLine !== undefined) {
                              changes.push({ line: i + 1, type: 'added', new: newLine });
                            } else if (oldLine !== undefined && newLine === undefined) {
                              changes.push({ line: i + 1, type: 'removed', old: oldLine });
                            } else if (oldLine !== newLine) {
                              changes.push({
                                line: i + 1,
                                type: 'changed',
                                old: oldLine,
                                new: newLine,
                              });
                            } else {
                              changes.push({
                                line: i + 1,
                                type: 'unchanged',
                                old: oldLine,
                                new: newLine,
                              });
                            }
                          }

                          const visibleChanges = changes.filter(c => c.type !== 'unchanged');

                          if (visibleChanges.length === 0) {
                            return (
                              <Typography variant="body2" color="text.secondary">
                                Brak zmian
                              </Typography>
                            );
                          }

                          return (
                            <Stack spacing={1}>
                              {visibleChanges.map((change, idx) => (
                                <Box key={idx}>
                                  {change.type === 'removed' && change.old && (
                                    <Box
                                      sx={{
                                        textDecoration: 'line-through',
                                        textDecorationColor: 'error.main',
                                        textDecorationThickness: '2px',
                                        color: 'error.main',
                                        bgcolor: theme =>
                                          theme.palette.mode === 'dark'
                                            ? 'rgba(211, 47, 47, 0.2)'
                                            : 'rgba(211, 47, 47, 0.1)',
                                        p: 1,
                                        borderRadius: 1,
                                        fontSize: '0.875rem',
                                        whiteSpace: 'pre-wrap',
                                      }}
                                    >
                                      {change.old}
                                    </Box>
                                  )}
                                  {change.type === 'added' && change.new && (
                                    <Box
                                      sx={{
                                        borderBottom: '2px solid',
                                        borderColor: 'success.main',
                                        color: 'success.main',
                                        bgcolor: theme =>
                                          theme.palette.mode === 'dark'
                                            ? 'rgba(46, 125, 50, 0.2)'
                                            : 'rgba(46, 125, 50, 0.1)',
                                        p: 1,
                                        borderRadius: 1,
                                        fontSize: '0.875rem',
                                        whiteSpace: 'pre-wrap',
                                      }}
                                    >
                                      {change.new}
                                    </Box>
                                  )}
                                  {change.type === 'changed' && change.old && change.new && (
                                    <Stack spacing={0.5}>
                                      <Box
                                        sx={{
                                          textDecoration: 'line-through',
                                          textDecorationColor: 'error.main',
                                          textDecorationThickness: '2px',
                                          color: 'error.main',
                                          bgcolor: theme =>
                                            theme.palette.mode === 'dark'
                                              ? 'rgba(211, 47, 47, 0.2)'
                                              : 'rgba(211, 47, 47, 0.1)',
                                          p: 1,
                                          borderRadius: 1,
                                          fontSize: '0.875rem',
                                          whiteSpace: 'pre-wrap',
                                        }}
                                      >
                                        {change.old}
                                      </Box>
                                      <Box
                                        sx={{
                                          borderBottom: '2px solid',
                                          borderColor: 'success.main',
                                          color: 'success.main',
                                          bgcolor: theme =>
                                            theme.palette.mode === 'dark'
                                              ? 'rgba(46, 125, 50, 0.2)'
                                              : 'rgba(46, 125, 50, 0.1)',
                                          p: 1,
                                          borderRadius: 1,
                                          fontSize: '0.875rem',
                                          whiteSpace: 'pre-wrap',
                                        }}
                                      >
                                        {change.new}
                                      </Box>
                                    </Stack>
                                  )}
                                </Box>
                              ))}
                            </Stack>
                          );
                        };

                        const renderSimpleDiff = (oldVal: unknown, newVal: unknown) => {
                          const oldStr =
                            oldVal === null || oldVal === undefined ? '(brak)' : String(oldVal);
                          const newStr =
                            newVal === null || newVal === undefined ? '(brak)' : String(newVal);

                          if (oldStr === newStr) {
                            return (
                              <Typography variant="body2" color="text.secondary">
                                Brak zmian
                              </Typography>
                            );
                          }

                          return (
                            <Stack spacing={1}>
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                                >
                                  Stare:
                                </Typography>
                                <Box
                                  sx={{
                                    textDecoration: 'line-through',
                                    textDecorationColor: 'error.main',
                                    textDecorationThickness: '2px',
                                    color: 'error.main',
                                    bgcolor: theme =>
                                      theme.palette.mode === 'dark'
                                        ? 'rgba(211, 47, 47, 0.2)'
                                        : 'rgba(211, 47, 47, 0.1)',
                                    p: 1,
                                    borderRadius: 1,
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  {oldStr}
                                </Box>
                              </Box>
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                                >
                                  Nowe:
                                </Typography>
                                <Box
                                  sx={{
                                    borderBottom: '2px solid',
                                    borderColor: 'success.main',
                                    color: 'success.main',
                                    bgcolor: theme =>
                                      theme.palette.mode === 'dark'
                                        ? 'rgba(46, 125, 50, 0.2)'
                                        : 'rgba(46, 125, 50, 0.1)',
                                    p: 1,
                                    borderRadius: 1,
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  {newStr}
                                </Box>
                              </Box>
                            </Stack>
                          );
                        };

                        const renderContent = () => {
                          if (field === 'verses') {
                            return renderVersesDiff(diff.old, diff.new);
                          } else if (field === 'tags') {
                            return renderTagsDiff(diff.old, diff.new);
                          } else if (field === 'lyricsXml') {
                            return renderTextDiff(String(diff.old || ''), String(diff.new || ''));
                          } else if (
                            typeof diff.old === 'string' &&
                            typeof diff.new === 'string' &&
                            (diff.old.includes('\n') || diff.new.includes('\n'))
                          ) {
                            return renderTextDiff(diff.old, diff.new);
                          } else {
                            return renderSimpleDiff(diff.old, diff.new);
                          }
                        };

                        return (
                          <Accordion key={field} defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {fieldLabels[field] || field}
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>{renderContent()}</AccordionDetails>
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

            <List>
              {versions.map((version: SongVersion, index: number) => (
                <Box key={version._id}>
                  <ListItem
                    button
                    selected={
                      selectedVersions[0] === version.version ||
                      selectedVersions[1] === version.version
                    }
                    onClick={() => handleSelectVersion(version.version)}
                    sx={{
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">Wersja {version.version}</Typography>
                          {index === 0 && <Chip label="Aktualna" size="small" color="primary" />}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(version.createdAt)}
                          </Typography>
                          {version.changedByUsername && (
                            <Typography variant="caption" color="text.secondary">
                              Zmienione przez: {version.changedByUsername}
                            </Typography>
                          )}
                          {version.changeReason && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Powód: {version.changeReason}
                            </Typography>
                          )}
                          {version.changes && Object.keys(version.changes).length > 0 && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                sx={{ mb: 0.5 }}
                              >
                                Zmienione pola: {Object.keys(version.changes).join(', ')}
                              </Typography>
                              <Button
                                size="small"
                                variant="text"
                                onClick={e => {
                                  e.stopPropagation();
                                  // Show diff for this version
                                  if (index > 0) {
                                    const previousVersion = versions[index - 1];
                                    setSelectedVersions([previousVersion.version, version.version]);
                                    setTimeout(() => {
                                      handleCompare();
                                    }, 100);
                                  }
                                }}
                                sx={{
                                  fontSize: '0.7rem',
                                  textTransform: 'none',
                                  minWidth: 'auto',
                                  px: 1,
                                  py: 0.25,
                                }}
                              >
                                Zobacz zmiany
                              </Button>
                            </Box>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        {index !== 0 && (
                          <IconButton
                            edge="end"
                            onClick={e => {
                              e.stopPropagation();
                              handleRestore(version.version);
                            }}
                            disabled={restoreVersion.isPending}
                            color="primary"
                            size="small"
                          >
                            <RestoreIcon />
                          </IconButton>
                        )}
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < versions.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Zamknij</Button>
      </DialogActions>
    </Dialog>
  );
}
