# Material UI (MUI) Implementation Guide

This guide covers how Material UI is used in the OpenLP Database Sync frontend application.

## Overview

Material UI (MUI) is used as the primary component library and styling solution for the React frontend. It provides a comprehensive set of components following Google's Material Design principles.

## Installation

```bash
cd apps/web
pnpm add @mui/material @mui/icons-material @emotion/react @emotion/styled
```

## Theme Configuration

### Basic Theme Setup

Create `src/theme/theme.ts`:

```typescript
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Adjust to your brand color
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});
```

### Mobile-First Theme

Ensure mobile responsiveness:

```typescript
export const theme = createTheme({
  // ... other config
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: '44px', // Touch-friendly size
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            fontSize: '16px', // Prevents zoom on iOS
          },
        },
      },
    },
  },
});
```

## Component Usage Patterns

### Buttons

```typescript
import { Button } from '@mui/material';

<Button variant="contained" color="primary">
  Create Song
</Button>

<Button variant="outlined" color="secondary">
  Cancel
</Button>

<Button variant="text" disabled={loading}>
  {loading ? <CircularProgress size={20} /> : 'Save'}
</Button>
```

### Forms with React Hook Form

```typescript
import { TextField } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';

const { control, handleSubmit } = useForm();

<Controller
  name="title"
  control={control}
  rules={{ required: 'Title is required' }}
  render={({ field, fieldState: { error } }) => (
    <TextField
      {...field}
      label="Song Title"
      error={!!error}
      helperText={error?.message}
      fullWidth
      margin="normal"
    />
  )}
/>
```

### Textarea

```typescript
import { TextareaAutosize } from '@mui/material';

<TextareaAutosize
  minRows={3}
  maxRows={10}
  placeholder="Enter verse content..."
  style={{ width: '100%', padding: '8px' }}
/>
```

### Loading States

```typescript
import { CircularProgress, Box } from '@mui/material';

<Box display="flex" justifyContent="center" p={3}>
  <CircularProgress />
</Box>
```

### Error Display

```typescript
import { Alert, AlertTitle } from '@mui/material';

<Alert severity="error">
  <AlertTitle>Error</AlertTitle>
  {errorMessage}
</Alert>
```

### Cards

```typescript
import { Card, CardContent, CardActions, Typography } from '@mui/material';

<Card>
  <CardContent>
    <Typography variant="h6">{song.title}</Typography>
    <Typography variant="body2" color="text.secondary">
      {song.language}
    </Typography>
  </CardContent>
  <CardActions>
    <Button size="small">Edit</Button>
  </CardActions>
</Card>
```

### Dialogs/Modals

```typescript
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

<Dialog open={open} onClose={handleClose}>
  <DialogTitle>Delete Song?</DialogTitle>
  <DialogContent>
    <Typography>Are you sure you want to delete this song?</Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>Cancel</Button>
    <Button onClick={handleDelete} color="error">Delete</Button>
  </DialogActions>
</Dialog>
```

### Lists

```typescript
import { List, ListItem, ListItemText, ListItemButton } from '@mui/material';

<List>
  {songs.map((song) => (
    <ListItem key={song.id} disablePadding>
      <ListItemButton onClick={() => handleSelect(song)}>
        <ListItemText primary={song.title} secondary={song.language} />
      </ListItemButton>
    </ListItem>
  ))}
</List>
```

## Responsive Design

### Using Breakpoints

```typescript
import { useTheme, useMediaQuery, Box, Grid } from '@mui/material';

const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

<Grid container spacing={2}>
  <Grid item xs={12} sm={6} md={4}>
    {/* Content */}
  </Grid>
</Grid>
```

### Mobile Navigation

```typescript
import { AppBar, Toolbar, IconButton, Drawer } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

const [mobileOpen, setMobileOpen] = useState(false);

<AppBar>
  <Toolbar>
    <IconButton
      edge="start"
      onClick={() => setMobileOpen(true)}
      sx={{ display: { sm: 'none' } }}
    >
      <MenuIcon />
    </IconButton>
  </Toolbar>
</AppBar>
```

## Icons

```typescript
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

<Button startIcon={<AddIcon />}>Add Song</Button>
<IconButton>
  <EditIcon />
</IconButton>
```

## Customization

### Creating Custom Components

Wrap MUI components for consistency:

```typescript
// src/components/Button.tsx
import { Button as MuiButton, ButtonProps } from '@mui/material';

export const Button = (props: ButtonProps) => {
  return <MuiButton {...props} />;
};
```

### Theming Custom Components

```typescript
// In theme.ts
components: {
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none', // Disable uppercase
        borderRadius: 8,
      },
    },
  },
}
```

## Best Practices

1. **Use MUI components first**: Prefer MUI components over custom implementations
2. **Consistent spacing**: Use MUI's spacing system (`spacing={2}`)
3. **Typography scale**: Use MUI typography variants (`h1`, `h2`, `body1`, etc.)
4. **Color palette**: Stick to theme colors for consistency
5. **Responsive**: Always consider mobile-first design
6. **Accessibility**: MUI components are accessible by default
7. **Performance**: Use `sx` prop for one-off styles, styled components for reusable styles

## Common Patterns

### Form Layout

```typescript
<Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
  <TextField
    fullWidth
    label="Title"
    margin="normal"
    required
  />
  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
    <Button type="submit" variant="contained">
      Save
    </Button>
    <Button variant="outlined" onClick={onCancel}>
      Cancel
    </Button>
  </Box>
</Box>
```

### Loading State

```typescript
{isLoading ? (
  <Box display="flex" justifyContent="center" p={3}>
    <CircularProgress />
  </Box>
) : (
  <SongList songs={songs} />
)}
```

### Error Handling

```typescript
{error && (
  <Alert severity="error" sx={{ mb: 2 }}>
    {error.message}
  </Alert>
)}
```

## Bundle Size Optimization

Material UI supports tree-shaking. Only import what you need:

```typescript
// ✅ Good - tree-shakeable
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

// ❌ Avoid - imports entire library
import { Button, TextField } from '@mui/material';
```

## Resources

- [Material UI Documentation](https://mui.com/)
- [Material UI Components](https://mui.com/material-ui/getting-started/)
- [Material Design Guidelines](https://material.io/design)
- [MUI Theme Customization](https://mui.com/material-ui/customization/theming/)

---

**Last Updated**: 2025-01-XX

