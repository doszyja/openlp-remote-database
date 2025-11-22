import { useForm, Controller } from 'react-hook-form';
import { useEffect, useState } from 'react';
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
import { Add as AddIcon, Delete as DeleteIcon, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import type { CreateSongDto, UpdateSongDto, SongResponseDto } from '@openlp/shared';
import { parseVerses, combineVersesToXml, getVerseDisplayLabel, generateVerseOrderString, parseVerseOrderString } from '../utils/verseParser';
import { useNotification } from '../contexts/NotificationContext';

interface VerseFormData {
  order: number;
  content: string;
  label?: string | null;
  type?: 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'tag';
}

interface SongFormData {
  title: string;
  verses: VerseFormData[]; // Visual verses for editing (will be combined to string on save)
}

interface SongFormProps {
  song?: SongResponseDto;
  onSubmit: (data: CreateSongDto | UpdateSongDto) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  hideButtons?: boolean;
}

export default function SongForm({ song, onSubmit, onCancel, isLoading, hideButtons = false }: SongFormProps) {
  const { showError } = useNotification();
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<SongFormData>({
    defaultValues: {
      title: '',
      verses: [{ order: 1, content: '', label: null, type: 'verse' }],
    },
  });

  const verses = watch('verses');
  const [verseOrderString, setVerseOrderString] = useState('');

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
        ? parseVerses(versesToParse).map(v => ({
            order: v.order,
            content: v.content,
            label: v.label ?? null,
            type: (v.type ?? 'verse') as VerseFormData['type'],
          }))
        : [{ order: 1, content: '', label: null, type: 'verse' as const }];

      reset({
        title: song.title || '',
        verses: parsedVerses,
      });

      // Update verse order string
      setVerseOrderString(generateVerseOrderString(parsedVerses.map(v => ({
        order: v.order,
        content: v.content,
        label: v.label ?? null,
        type: v.type ?? 'verse',
      }))));
    }
  }, [song, reset]);

  // Update verse order string when verses change
  useEffect(() => {
    const orderString = generateVerseOrderString(verses.map(v => ({
      order: v.order,
      content: v.content,
      label: v.label ?? null,
      type: v.type ?? 'verse',
    })));
    setVerseOrderString(orderString);
  }, [verses]);

  const addVerse = (type: VerseFormData['type'] = 'verse') => {
    const newOrder = verses.length > 0 ? Math.max(...verses.map((v) => v.order)) + 1 : 1;
    setValue('verses', [...verses, { order: newOrder, content: '', label: null, type }]);
  };

  const removeVerse = (index: number) => {
    const newVerses = verses.filter((_, i) => i !== index);
    // Reorder verses
    newVerses.forEach((verse, i) => {
      verse.order = i + 1;
    });
    setValue('verses', newVerses);
  };

  const moveVerse = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === verses.length - 1)
    ) {
      return;
    }

    const newVerses = [...verses];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newVerses[index], newVerses[targetIndex]] = [newVerses[targetIndex], newVerses[index]];

    // Update orders
    newVerses.forEach((verse, i) => {
      verse.order = i + 1;
    });

    setValue('verses', newVerses);
  };

  const onSubmitForm = (data: SongFormData) => {
    // Combine visual verses into XML format for storage
    // IMPORTANT: Sort by order (verse_order) to preserve OpenLP verse_order
    // The sequence in the XML corresponds to verse_order in OpenLP SQLite
    const versesToSave = data.verses
      .filter(v => v.content.trim().length > 0)
      .sort((a, b) => a.order - b.order); // Sort by verse_order
    
    // Convert to XML format to preserve OpenLP structure
    const versesXml = combineVersesToXml(versesToSave.map(v => ({
      order: v.order, // verse_order from OpenLP
      content: v.content,
      label: v.label ?? null,
      type: v.type ?? 'verse',
    })));
    
    onSubmit({
      title: data.title,
      verses: versesXml, // XML format string (preserves verse_order and labels)
    });
  };

  return (
    <Box component="form" id="song-form" onSubmit={handleSubmit(onSubmitForm)}>
      <Stack spacing={3}>
        <Controller
          name="title"
          control={control}
          rules={{ required: 'Title is required', minLength: { value: 1, message: 'Title cannot be empty' } }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Song Title"
              required
              fullWidth
              error={!!errors.title}
              helperText={errors.title?.message}
            />
          )}
        />

        <TextField
          label="Verse Order"
          value={verseOrderString}
          onChange={(e) => {
            const orderString = e.target.value;
            setVerseOrderString(orderString);
            
            if (orderString.trim()) {
              try {
                const updatedVerses = parseVerseOrderString(
                  orderString,
                  verses.map(v => ({
                    order: v.order,
                    content: v.content,
                    label: v.label ?? null,
                    type: v.type ?? 'verse',
                  }))
                );
                
                // Validate that we found verses for all tokens
                const orderPattern = /([vcbpt])(\d+)/gi;
                const matches = Array.from(orderString.matchAll(orderPattern));
                const foundCount = updatedVerses.filter(v => v.content.trim().length > 0).length;
                
                if (foundCount < matches.length) {
                  showError(`Some verses in the order string were not found. Found ${foundCount} of ${matches.length} verses.`);
                }
                
                // Update form with new orders
                setValue('verses', updatedVerses.map(v => ({
                  order: v.order,
                  content: v.content,
                  label: v.label ?? null,
                  type: v.type ?? 'verse',
                })));
              } catch (error) {
                showError(`Invalid verse order format: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
          }}
          fullWidth
          placeholder="e.g., v1 c1 v2 c1 v3 c1 v4 c1"
          helperText="Edit verse order (v=verse, c=chorus, b=bridge, p=pre-chorus, t=tag)"
        />

        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Verses</Typography>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<AddIcon />}
                onClick={() => addVerse('verse')}
                variant="outlined"
                size="small"
              >
                Add Verse
              </Button>
              <Button
                startIcon={<AddIcon />}
                onClick={() => addVerse('chorus')}
                variant="outlined"
                size="small"
                color="secondary"
              >
                Add Chorus
              </Button>
              <Button
                startIcon={<AddIcon />}
                onClick={() => addVerse('bridge')}
                variant="outlined"
                size="small"
                color="secondary"
              >
                Add Bridge
              </Button>
            </Stack>
          </Box>

          <Stack spacing={2}>
            {verses.map((verse, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
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
                        onClick={() => moveVerse(index, 'up')}
                        disabled={index === 0}
                        title="Move up"
                      >
                        <ArrowUpward fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => moveVerse(index, 'down')}
                        disabled={index === verses.length - 1}
                        title="Move down"
                      >
                        <ArrowDownward fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => removeVerse(index)}
                        disabled={verses.length === 1}
                        color="error"
                        title="Delete verse"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Controller
                    name={`verses.${index}.type`}
                    control={control}
                    render={({ field }) => (
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                          {...field}
                          label="Type"
                          value={field.value || 'verse'}
                        >
                          <MenuItem value="verse">Verse</MenuItem>
                          <MenuItem value="chorus">Chorus</MenuItem>
                          <MenuItem value="bridge">Bridge</MenuItem>
                          <MenuItem value="pre-chorus">Pre-Chorus</MenuItem>
                          <MenuItem value="tag">Tag</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />

                  <Controller
                    name={`verses.${index}.content`}
                    control={control}
                    rules={{ required: 'Verse content is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Content"
                        required
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Enter verse content..."
                        error={!!errors.verses?.[index]?.content}
                        helperText={errors.verses?.[index]?.content?.message}
                        value={field.value || ''}
                      />
                    )}
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>

        {!hideButtons && (
          <Box display="flex" gap={2} justifyContent="flex-end">
            {onCancel && (
              <Button onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : song ? 'Update Song' : 'Create Song'}
            </Button>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

