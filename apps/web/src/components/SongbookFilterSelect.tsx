import {
  Badge,
  Box,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Tooltip,
  Typography,
} from '@mui/material';
import { MenuBook as MenuBookIcon } from '@mui/icons-material';
import type { SongbookSlug } from '@openlp/shared';
import { SONGBOOK_OPTIONS } from '../constants/songbookOptions';

type SongbookFilterSelectProps = {
  value: SongbookSlug[];
  onChange: (value: SongbookSlug[]) => void;
  /** Full-width select (desktop) vs compact trigger on the right (mobile toolbar). */
  variant?: 'select' | 'button';
};

export default function SongbookFilterSelect({
  value,
  onChange,
  variant = 'select',
}: SongbookFilterSelectProps) {
  const handleChange = (event: SelectChangeEvent<SongbookSlug[]>) => {
    const next = event.target.value;
    onChange(typeof next === 'string' ? [] : next);
  };

  const handleRemove = (slug: SongbookSlug) => {
    onChange(value.filter(s => s !== slug));
  };

  const filterTooltip =
    value.length === 0
      ? 'Śpiewniki — wybierz z listy'
      : value.length === 1
        ? '1 śpiewnik wybrany'
        : `${value.length} śpiewniki wybrane`;

  const selectMenuItems = (
    <>
      {SONGBOOK_OPTIONS.map(option => (
        <MenuItem key={option.slug} value={option.slug} dense>
          <Checkbox checked={value.includes(option.slug)} size="small" sx={{ p: 0.5, mr: 1 }} />
          <ListItemText
            primary={option.label}
            primaryTypographyProps={{ fontSize: '0.95rem' }}
          />
        </MenuItem>
      ))}
      {value.length > 0 ? (
        <>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            dense
            onMouseDown={e => e.preventDefault()}
            onClick={e => {
              e.stopPropagation();
              onChange([]);
            }}
            sx={{ justifyContent: 'center', color: 'text.secondary', fontSize: '0.85rem' }}
          >
            Wyczyść filtr
          </MenuItem>
        </>
      ) : null}
    </>
  );

  const menuProps = {
    PaperProps: { sx: { maxHeight: 320, minWidth: 220 } },
    anchorOrigin: { vertical: 'bottom' as const, horizontal: 'right' as const },
    transformOrigin: { vertical: 'top' as const, horizontal: 'right' as const },
  };

  if (variant === 'button') {
    return (
      <Tooltip title={filterTooltip}>
        <FormControl size="small" sx={{ flexShrink: 0, width: 'auto' }}>
          <Select
            multiple
            displayEmpty
            value={value}
            onChange={handleChange}
            input={<OutlinedInput notched={false} />}
            renderValue={() => (
              <Badge
                badgeContent={value.length || undefined}
                color="primary"
                overlap="circular"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    height: 16,
                    minWidth: 16,
                    px: 0.5,
                  },
                }}
              >
                <MenuBookIcon sx={{ fontSize: 22, display: 'block' }} />
              </Badge>
            )}
            MenuProps={menuProps}
            aria-label={filterTooltip}
            sx={{
              '& .MuiSelect-select': {
                py: '7px',
                pl: 1,
                pr: '28px !important',
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme =>
                  value.length > 0
                    ? theme.palette.primary.main
                    : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.23)'
                      : 'rgba(0, 0, 0, 0.23)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: theme =>
                  value.length > 0 ? theme.palette.primary.main : theme.palette.text.secondary,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderWidth: 1,
              },
            }}
          >
            {selectMenuItems}
          </Select>
        </FormControl>
      </Tooltip>
    );
  }

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
          MenuProps={menuProps}
          sx={{
            '& .MuiSelect-select': {
              fontSize: '16px',
              py: { xs: 0.75, sm: 1 },
            },
          }}
        >
          {selectMenuItems}
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