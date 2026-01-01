import { Box, Typography, Stack, Paper } from '@mui/material';
import { SearchOff as SearchOffIcon } from '@mui/icons-material';

/**
 * 404 Not Found page
 * Displayed when user navigates to a route that doesn't exist
 */
export default function NotFoundPage() {
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, sm: 3 },
        maxWidth: '800px',
        mx: 'auto',
        pt: { xs: '4rem', sm: '6rem', md: '8rem' },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 3,
          textAlign: 'center',
          bgcolor: 'background.paper',
          border: theme =>
            theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.05)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
      >
        <Stack spacing={3} alignItems="center" sx={{ pb: 3 }}>
          {/* 404 Icon */}
          <SearchOffIcon
            sx={{
              fontSize: 72,
              color: 'text.secondary',
            }}
          />

          {/* Main Message */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 400,
              color: 'text.primary',
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
            }}
          >
            404 - Strona nie została znaleziona
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              maxWidth: 400,
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Przepraszamy, strona której szukasz nie istnieje lub została przeniesiona.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
