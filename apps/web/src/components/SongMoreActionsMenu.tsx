import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HistoryIcon from '@mui/icons-material/History';

const outlinedButtonSx = {
  borderColor: (theme: { palette: { mode: string } }) =>
    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.23)',
  color: (theme: { palette: { mode: string } }) =>
    theme.palette.mode === 'dark' ? '#E8EAF6' : 'inherit',
  fontSize: { xs: '0.75rem', sm: '0.875rem' },
  px: { xs: 1, sm: 1.5 },
  minWidth: { xs: 'auto', sm: 'auto' },
  whiteSpace: 'nowrap' as const,
  '&:hover': {
    borderColor: (theme: { palette: { mode: string } }) =>
      theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
    backgroundColor: (theme: { palette: { mode: string } }) =>
      theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
  },
};

interface SongMoreActionsMenuProps {
  songId: string;
  isAdmin?: boolean;
}

export default function SongMoreActionsMenu({ songId, isAdmin = false }: SongMoreActionsMenuProps) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const go = (path: string) => {
    setAnchorEl(null);
    navigate(path);
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        endIcon={<ArrowDropDownIcon />}
        onClick={e => setAnchorEl(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : undefined}
        sx={outlinedButtonSx}
      >
        Więcej
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem onClick={() => go(`/songs/${songId}/preview`)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Podgląd</ListItemText>
        </MenuItem>
        {isAdmin ? (
          <MenuItem onClick={() => go(`/songs/${songId}/history`)}>
            <ListItemIcon>
              <HistoryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Historia</ListItemText>
          </MenuItem>
        ) : null}
      </Menu>
    </>
  );
}