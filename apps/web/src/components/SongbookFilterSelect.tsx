import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import type { SongbookSlug } from '@openlp/shared';
import { SONGBOOK_OPTIONS } from '../constants/songbookOptions';

type SongbookFilterSelectProps = {
  value: SongbookSlug[];
  onChange: (value: SongbookSlug[]) => void;
};

export default function SongbookFilterSelect({ value, onChange }: SongbookFilterSelectProps) {
  const handleChange = (event: SelectChangeEvent<SongbookSlug[]>) => {
    const next = event.target.value;
    onChange(typeof next === 'string' ? [] : next);
  };

  const handleRemove = (slug: SongbookSlug) => {
    onChange(value.filter(s => s !== slug));
  };

  return (
    <Box sx={{ width: '100%' }}>
      <FormControl size="small" fullWidth>
        <Select
          multiple
          displayEmpty
          value={value}
          onChange={handleChange}
          input={<OutlinedInput notched={false} />}
          renderValue={selected => {
            if (selected.length === 0) {
              return (
                <Typography variant="body2" color="text.secondary" component="span">
                  Śpiewniki
                </Typography>
              );
            }
            return (
              <Typography variant="body2" component="span">
                Śpiewniki ({selected.length})
              </Typography>
            );
          }}
          MenuProps={{
            PaperProps: {
              sx: { maxHeight: 320 },
            },
          }}
          sx={{
            '& .MuiSelect-select': {
              fontSize: '16px',
              py: { xs: 0.75, sm: 1 },
            },
          }}
        >
          {SONGBOOK_OPTIONS.map(option => (
            <MenuItem key={option.slug} value={option.slug} dense>
              <Checkbox checked={value.includes(option.slug)} size="small" sx={{ p: 0.5, mr: 1 }} />
              <ListItemText
                primary={option.label}
                primaryTypographyProps={{ fontSize: '0.95rem' }}
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {value.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
          {value.map(slug => {
            const option = SONGBOOK_OPTIONS.find(o => o.slug === slug);
            if (!option) {
              return null;
            }
            return (
              <Chip
                key={slug}
                label={option.label}
                size="small"
                onDelete={() => handleRemove(slug)}
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem', sm: '0.7rem' },
                  height: { xs: 28, sm: 24 },
                  bgcolor: option.color,
                  color: '#fff',
                  '& .MuiChip-deleteIcon': {
                    color: 'rgba(255, 255, 255, 0.85)',
                    '&:hover': {
                      color: '#fff',
                    },
                  },
                }}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}