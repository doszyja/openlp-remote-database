import { useForm, Controller } from 'react-hook-form';
import { useEffect, useState, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type {
  CreateSongDto,
  UpdateSongDto,
  SongResponseDto,
  VerseDto,
  SongbookSlug,
} from '@openlp/shared';
import {
  getVerseDisplayLabel,
  parseVerseOrderString,
  getVerseTypePrefix,
  normalizeVerseIdentifier,
  combineVersesToXml,
  type ParsedVerse,
} from '../utils/verseParser';
import { useSongFormData, type VerseFormData, type SongFormData } from '../hooks/useSongFormData';
import { useVerseManagement } from '../hooks/useVerseManagement';

// Songbook options with colors matching filter chips
const SONGBOOK_OPTIONS: { slug: SongbookSlug; label: string; color: string }[] = [
  { slug: 'pielgrzym', label: 'Pielgrzym', color: '#1976d2' },
  { slug: 'zielony', label: 'Zielony', color: '#388e3c' },
  { slug: 'wedrowiec', label: 'Wędrowiec', color: '#f57c00' },
  { slug: 'zborowe', label: 'Zborowe', color: '#7b1fa2' },
];

interface SongFormProps {
  song?: SongResponseDto;
  onSubmit: (data: CreateSongDto | UpdateSongDto) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  hideButtons?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function SongForm({
  song,
  onSubmit,
  onCancel,
  isLoading,
  hideButtons = false,
  onDirtyChange,
}: SongFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<SongFormData>({
    mode: 'onSubmit', // Validate only on submit to allow editing without blocking
    reValidateMode: 'onSubmit', // Re-validate only on submit
    defaultValues: {
      title: '',
      sourceVerses: [{ order: 1, content: '', label: null, type: 'verse', sourceId: 'v1' }],
      verseOrder: 'v1',
      songbook: null,
    },
  });

  // Track if form has been submitted to prevent false dirty warnings after save
  const hasSubmittedRef = useRef(false);

  // Warn user before leaving page if form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !hasSubmittedRef.current) {
        e.preventDefault();
        e.returnValue = 'Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Expose dirty state to parent component via callback
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  const sourceVerses = watch('sourceVerses');
  const verseOrder = watch('verseOrder');

  // Initialize form data and handle updates
  useSongFormData(song, reset, sourceVerses, verseOrder, setValue);

  // Manage verse operations (add, remove)
  const { addVerse, removeVerse: removeSourceVerse } = useVerseManagement(
    sourceVerses,
    verseOrder,
    setValue
  );

  const onSubmitForm = async (data: SongFormData) => {
    // Prevent double submission
    if (isSubmitting || isLoading) {
      return;
    }

    // Prevent empty update requests - only submit if form is dirty (for edit mode)
    if (song && !isDirty) {
      console.log('Form is not dirty, skipping submission');
      return;
    }

    setIsSubmitting(true);
    hasSubmittedRef.current = true; // Mark as submitted to prevent dirty warnings
    try {
      // Filter out empty source verses first
      const validSourceVerses = data.sourceVerses.filter(v => v.content.trim().length > 0);

      if (validSourceVerses.length === 0) {
        // No valid verses, submit empty array
        onSubmit({
          title: data.title,
          verses: [],
          songbook: data.songbook || null,
        });
        return;
      }

      // Parse order string to get execution order
      let executionVerses: ParsedVerse[];
      if (data.verseOrder.trim()) {
        try {
          executionVerses = parseVerseOrderString(
            data.verseOrder,
            validSourceVerses.map(v => ({
              order: v.order,
              content: v.content,
              label: v.label ?? null,
              type: v.type ?? 'verse',
              originalLabel: v.sourceId || undefined, // Pass sourceId as originalLabel for verseOrder matching
            }))
          );

          // Filter out any verses that couldn't be found (empty content)
          executionVerses = executionVerses.filter(v => v.content.trim().length > 0);
        } catch (error) {
          console.error('Error parsing verse order:', error);
          // Fallback to source verses in order
          executionVerses = validSourceVerses.map(v => ({
            order: v.order,
            content: v.content,
            label: v.label ?? null,
            type: v.type ?? 'verse',
            originalLabel: v.sourceId || undefined,
          }));
        }
      } else {
        // No order string, use source verses in their order
        executionVerses = validSourceVerses.map(v => ({
          order: v.order,
          content: v.content,
          label: v.label ?? null,
          type: v.type ?? 'verse',
          originalLabel: v.sourceId || undefined,
        }));
      }

      // Reorder based on execution sequence
      // Convert to VerseDto format (array of objects with order, content, label, originalLabel)
      // Note: We need to extract unique source verses for saving (backend stores unique verses only)
      // But we preserve originalLabel for each verse to match verseOrder
      const uniqueVersesMap = new Map<string, VerseDto>();
      executionVerses.forEach((v, index) => {
        const originalLabel =
          v.originalLabel ||
          normalizeVerseIdentifier(undefined, v.label, v.type ?? 'verse', index + 1);
        const key = originalLabel.toLowerCase();

        // Only keep first occurrence of each unique verse (by originalLabel)
        if (!uniqueVersesMap.has(key)) {
          uniqueVersesMap.set(key, {
            order: v.order,
            content: v.content.trim(),
            label: v.label || getVerseDisplayLabel(v, index) || undefined,
            originalLabel: originalLabel, // Include originalLabel for verseOrder matching
          });
        }
      });

      // Convert map to array, sorted by order
      const versesToSave: VerseDto[] = Array.from(uniqueVersesMap.values()).sort(
        (a, b) => a.order - b.order
      );

      // Generate lyricsXml from execution verses (preserves OpenLP XML format)
      // parseVerseOrderString returns ParsedVerse[] with originalLabel preserved
      // Map executionVerses to ParsedVerse format for combineVersesToXml
      const parsedVersesForXml = executionVerses.map((v, index) => ({
        order: index + 1,
        content: v.content.trim(),
        label: v.label ?? null,
        type: v.type ?? 'verse',
        originalLabel:
          v.originalLabel ||
          normalizeVerseIdentifier(undefined, v.label, v.type ?? 'verse', index + 1),
      }));
      const lyricsXml = combineVersesToXml(parsedVersesForXml);

      console.log('Submitting verses:', {
        sourceVerses: validSourceVerses.length,
        sourceVersesData: validSourceVerses.map(v => ({
          id: v.sourceId,
          label: v.label,
          type: v.type,
          hasContent: !!v.content.trim(),
        })),
        verseOrder: data.verseOrder,
        executionVerses: executionVerses.length,
        executionVersesData: executionVerses.map(v => ({
          order: v.order,
          label: v.label,
          type: v.type,
          hasContent: !!v.content.trim(),
        })),
        versesToSave: versesToSave.length,
        lyricsXml: lyricsXml.substring(0, 200),
      });

      await onSubmit({
        title: data.title,
        verses: versesToSave, // Array of VerseDto objects (order, content, label)
        verseOrder: data.verseOrder || null, // verse_order string (e.g., "v1 c1 v2 c1 v3 c1 v4 c1 v5 c1")
        lyricsXml: lyricsXml || null, // XML format string (preserves verse_order and labels)
        songbook: data.songbook || null, // Songbook category
      });
      // Reset dirty state after successful submission
      reset(data, { keepValues: true });
      hasSubmittedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" id="song-form" onSubmit={handleSubmit(onSubmitForm)}>
      <Stack spacing={3}>
        <Controller
          name="title"
          control={control}
          rules={{
            required: 'Tytuł jest wymagany',
            minLength: { value: 1, message: 'Tytuł nie może być pusty' },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Tytuł Pieśni"
              required
              fullWidth
              error={!!errors.title}
              helperText={errors.title?.message}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: theme =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.02)',
                  '&:hover': {
                    bgcolor: theme =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.04)',
                  },
                  '&.Mui-focused': {
                    bgcolor: theme =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.04)',
                  },
                },
                '& .MuiInputBase-input': {
                  fontSize: '16px', // Minimum 16px to prevent iOS zoom
                },
              }}
            />
          )}
        />

        {/* Songbook selection - only shown when creating new song */}
        {!song && (
          <Controller
            name="songbook"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Śpiewnik</InputLabel>
                <Select
                  {...field}
                  value={field.value || ''}
                  label="Śpiewnik"
                  onChange={e => field.onChange(e.target.value || null)}
                >
                  <MenuItem value="">
                    <em>Brak</em>
                  </MenuItem>
                  {SONGBOOK_OPTIONS.map(option => (
                    <MenuItem key={option.slug} value={option.slug}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: option.color,
                            flexShrink: 0,
                          }}
                        />
                        <span>{option.label}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        )}

        <Controller
          name="verseOrder"
          control={control}
          rules={{
            validate: value => {
              if (!value || !value.trim()) {
                return 'Kolejność zwrotek jest wymagana';
              }

              // Get all source verse identifiers (always in format v1, c1, etc.)
              const sourceVerseIds = new Set(
                sourceVerses
                  .filter(v => v.content.trim().length > 0) // Only check verses with content
                  .map(v => normalizeVerseIdentifier(v.sourceId, v.label, v.type, v.order))
              );

              // Check if all verses mentioned in order exist in sourceVerses
              const orderPattern = /([vcbpt])(\d+)/gi;
              const orderMatches = Array.from(value.matchAll(orderPattern));
              const mentionedVerses = new Set(
                orderMatches.map(m => `${m[1].toLowerCase()}${m[2]}`)
              );

              // Find verses in order that don't exist in sourceVerses
              const nonExistentVerses = Array.from(mentionedVerses).filter(
                id => !sourceVerseIds.has(id)
              );

              if (nonExistentVerses.length > 0) {
                return `Następujące zwrotki nie istnieją w źródłowych zwrotkach: ${nonExistentVerses.join(', ')}`;
              }

              // Check if all source verses are mentioned in the order
              const missingVerses = Array.from(sourceVerseIds).filter(
                id => !mentionedVerses.has(id)
              );

              if (missingVerses.length > 0) {
                return `Następujące zwrotki nie są wymienione w kolejności: ${missingVerses.join(', ')}`;
              }

              // Validate format
              try {
                parseVerseOrderString(
                  value,
                  sourceVerses.map(v => ({
                    order: v.order,
                    content: v.content,
                    label: v.label ?? null,
                    type: v.type ?? 'verse',
                    originalLabel: normalizeVerseIdentifier(v.sourceId, v.label, v.type, v.order),
                  }))
                );
              } catch (error) {
                return `Nieprawidłowy format kolejności zwrotek: ${error instanceof Error ? error.message : 'Nieznany błąd'}`;
              }

              return true;
            },
          }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Kolejność Zwrotek"
              fullWidth
              placeholder="np. v1 v2 c1 c3 c1 v2 c1 v1"
              error={!!fieldState.error}
              helperText={
                fieldState.error?.message ||
                'Edytuj kolejność wykonania zwrotek (v=zwrotka, c=refren, b=mostek, p=przed-refren, t=tag). Wszystkie źródłowe zwrotki muszą być wymienione.'
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: theme =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.02)',
                  '&:hover': {
                    bgcolor: theme =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.04)',
                  },
                  '&.Mui-focused': {
                    bgcolor: theme =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.04)',
                  },
                },
                '& .MuiInputBase-input': {
                  fontSize: '16px', // Minimum 16px to prevent iOS zoom
                },
              }}
              onChange={e => {
                const orderString = e.target.value;
                field.onChange(orderString);

                // Additional real-time validation feedback
                if (orderString.trim()) {
                  try {
                    const testVerses = parseVerseOrderString(
                      orderString,
                      sourceVerses.map(v => ({
                        order: v.order,
                        content: v.content,
                        label: v.label ?? null,
                        type: v.type ?? 'verse',
                      }))
                    );

                    // Check if all referenced verses exist
                    const orderPattern = /([vcbpt])(\d+)/gi;
                    const matches = Array.from(orderString.matchAll(orderPattern));
                    const foundCount = testVerses.filter(v => v.content.trim().length > 0).length;

                    if (foundCount < matches.length) {
                      // This is just a warning, not blocking
                      console.warn(
                        `Nie znaleziono niektórych zwrotek w ciągu kolejności. Znaleziono ${foundCount} z ${matches.length} zwrotek.`
                      );
                    }
                  } catch (error) {
                    // Format error will be caught by form validation
                    console.warn('Błąd formatu kolejności zwrotek:', error);
                  }
                }
              }}
            />
          )}
        />

        <Box>
          <Box
            display="flex"
            flexDirection={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            mb={2}
            gap={{ xs: 1.5, sm: 0 }}
          >
            <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Źródłowe Zwrotki
            </Typography>
            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="wrap"
              sx={{
                width: { xs: '100%', sm: 'auto' },
                gap: { xs: 0.5, sm: 0.75 },
                '& > *': {
                  flex: { xs: '0 1 auto', sm: 'none' },
                  minWidth: { xs: 'min-content', sm: 'auto' },
                },
              }}
            >
              <Button
                startIcon={<AddIcon />}
                onClick={() => addVerse('verse')}
                variant="outlined"
                size="small"
                sx={{
                  borderColor: theme =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.3)'
                      : 'rgba(0, 0, 0, 0.23)',
                  color: theme => (theme.palette.mode === 'dark' ? '#E8EAF6' : 'inherit'),
                  '&:hover': {
                    borderColor: theme =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.5)'
                        : 'rgba(0, 0, 0, 0.4)',
                    backgroundColor: theme =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.04)',
                  },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 1.5 },
                }}
              >
                Zwrotkę
              </Button>
              <Button
                startIcon={<AddIcon />}
                onClick={() => addVerse('chorus')}
                variant="outlined"
                size="small"
                color="secondary"
                sx={{
                  borderColor: theme =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : undefined,
                  color: theme => (theme.palette.mode === 'dark' ? '#E8EAF6' : undefined),
                  '&:hover': {
                    borderColor: theme =>
                      theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : undefined,
                    backgroundColor: theme =>
                      theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : undefined,
                  },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 1.5 },
                }}
              >
                Refren
              </Button>
            </Stack>
          </Box>

          <Stack spacing={1}>
            {sourceVerses.map((verse, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{
                  p: { xs: 0.75, sm: 1 },
                  position: 'relative',
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.8rem' },
                    bgcolor: 'background.paper',
                    px: 0.5,
                    marginBottom: '16px',
                    zIndex: 1,
                  }}
                >
                  {getVerseDisplayLabel(
                    {
                      order: verse.order,
                      content: verse.content,
                      label: verse.label ?? null,
                      type: verse.type ?? 'verse',
                    },
                    index
                  )}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    if (window.confirm('Czy na pewno chcesz usunąć tę zwrotkę?')) {
                      removeSourceVerse(index);
                    }
                  }}
                  disabled={sourceVerses.length === 1}
                  color="error"
                  title="Usuń źródłową zwrotkę"
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: { xs: 24, sm: 28 },
                    height: { xs: 24, sm: 28 },
                    bgcolor: 'background.paper',
                    zIndex: 1,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
                <Stack spacing={1}>
                  <Controller
                    name={`sourceVerses.${index}.type`}
                    control={control}
                    render={({ field }) => (
                      <FormControl
                        size="small"
                        sx={{
                          minWidth: { xs: '100%', sm: 140 },
                          width: { xs: '100%', sm: 'auto' },
                        }}
                      >
                        <InputLabel>Typ</InputLabel>
                        <Select
                          {...field}
                          label="Typ"
                          value={field.value || 'verse'}
                          sx={{
                            '& .MuiSelect-select': {
                              fontSize: '16px', // Minimum 16px to prevent iOS zoom
                            },
                          }}
                          onChange={e => {
                            field.onChange(e);
                            // Update sourceId when type changes
                            const newType = e.target.value as VerseFormData['type'];
                            const prefix = getVerseTypePrefix(newType);
                            const existingOfType = sourceVerses.filter(
                              v => v.type === newType && v !== verse
                            );
                            const newNumber =
                              existingOfType.length > 0
                                ? Math.max(
                                    ...existingOfType.map(v => {
                                      const label = v.label || '';
                                      const numMatch = label.match(/\d+/);
                                      return numMatch ? parseInt(numMatch[0], 10) : 0;
                                    })
                                  ) + 1
                                : 1;
                            const newSourceId = `${prefix}${newNumber}`;
                            setValue(`sourceVerses.${index}.sourceId`, newSourceId);
                            setValue(`sourceVerses.${index}.label`, newSourceId);
                          }}
                        >
                          <MenuItem value="verse">Zwrotka</MenuItem>
                          <MenuItem value="chorus">Refren</MenuItem>
                          <MenuItem value="bridge">Mostek</MenuItem>
                          <MenuItem value="pre-chorus">Przed-Refren</MenuItem>
                          <MenuItem value="tag">Tag</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />

                  <Controller
                    name={`sourceVerses.${index}.content`}
                    control={control}
                    rules={{ required: 'Treść zwrotki jest wymagana' }}
                    render={({ field }) => {
                      const value = field.value || '';
                      const lineCount = value.split('\n').length;
                      const rows = Math.max(1, Math.min(lineCount, 2)); // Min 2, max 4, or actual line count

                      return (
                        <TextField
                          {...field}
                          label="Treść"
                          required
                          fullWidth
                          multiline
                          minRows={2}
                          rows={Math.max(2, rows)}
                          placeholder="Wprowadź treść zwrotki..."
                          error={!!errors.sourceVerses?.[index]?.content}
                          helperText={errors.sourceVerses?.[index]?.content?.message}
                          value={value}
                          sx={{
                            '& .MuiInputBase-root': {
                              fontSize: '16px', // Always 16px to prevent iOS zoom
                            },
                            '& .MuiInputBase-input': {
                              fontSize: '16px', // Minimum 16px to prevent iOS zoom
                              minHeight: '5rem', // Compact text area
                              lineHeight: 1.5,
                              paddingTop: '8px',
                              paddingBottom: '8px',
                            },
                          }}
                        />
                      );
                    }}
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>

        {!hideButtons && (
          <Box display="flex" gap={2} justifyContent="flex-end">
            {onCancel && (
              <Button
                onClick={onCancel}
                disabled={isLoading}
                variant="outlined"
                sx={{
                  borderColor: theme =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : undefined,
                  color: theme => (theme.palette.mode === 'dark' ? '#E8EAF6' : undefined),
                  '&:hover': {
                    borderColor: theme =>
                      theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : undefined,
                    backgroundColor: theme =>
                      theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : undefined,
                  },
                }}
              >
                Anuluj
              </Button>
            )}
            <Button type="submit" variant="contained" disabled={isLoading || isSubmitting}>
              {isLoading || isSubmitting
                ? 'Zapisywanie...'
                : song
                  ? 'Aktualizuj Pieśń'
                  : 'Utwórz Pieśń'}
            </Button>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
