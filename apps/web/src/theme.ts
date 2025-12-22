import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '"Open Sans"',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    fontSize: 16, // Zwiększone z 15px dla lepszej czytelności
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: {
      fontWeight: 600,
      fontSize: '2.5rem',
      lineHeight: 1.25,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.015em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.35,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.45,
      letterSpacing: '-0.005em',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.5,
      letterSpacing: '-0.005em',
    },
    body1: {
      fontSize: '1rem', // Zwiększone z 0.9375rem (15px) do 16px
      lineHeight: 1.65, // Zwiększone dla lepszej czytelności
      letterSpacing: '0',
    },
    body2: {
      fontSize: '0.9375rem', // 15px
      lineHeight: 1.6,
      letterSpacing: '0',
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
    caption: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0.01em',
    },
    overline: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '0.05em',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: '44px', // Touch-friendly size
          textTransform: 'none',
          fontWeight: 500,
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
    MuiTypography: {
      styleOverrides: {
        root: {
          // Używa kolorów z palety, które automatycznie dostosowują się do trybu
          fontFeatureSettings: "'kern' 1, 'liga' 1", // Włącza kerning i ligatury
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        label: {
          fontSize: '0.875rem',
          fontWeight: 500,
        },
      },
    },
  },
});
