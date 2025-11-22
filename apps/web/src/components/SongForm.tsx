import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  Stack,
  Chip,
  Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import type { CreateSongDto, UpdateSongDto, SongResponseDto } from '@openlp/shared';

interface VerseFormData {
  order: number;
  content: string;
  label?: string | null;
}

interface SongFormData {
  title: string;
  number?: string | null;
  language: string;
  chorus?: string | null;
  verses: VerseFormData[];
  tags: string[];
}

interface SongFormProps {
  song?: SongResponseDto;
  onSubmit: (data: CreateSongDto | UpdateSongDto) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function SongForm({ song, onSubmit, onCancel, isLoading }: SongFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SongFormData>({
    defaultValues: {
      title: song?.title || '',
      number: song?.number || '',
      language: song?.language || 'en',
      chorus: song?.chorus || '',
      verses: song?.verses.map((v) => ({
        order: v.order,
        content: v.content,
        label: v.label,
      })) || [{ order: 1, content: '', label: null }],
      tags: song?.tags.map((t) => t.name) || [],
    },
  });

  const verses = watch('verses');

  const addVerse = () => {
    const newOrder = verses.length > 0 ? Math.max(...verses.map((v) => v.order)) + 1 : 1;
    setValue('verses', [...verses, { order: newOrder, content: '', label: null }]);
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
    onSubmit({
      title: data.title,
      number: data.number || null,
      language: data.language,
      chorus: data.chorus || null,
      verses: data.verses.map((v) => ({
        order: v.order,
        content: v.content,
        label: v.label || null,
      })),
      tags: data.tags,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmitForm)}>
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

        <Controller
          name="number"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Number (Hymnbook)"
              fullWidth
              placeholder="Optional"
            />
          )}
        />

        <Controller
          name="language"
          control={control}
          rules={{ required: 'Language is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Language"
              required
              fullWidth
              error={!!errors.language}
              helperText={errors.language?.message}
            />
          )}
        />

        <Controller
          name="chorus"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Chorus"
              fullWidth
              multiline
              rows={4}
              placeholder="Optional chorus text..."
            />
          )}
        />

        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Verses</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={addVerse}
              variant="outlined"
              size="small"
            >
              Add Verse
            </Button>
          </Box>

          <Stack spacing={2}>
            {verses.map((verse, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Verse {verse.order}
                    </Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => moveVerse(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUpward fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => moveVerse(index, 'down')}
                        disabled={index === verses.length - 1}
                      >
                        <ArrowDownward fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => removeVerse(index)}
                        disabled={verses.length === 1}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Controller
                    name={`verses.${index}.label`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Label (optional)"
                        placeholder="e.g., Verse 1, Bridge"
                        fullWidth
                        size="small"
                      />
                    )}
                  />

                  <Controller
                    name={`verses.${index}.content`}
                    control={control}
                    rules={{ required: 'Verse content is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Verse Content"
                        required
                        fullWidth
                        multiline
                        rows={4}
                        error={!!errors.verses?.[index]?.content}
                        helperText={errors.verses?.[index]?.content?.message}
                      />
                    )}
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>

        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={field.value}
              onChange={(_, newValue) => field.onChange(newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    {...getTagProps({ index })}
                    key={index}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Add tags (press Enter)"
                />
              )}
            />
          )}
        />

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
      </Stack>
    </Box>
  );
}

