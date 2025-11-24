import {
  Typography,
  Box,
  Button,
  Paper,
  Stack,
} from '@mui/material';
import {
  Language as LanguageIcon,
  Facebook as FacebookIcon,
  LocationOn as LocationOnIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';

export default function AboutPage() {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1A2332 0%, #1E2A3A 50%, #1F2D3F 100%)'
            : 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 50%, #d4e1f0 100%)',
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 4, sm: 6, md: 8 },
        px: { xs: 3, sm: 4 },
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
          opacity: 0.03,
          backgroundImage: 'radial-gradient(circle at 20% 50%, currentColor 0%, transparent 50%), radial-gradient(circle at 80% 80%, currentColor 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: { xs: 'flex-start', sm: 'center', md: 'center' },
          maxWidth: { md: 800, lg: 900 },
          mx: 'auto',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Main heading */}
        <Box sx={{ width: '100%', mb: { xs: 4, sm: 6 }, textAlign: { xs: 'left', md: 'center' } }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 300,
              fontSize: { xs: '2rem', sm: '3rem', md: '3.5rem' },
              letterSpacing: { xs: 2, sm: 4 },
              color: 'text.primary',
              mb: 2,
              fontFamily: '"Playfair Display", "Georgia", serif',
            }}
          >
            O nas
          </Typography>
        </Box>

        {/* About Us section */}
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            bgcolor: 'background.paper',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                : '0 8px 32px rgba(0, 0, 0, 0.1)',
            border: (theme) =>
              theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
            mb: 4,
          }}
        >
          <Typography
            variant="h5"
            component="h2"
            sx={{
              fontWeight: 500,
              mb: 3,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
            }}
          >
            Społeczność Chrześcijan w Świętochłowicach
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={1.5} justifyContent={{ xs: 'flex-start', md: 'center' }}>
              <AccessTimeIcon color="primary" />
              <Typography variant="body1" fontWeight={500}>
                Nabożeństwa odbywają się
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, pl: { xs: 4.5, md: 0 } }}>
              w niedziele o godz. 10:00 oraz
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: { xs: 4.5, md: 0 } }}>
              w czwartki o godzinie 18:30.
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={1} justifyContent={{ xs: 'flex-start', md: 'center' }}>
              <LocationOnIcon color="primary" />
              <Typography variant="body1" fontWeight={500}>
                Świętochłowice ul. Wyzwolenia 8
              </Typography>
            </Box>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent={{ xs: 'stretch', md: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<LanguageIcon />}
              href="https://swietochlowice.kwch.org/"
              target="_blank"
              rel="noopener noreferrer"
              component="a"
              sx={{ textTransform: 'none', flex: { xs: 1, sm: 'none' } }}
            >
              Strona Zborowa
            </Button>
            <Button
              variant="outlined"
              startIcon={<FacebookIcon />}
              href="https://www.facebook.com/profile.php?id=100064566524704"
              target="_blank"
              rel="noopener noreferrer"
              component="a"
              sx={{ textTransform: 'none', flex: { xs: 1, sm: 'none' } }}
            >
              Facebook
            </Button>
          </Stack>
        </Paper>

        {/* Strona Zborowa card */}
        <Paper
          elevation={0}
          component="a"
          href="https://swietochlowice.kwch.org/"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            width: '100%',
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            bgcolor: 'background.paper',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                : '0 8px 32px rgba(0, 0, 0, 0.1)',
            border: (theme) =>
              theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            textDecoration: 'none',
            color: 'inherit',
            display: 'block',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 12px 40px rgba(0, 0, 0, 0.4)'
                  : '0 12px 40px rgba(0, 0, 0, 0.15)',
            },
          }}
        >
          <Box display="flex" alignItems="flex-start" gap={3}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LanguageIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box flex={1}>
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 500,
                  mb: 1,
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                }}
              >
                Strona Zborowa
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Odwiedź główną stronę zboru
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

