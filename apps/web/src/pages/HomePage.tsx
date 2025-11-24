import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  Stack,
  Paper,
  Avatar,
} from '@mui/material';
import {
  LibraryMusic as LibraryMusicIcon,
  Add as AddIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, hasEditPermission } = useAuth();

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, #1A2332 0%, #1B2535 30%, #1E2A3A 60%, #1F2D3F 100%)'
            : '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 0, // Allow flexbox to shrink
      }}
    >
      {/* Decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: (theme) => theme.palette.mode === 'dark' ? 0.02 : 0,
          backgroundImage: (theme) =>
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 20% 30%, currentColor 0%, transparent 40%), radial-gradient(circle at 80% 70%, currentColor 0%, transparent 40%)'
              : 'none',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: { xs: 'flex-start', sm: 'center', md: 'center' },
          justifyContent: { xs: 'flex-start', sm: 'center', md: 'center' },
          px: { xs: 2, sm: 3, md: 4 },
          pt: { xs: 3, sm: 5, md: 8 },
          pb: { xs: 4, sm: 6, md: 10 },
          position: 'relative',
          zIndex: 1,
          minHeight: 0, // Allow flexbox to shrink
          overflow: 'auto', // Allow scrolling if content is too large
        }}
      >
        {/* Main heading */}
        <Box sx={{ width: '100%', maxWidth: { md: 800, lg: 900 }, mb: { xs: 3, sm: 5, md: 6 }, textAlign: { xs: 'left', md: 'center' } }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 300,
              fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3.5rem' },
              letterSpacing: { xs: 1, sm: 3, md: 4 },
              color: 'text.primary',
              mb: { xs: 1.5, sm: 2 },
              fontFamily: '"Playfair Display", "Georgia", serif',
            }}
          >
            Pieśni Zborowe
          </Typography>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 400,
              color: 'text.secondary',
              fontSize: { xs: '0.85rem', sm: '1rem', md: '1.1rem' },
              letterSpacing: { xs: 0.5, sm: 1 },
              mb: { xs: 2, sm: 3 },
            }}
          >
            Zarządzaj pieśniami zborowymi i synchronizuj z OpenLP
          </Typography>

          {user && (
            <Box
              display="flex"
              alignItems="center"
              gap={1.5}
              sx={{
                bgcolor: 'background.paper',
                px: { xs: 2, sm: 2.5, md: 3 },
                py: { xs: 1, sm: 1.25, md: 1.5 },
                borderRadius: 2,
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                    : '0 4px 16px rgba(0, 0, 0, 0.08)',
                display: 'inline-flex',
              }}
            >
              {user.avatar && (
                <Avatar
                  src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                  sx={{ width: { xs: 28, sm: 30, md: 32 }, height: { xs: 28, sm: 30, md: 32 } }}
                />
              )}
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                Zalogowano jako <strong>{user.username}</strong>
              </Typography>
            </Box>
          )}
        </Box>

        {/* Action cards */}
        <Stack
          spacing={2.5}
          sx={{
            width: { xs: '100%', sm: '550px', md: '550px' },
            alignItems: { xs: 'stretch', sm: 'center', md: 'center' },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              p: { xs: 2.5, sm: 3.5, md: 4 },
              borderRadius: 3,
              bgcolor: 'background.paper',
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                  : '0 8px 32px rgba(0, 0, 0, 0.1)',
              border: (theme) =>
                theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: { xs: 'none', sm: 'translateY(-4px)' },
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 12px 40px rgba(0, 0, 0, 0.4)'
                    : '0 12px 40px rgba(0, 0, 0, 0.15)',
              },
            }}
          >
            <Box display="flex" alignItems="flex-start" gap={2} mb={2.5}>
              <Box
                sx={{
                  p: { xs: 1.25, sm: 1.5 },
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <LibraryMusicIcon sx={{ fontSize: { xs: 24, sm: 26, md: 28 } }} />
              </Box>
              <Box flex={1} minWidth={0}>
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{
                    fontWeight: 500,
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '1.1rem', sm: '1.35rem', md: '1.5rem' },
                  }}
                >
                  Przeglądaj Pieśni
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                  Przeglądaj i wyszukuj pieśni zborowe w bibliotece
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => navigate('/songs')}
              sx={{
                py: { xs: 1.25, sm: 1.5 },
                fontSize: { xs: '0.9rem', sm: '1rem' },
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              Przejdź do Pieśni
            </Button>
          </Paper>

          {hasEditPermission && (
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                p: { xs: 2.5, sm: 3.5, md: 4 },
                borderRadius: 3,
                bgcolor: 'background.paper',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                    : '0 8px 32px rgba(0, 0, 0, 0.1)',
                border: (theme) =>
                  theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: { xs: 'none', sm: 'translateY(-4px)' },
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 12px 40px rgba(0, 0, 0, 0.4)'
                      : '0 12px 40px rgba(0, 0, 0, 0.15)',
                },
              }}
            >
              <Box display="flex" alignItems="flex-start" gap={2} mb={2.5}>
                <Box
                  sx={{
                    p: { xs: 1.25, sm: 1.5 },
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AddIcon sx={{ fontSize: { xs: 24, sm: 26, md: 28 } }} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      fontWeight: 500,
                      mb: { xs: 0.75, sm: 1 },
                      fontSize: { xs: '1.1rem', sm: '1.35rem', md: '1.5rem' },
                    }}
                  >
                    Dodaj Nową Pieśń
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                    Dodaj nową pieśń do biblioteki zborowej
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => navigate('/songs/new')}
                sx={{
                  py: { xs: 1.25, sm: 1.5 },
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: 2,
                }}
              >
                Utwórz Pieśń
              </Button>
            </Paper>
          )}

          {/* Help card */}
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              p: { xs: 2.5, sm: 3.5, md: 4 },
              borderRadius: 3,
              bgcolor: 'background.paper',
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                  : '0 8px 32px rgba(0, 0, 0, 0.1)',
              border: (theme) =>
                theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: { xs: 'none', sm: 'translateY(-4px)' },
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 12px 40px rgba(0, 0, 0, 0.4)'
                    : '0 12px 40px rgba(0, 0, 0, 0.15)',
              },
            }}
          >
            <Box display="flex" alignItems="flex-start" gap={2} mb={2.5}>
              <Box
                sx={{
                  p: { xs: 1.25, sm: 1.5 },
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <HelpIcon sx={{ fontSize: { xs: 24, sm: 26, md: 28 } }} />
              </Box>
              <Box flex={1} minWidth={0}>
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{
                    fontWeight: 500,
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '1.1rem', sm: '1.35rem', md: '1.5rem' },
                  }}
                >
                  Instrukcja Użytkownika
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                  Dowiedz się, jak korzystać z aplikacji - przeglądanie, wyszukiwanie, edycja i eksport pieśni
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => navigate('/help')}
              sx={{
                py: { xs: 1.25, sm: 1.5 },
                fontSize: { xs: '0.9rem', sm: '1rem' },
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: 2,
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : undefined,
                color: (theme) => theme.palette.mode === 'dark' ? '#E8EAF6' : undefined,
                '&:hover': {
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : undefined,
                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : undefined,
                },
              }}
            >
              Zobacz Instrukcję
            </Button>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}

