import { useMemo, type ElementType } from 'react';
import {
  Box,
  FormControl,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import {
  BrightnessAutoOutlined as AutoIcon,
  LightModeOutlined as LightIcon,
  DarkModeOutlined as DarkIcon,
} from '@mui/icons-material';
import { useTheme, type ThemePreference } from '../contexts/ThemeContext';

const OPTIONS: {
  value: ThemePreference;
  label: string;
  Icon: ElementType;
}[] = [
  { value: 'auto', label: 'Auto', Icon: AutoIcon },
  { value: 'light', label: 'Jasny', Icon: LightIcon },
  { value: 'dark', label: 'Ciemny', Icon: DarkIcon },
];

function optionByValue(value: ThemePreference) {
  return OPTIONS.find(opt => opt.value === value) ?? OPTIONS[0];
}

function ThemeOptionContent({
  Icon,
  label,
  iconSize = 20,
}: {
  Icon: ElementType;
  label: string;
  iconSize?: number;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Icon
        sx={{
          fontSize: iconSize,
          color: 'text.primary',
          flexShrink: 0,
        }}
      />
      <Typography component="span" variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function ThemeModeSelect() {
  const { preference, setPreference } = useTheme();

  const selected = useMemo(() => optionByValue(preference), [preference]);

  const handleChange = (event: SelectChangeEvent<ThemePreference>) => {
    setPreference(event.target.value as ThemePreference);
  };

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography
        variant="body2"
        component="span"
        sx={{
          fontWeight: 500,
          color: 'text.secondary',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        Motyw
      </Typography>
      <FormControl size="small" sx={{ minWidth: { xs: 132, sm: 148 } }}>
        <Select
          value={preference}
          onChange={handleChange}
          renderValue={() => (
            <ThemeOptionContent Icon={selected.Icon} label={selected.label} iconSize={22} />
          )}
          inputProps={{ 'aria-label': 'Motyw wyświetlania' }}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'divider',
            },
            '& .MuiSelect-select': {
              py: 0.85,
              pl: 1.25,
              display: 'flex',
              alignItems: 'center',
            },
          }}
        >
          {OPTIONS.map(opt => (
            <MenuItem key={opt.value} value={opt.value} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <opt.Icon fontSize="small" sx={{ color: 'text.primary' }} />
              </ListItemIcon>
              <ListItemText
                primary={opt.label}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}