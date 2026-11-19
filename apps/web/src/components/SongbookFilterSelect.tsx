import { useState, type MouseEvent } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  ListItemText,
  Menu,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import { ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';
import type { SongbookSlug } from '@openlp/shared';
import { SONGBOOK_OPTIONS } from '../constants/songbookOptions';

type SongbookFilterSelectProps = {
  value: SongbookSlug[];
  onChange: (value: SongbookSlug[]) => void;
  /** Full-width select (desktop) vs compact trigger on the right (mobile toolbar). */
  variant?: 'select' | 'button';
};

function SongbookOptionMenuItems({
  value,
  onToggle,
}: {
  value: SongbookSlug[];
  onToggle: (slug: SongbookSlug) => void;
}) {
  return (
    <>
      {SONGBOOK_OPTIONS.map(option => (
        <MenuItem
          key={option.slug}
          dense
          onClick={() => onToggle(option.slug)}
          sx={{ py: 0.75 }}
        >
          <Checkbox checked={value.includes(option.slug)} size="small" sx={{ p: 0.5, mr: 1 }} />
          <ListItemText
            primary={option.label}
            primaryTypographyProps={{ fontSize: '0.95rem' }}
          />
        </MenuItem>
      ))}
    </>
  );
}

export default function SongbookFilterSelect({
  value,
  onChange,
  variant = 'select',
}: SongbookFilterSelectProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchor);

  const handleChange = (event: SelectChangeEvent<SongbookSlug[]>) => {
    const next = event.target.value;
    onChange(typeof next === 'string' ? [] : next);
  };

  const handleRemove = (slug: SongbookSlug) => {
    onChange(value.filter(s => s !== slug));
  };

  const toggleSlug = (slug: SongbookSlug) => {
    if (value.includes(slug)) {
      onChange(value.filter(s => s !== slug));
    } else {
      onChange([...value, slug]);
    }
  };

  const buttonLabel =
    value.length === 0 ? 'Śpiewniki' : value.length === 1 ? 'Śpiewnik' : `Śpiewniki (${value.length})`;

  if (variant === 'button') {
    return (
      <>
        <Button
          id="songbook-filter-button"
          aria-controls={menuOpen ? 'songbook-filter-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={menuOpen ? 'true' : undefined}
          variant={value.length > 0 ? 'contained' : 'outlined'}
          size="small"
          onClick={(e: MouseEvent<HTMLButtonElement>) => setMenuAnchor(e.currentTarget)}
          endIcon={<ArrowDropDownIcon />}
          sx={{
            flexShrink: 0,
            minWidth: 0,
            px: 1.25,
            py: 0.75,
            fontSize: '0.8125rem',
            whiteSpace: 'nowrap',
            maxWidth: { xs: 112, sm: 140 },
            '& .MuiButton-endIcon': { ml: 0.25 },
          }}
        >
          {buttonLabel}
        </Button>
        <Menu
          id="songbook-filter-menu"
          anchorEl={menuAnchor}
          open={menuOpen}
          onClose={() => setMenuAnchor(null)}
          MenuListProps={{ 'aria-labelledby': 'songbook-filter-button', dense: true }}
          PaperProps={{ sx: { maxHeight: 320, minWidth: 220 } }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <SongbookOptionMenuItems value={value} onToggle={toggleSlug} />
          {value.length > 0 ? (
            <MenuItem
              dense
              onClick={() => {
                onChange([]);
              }}
              sx={{ justifyContent: 'center', color: 'text.secondary', fontSize: '0.85rem' }}
            >
              Wyczyść filtr
            </MenuItem>
          ) : null}
        </Menu>
      </>
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