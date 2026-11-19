import { useState, type MouseEvent } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Popover,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import {
  ArrowDropDown as ArrowDropDownIcon,
  MenuBook as MenuBookIcon,
} from '@mui/icons-material';
import type { SongbookSlug } from '@openlp/shared';
import { SONGBOOK_OPTIONS } from '../constants/songbookOptions';

type SongbookFilterSelectProps = {
  value: SongbookSlug[];
  onChange: (value: SongbookSlug[]) => void;
  /** Full-width select (desktop) vs compact trigger on the right (mobile toolbar). */
  variant?: 'select' | 'button';
};

const optionCheckboxSx = {
  p: 0.5,
  pointerEvents: 'none' as const,
};

function SongbookOptionRows({
  value,
  onToggle,
  onClear,
}: {
  value: SongbookSlug[];
  onToggle: (slug: SongbookSlug) => void;
  onClear: () => void;
}) {
  return (
    <>
      {SONGBOOK_OPTIONS.map(option => (
        <ListItemButton
          key={option.slug}
          dense
          onClick={() => onToggle(option.slug)}
          selected={value.includes(option.slug)}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Checkbox
              checked={value.includes(option.slug)}
              size="small"
              disableRipple
              tabIndex={-1}
              sx={optionCheckboxSx}
            />
          </ListItemIcon>
          <ListItemText
            primary={option.label}
            primaryTypographyProps={{ fontSize: '0.95rem' }}
          />
        </ListItemButton>
      ))}
      {value.length > 0 ? (
        <>
          <Divider />
          <ListItemButton dense onClick={onClear} sx={{ justifyContent: 'center' }}>
            <ListItemText
              primary="Wyczyść filtr"
              primaryTypographyProps={{
                fontSize: '0.85rem',
                color: 'text.secondary',
                textAlign: 'center',
              }}
            />
          </ListItemButton>
        </>
      ) : null}
    </>
  );
}

export default function SongbookFilterSelect({
  value,
  onChange,
  variant = 'select',
}: SongbookFilterSelectProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(anchorEl);

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

  const selectMenuItems = SONGBOOK_OPTIONS.map(option => (
    <MenuItem key={option.slug} value={option.slug} dense>
      <Checkbox
        checked={value.includes(option.slug)}
        size="small"
        disableRipple
        tabIndex={-1}
        sx={{ mr: 1, ...optionCheckboxSx }}
      />
      <ListItemText primary={option.label} primaryTypographyProps={{ fontSize: '0.95rem' }} />
    </MenuItem>
  ));

  const menuProps = {
    PaperProps: { sx: { maxHeight: 320, minWidth: 220 } },
    anchorOrigin: { vertical: 'bottom' as const, horizontal: 'right' as const },
    transformOrigin: { vertical: 'top' as const, horizontal: 'right' as const },
  };

  if (variant === 'button') {
    return (
      <>
        <Button
          variant="outlined"
          size="small"
          aria-haspopup="listbox"
          aria-expanded={menuOpen ? 'true' : undefined}
          aria-label="Filtr śpiewników"
          onClick={(e: MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget)}
          endIcon={<ArrowDropDownIcon fontSize="small" />}
          sx={{
            flexShrink: 0,
            minWidth: 0,
            px: 0.75,
            py: '5px',
            borderColor: theme =>
              value.length > 0
                ? theme.palette.primary.main
                : theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.23)'
                  : 'rgba(0, 0, 0, 0.23)',
            color: theme => (value.length > 0 ? theme.palette.primary.main : undefined),
          }}
        >
          <Badge
            badgeContent={value.length || undefined}
            color="primary"
            overlap="circular"
            sx={{
              mr: 0.25,
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
        </Button>
        <Popover
          open={menuOpen}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={menuProps.anchorOrigin}
          transformOrigin={menuProps.transformOrigin}
          slotProps={{
            paper: {
              sx: { maxHeight: 320, minWidth: 220 },
            },
          }}
        >
          <List dense disablePadding role="listbox" aria-label="Śpiewniki">
            <SongbookOptionRows
              value={value}
              onToggle={toggleSlug}
              onClear={() => onChange([])}
            />
          </List>
        </Popover>
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