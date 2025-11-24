import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline, createTheme, Theme } from '@mui/material';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleMode: () => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'theme-mode';

function getInitialMode(): ThemeMode {
  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  // Fall back to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem(STORAGE_KEY)) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Create theme based on mode
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            // Dark blue matching church website
            main: mode === 'dark' ? '#1E3A5F' : '#1E3A5F', // Dark blue from church site
            light: mode === 'dark' ? '#2E5A8F' : '#2E5A8F',
            dark: mode === 'dark' ? '#0F1F3A' : '#0F1F3A',
            contrastText: '#FFFFFF',
          },
          secondary: {
            // Neutral gray
            main: mode === 'dark' ? '#5A6B7F' : '#5A6B7F',
            light: mode === 'dark' ? '#7A8B9F' : '#7A8B9F',
            dark: mode === 'dark' ? '#3A4B5F' : '#3A4B5F',
            contrastText: '#fff',
          },
          background: {
            // Dark blue-gray background (matching church site dark areas)
            default: mode === 'dark' ? '#1A2332' : '#FAFAFA', // Dark blue-gray
            paper: mode === 'dark' ? '#252F3F' : '#FFFFFF', // Dark blue-gray paper (lighter than background)
          },
          text: {
            // Darker text for better contrast and accessibility (WCAG AA/AAA compliance)
            primary: mode === 'dark' ? '#FFFFFF' : '#000000', // Pure white in dark mode, pure black in light mode
            secondary: mode === 'dark' ? '#E0E0E0' : '#424242', // Light gray in dark mode, dark gray in light mode
          },
          divider: mode === 'dark' ? 'rgba(30, 58, 95, 0.15)' : 'rgba(0, 0, 0, 0.12)', // Blue-tinted divider
          error: {
            main: '#D32F2F',
            light: '#EF5350',
            dark: '#C62828',
            contrastText: '#fff',
          },
        },
        typography: {
          fontFamily: [
            'Roboto',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
          ].join(','),
          h1: {
            fontWeight: 500,
            letterSpacing: '0.02em',
          },
          h2: {
            fontWeight: 500,
            letterSpacing: '0.01em',
          },
          h3: {
            fontWeight: 500,
          },
          h4: {
            fontWeight: 500,
          },
          h5: {
            fontWeight: 500,
          },
          h6: {
            fontWeight: 500,
          },
          button: {
            fontWeight: 500,
            letterSpacing: '0.02em',
          },
        },
        shape: {
          borderRadius: 4, // More conservative, business-like border radius
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                minHeight: '40px',
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 4,
                padding: '8px 20px',
                boxShadow: 'none',
                letterSpacing: '0.02em',
              },
              contained: {
                backgroundColor: mode === 'dark' ? '#1E3A5F' : '#1E3A5F',
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#0F1F3A' : '#0F1F3A',
                  boxShadow: mode === 'dark' 
                    ? '0px 2px 4px rgba(30, 58, 95, 0.3)'
                    : '0px 2px 4px rgba(30, 58, 95, 0.2)',
                },
              },
              outlined: {
                borderColor: mode === 'dark' ? '#1E3A5F' : '#1E3A5F',
                color: mode === 'dark' ? '#1E3A5F' : '#1E3A5F',
                borderWidth: 1,
                '&:hover': {
                  borderColor: mode === 'dark' ? '#0F1F3A' : '#0F1F3A',
                  backgroundColor: mode === 'dark' ? 'rgba(30, 58, 95, 0.08)' : 'rgba(30, 58, 95, 0.04)',
                  borderWidth: 1,
                },
              },
              text: {
                color: mode === 'dark' ? '#1E3A5F' : '#1E3A5F',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(30, 58, 95, 0.08)' : 'rgba(30, 58, 95, 0.04)',
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 4,
                boxShadow: mode === 'dark'
                  ? '0px 1px 3px rgba(0,0,0,0.3)'
                  : '0px 1px 3px rgba(0,0,0,0.12)',
                transition: 'box-shadow 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: mode === 'dark'
                    ? '0px 2px 6px rgba(0,0,0,0.4)'
                    : '0px 2px 6px rgba(0,0,0,0.16)',
                },
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiInputBase-root': {
                  fontSize: '14px',
                  borderRadius: 4,
                },
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'dark'
                  ? '0px 1px 2px rgba(0,0,0,0.3)'
                  : '0px 1px 2px rgba(0,0,0,0.1)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 4,
              },
            },
          },
        },
      }),
    [mode]
  );

  const toggleMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, newMode);
      return newMode;
    });
  };

  // Save to localStorage when mode changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, theme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

