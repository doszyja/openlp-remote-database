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
import type { CreateSongDto, UpdateSongDto, SongResponseDto } from '@openlp/shared';
import { parseVerses, combineVersesToXml, getVerseDisplayLabel, generateVerseOrderString, parseVerseOrderString, getVerseTypePrefix } from '../utils/verseParser';

interface VerseFormData {
  order: number;
  content: string;
  label?: string | null;
  type?: 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'tag';
  sourceId?: string; // Unique ID for source verse (for repetition support)
}

interface SongFormData {
  title: string;
  sourceVerses: VerseFormData[]; // Unique source verses (v1, v2, c1, c3)
  verseOrder: string; // Order string like "v1 v2 c1 c3 c1 v2 c1 v1"
}

interface SongFormProps {
  song?: SongResponseDto;
  onSubmit: (data: CreateSongDto | UpdateSongDto) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  hideButtons?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function SongForm({ song, onSubmit, onCancel, isLoading, hideButtons = false, onDirtyChange }: SongFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<SongFormData>({
    defaultValues: {
      title: '',
      sourceVerses: [{ order: 1, content: '', label: null, type: 'verse', sourceId: 'v1' }],
      verseOrder: 'v1',
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

  // Update form when song data loads or changes
  useEffect(() => {
    if (song) {
      // Handle both string and array formats from API
      let versesToParse: string | null = null;
      
      if (typeof song.verses === 'string') {
        versesToParse = song.verses;
      } else if (Array.isArray(song.verses)) {
        // Extract content from array format (legacy API response)
        // Type: Array<{ order: number; content: string; label: string | null }>
        const versesArray = song.verses as Array<{ order: number; content: string; label: string | null }>;
        if (versesArray.length > 0) {
          const firstItem = versesArray[0];
          if (firstItem && typeof firstItem === 'object' && 'content' in firstItem) {
            versesToParse = firstItem.content as string;
          }
        }
      }

      const parsedVerses = versesToParse && versesToParse.trim()
        ? parseVerses(versesToParse, song.verseOrder || null, (song as any).lyricsXml || null, (song as any).versesArray || null)
        : [{ order: 1, content: '', label: null, type: 'verse' as const }];

      // Extract unique source verses (deduplicate by label/type)
      // Use sourceId as key to properly identify unique verses
      const sourceVersesMap = new Map<string, VerseFormData>();
      parsedVerses.forEach(v => {
        const sourceId = v.label || `${getVerseTypePrefix(v.type)}${v.order}`;
        const key = `${v.type || 'verse'}-${sourceId}`;
        if (!sourceVersesMap.has(key)) {
          sourceVersesMap.set(key, {
            order: v.order,
            content: v.content,
            label: v.label ?? null,
            type: (v.type ?? 'verse') as VerseFormData['type'],
            sourceId: sourceId,
          });
        } else {
          // If verse with same key exists, update content if current has more content
          const existing = sourceVersesMap.get(key)!;
          if (v.content.trim().length > existing.content.trim().length) {
            existing.content = v.content;
          }
        }
      });

      const uniqueSourceVerses = Array.from(sourceVersesMap.values());
      
      // Generate order string from parsed verses (preserves execution order)
      const orderString = generateVerseOrderString(parsedVerses);

      console.log('Loading song:', {
        parsedVerses: parsedVerses.length,
        uniqueSourceVerses: uniqueSourceVerses.length,
        orderString,
      });

      reset({
        title: song.title || '',
        sourceVerses: uniqueSourceVerses,
        verseOrder: orderString,
      });
    }
  }, [song, reset]);

  // Update verse order string when source verses change (if order string is empty or matches current)
  useEffect(() => {
    if (!verseOrder || verseOrder.trim() === '') {
      const orderString = generateVerseOrderString(sourceVerses.map(v => ({
        order: v.order,
        content: v.content,
        label: v.label ?? null,
        type: v.type ?? 'verse',
      })));
      setValue('verseOrder', orderString);
    }
  }, [sourceVerses, verseOrder, setValue]);

  const addVerse = (type: VerseFormData['type'] = 'verse') => {
    const prefix = getVerseTypePrefix(type);
    const existingOfType = sourceVerses.filter(v => v.type === type);
    const newNumber = existingOfType.length > 0 
      ? Math.max(...existingOfType.map(v => {
          const label = v.label || '';
          const numMatch = label.match(/\d+/);
          return numMatch ? parseInt(numMatch[0], 10) : 0;
        })) + 1
      : 1;
    
    const newSourceId = `${prefix}${newNumber}`;
    const newOrder = sourceVerses.length > 0 ? Math.max(...sourceVerses.map((v) => v.order)) + 1 : 1;
    
    const newVerse: VerseFormData = {
      order: newOrder,
      content: '',
      label: newSourceId,
      type,
      sourceId: newSourceId,
    };
    
    setValue('sourceVerses', [...sourceVerses, newVerse]);
    
    // Automatically add to order string if it's empty, otherwise append
    const currentOrder = verseOrder.trim();
    if (currentOrder) {
      // Check if already in order string
      const orderPattern = new RegExp(`\\b${newSourceId}\\b`, 'i');
      if (!orderPattern.test(currentOrder)) {
        // Add to the end
        setValue('verseOrder', `${currentOrder} ${newSourceId}`, { shouldValidate: true });
      }
    } else {
      // If order string is empty, set it to just this verse
      setValue('verseOrder', newSourceId, { shouldValidate: true });
    }
  };

  const removeSourceVerse = (index: number) => {
    if (sourceVerses.length === 1) return;
    
    const verseToRemove = sourceVerses[index];
    const newSourceVerses = sourceVerses.filter((_, i) => i !== index);
    
    // Get the identifier to remove
    const verseId = verseToRemove.sourceId || verseToRemove.label || 
      `${getVerseTypePrefix(verseToRemove.type)}${verseToRemove.order}`;
    
    // Remove from order string
    const orderPattern = new RegExp(`\\b${verseId}\\b`, 'gi');
    const newOrder = verseOrder.replace(orderPattern, '').replace(/\s+/g, ' ').trim();
    
    setValue('sourceVerses', newSourceVerses);
    
    // If order string becomes empty, generate default order
    if (newOrder) {
      setValue('verseOrder', newOrder, { shouldValidate: true });
    } else {
      const defaultOrder = generateVerseOrderString(newSourceVerses.map(v => ({
        order: v.order,
        content: v.content,
        label: v.label ?? null,
        type: v.type ?? 'verse',
      })));
      setValue('verseOrder', defaultOrder, { shouldValidate: true });
    }
  };

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
      // No valid verses, submit empty
      onSubmit({
        title: data.title,
        verses: '',
      });
      return;
    }
    
    // Parse order string to get execution order
    let executionVerses;
    if (data.verseOrder.trim()) {
      try {
        executionVerses = parseVerseOrderString(
          data.verseOrder,
          validSourceVerses.map(v => ({
            order: v.order,
            content: v.content,
            label: v.label ?? null,
            type: v.type ?? 'verse',
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
        }));
      }
    } else {
      // No order string, use source verses in their order
      executionVerses = validSourceVerses.map(v => ({
        order: v.order,
        content: v.content,
        label: v.label ?? null,
        type: v.type ?? 'verse',
      }));
    }
    
    // Reorder based on execution sequence
    const versesToSave = executionVerses.map((v, index) => ({
      ...v,
      order: index + 1,
    }));
    
    // Convert to XML format to preserve OpenLP structure
    const versesXml = combineVersesToXml(versesToSave);
    
    console.log('Submitting verses:', {
      sourceVerses: validSourceVerses.length,
      sourceVersesData: validSourceVerses.map(v => ({ id: v.sourceId, label: v.label, type: v.type, hasContent: !!v.content.trim() })),
      verseOrder: data.verseOrder,
      executionVerses: executionVerses.length,
      executionVersesData: executionVerses.map(v => ({ order: v.order, label: v.label, type: v.type, hasContent: !!v.content.trim() })),
      versesXml: versesXml.substring(0, 200),
    });
    
      await onSubmit({
        title: data.title,
        verses: versesXml, // XML format string (preserves verse_order and labels)
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
          rules={{ required: 'Tytuł jest wymagany', minLength: { value: 1, message: 'Tytuł nie może być pusty' } }}
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
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  '&:hover': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  },
                  '&.Mui-focused': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  },
                },
                '& .MuiInputBase-input': {
                  fontSize: '16px', // Minimum 16px to prevent iOS zoom
                },
              }}
            />
          )}
        />

        <Controller
          name="verseOrder"
          control={control}
          rules={{
            validate: (value) => {
              if (!value || !value.trim()) {
                return 'Kolejność zwrotek jest wymagana';
              }
              
              // Check if all source verses are mentioned in the order
              const orderPattern = /([vcbpt])(\d+)/gi;
              const orderMatches = Array.from(value.matchAll(orderPattern));
              const mentionedVerses = new Set(orderMatches.map(m => `${m[1].toLowerCase()}${m[2]}`));
              
              // Get all source verse identifiers
              const sourceVerseIds = sourceVerses
                .filter(v => v.content.trim().length > 0) // Only check verses with content
                .map(v => {
                  if (v.sourceId) return v.sourceId.toLowerCase();
                  if (v.label) return v.label.toLowerCase();
                  const prefix = getVerseTypePrefix(v.type);
                  return `${prefix}${v.order}`;
                });
              
              // Find missing verses
              const missingVerses = sourceVerseIds.filter(id => !mentionedVerses.has(id));
              
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
              helperText={fieldState.error?.message || "Edytuj kolejność wykonania zwrotek (v=zwrotka, c=refren, b=mostek, p=przed-refren, t=tag). Wszystkie źródłowe zwrotki muszą być wymienione."}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  '&:hover': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  },
                  '&.Mui-focused': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  },
                },
                '& .MuiInputBase-input': {
                  fontSize: '16px', // Minimum 16px to prevent iOS zoom
                },
              }}
              onChange={(e) => {
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
                      console.warn(`Nie znaleziono niektórych zwrotek w ciągu kolejności. Znaleziono ${foundCount} z ${matches.length} zwrotek.`);
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
            <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>Źródłowe Zwrotki</Typography>
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
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.23)',
                  color: (theme) => theme.palette.mode === 'dark' ? '#E8EAF6' : 'inherit',
                  '&:hover': {
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
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
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : undefined,
                  color: (theme) => theme.palette.mode === 'dark' ? '#E8EAF6' : undefined,
                  '&:hover': {
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : undefined,
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : undefined,
                  },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 1.5 },
                }}
              >
                Refren
              </Button>
            </Stack>
          </Box>

          <Stack spacing={1.5}>
            {sourceVerses.map((verse, index) => (
              <Paper key={index} variant="outlined" sx={{ p: { xs: 1.25, sm: 1.5 } }}>
                <Stack spacing={1.5}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      {getVerseDisplayLabel({
                        order: verse.order,
                        content: verse.content,
                        label: verse.label ?? null,
                        type: verse.type ?? 'verse',
                      }, index)}
                    </Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => removeSourceVerse(index)}
                        disabled={sourceVerses.length === 1}
                        color="error"
                        title="Usuń źródłową zwrotkę"
                        sx={{ 
                          width: { xs: 32, sm: 40 },
                          height: { xs: 32, sm: 40 },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Controller
                    name={`sourceVerses.${index}.type`}
                    control={control}
                    render={({ field }) => (
                      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 }, width: { xs: '100%', sm: 'auto' } }}>
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
                          onChange={(e) => {
                            field.onChange(e);
                            // Update sourceId when type changes
                            const newType = e.target.value as VerseFormData['type'];
                            const prefix = getVerseTypePrefix(newType);
                            const existingOfType = sourceVerses.filter(v => v.type === newType && v !== verse);
                            const newNumber = existingOfType.length > 0 
                              ? Math.max(...existingOfType.map(v => {
                                  const label = v.label || '';
                                  const numMatch = label.match(/\d+/);
                                  return numMatch ? parseInt(numMatch[0], 10) : 0;
                                })) + 1
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
                          minRows={4}
                          rows={Math.max(4, rows)}
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
                              minHeight: '6rem', // Higher text area for easier editing
                              lineHeight: 1.5,
                              paddingTop: '10px',
                              paddingBottom: '10px',
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
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : undefined,
                  color: (theme) => theme.palette.mode === 'dark' ? '#E8EAF6' : undefined,
                  '&:hover': {
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : undefined,
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : undefined,
                  },
                }}
              >
                Anuluj
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading || isSubmitting}
            >
              {isLoading || isSubmitting ? 'Zapisywanie...' : song ? 'Aktualizuj Pieśń' : 'Utwórz Pieśń'}
            </Button>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

