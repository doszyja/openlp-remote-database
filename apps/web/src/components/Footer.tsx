import { Box, Container, Typography, Link, Stack, IconButton } from '@mui/material';
import { GitHub as GitHubIcon, MusicNote as MusicNoteIcon } from '@mui/icons-material';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1, sm: 2 }}
          justifyContent="space-between"
          alignItems={{ xs: 'center', sm: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MusicNoteIcon color="primary" sx={{ fontSize: 18 }} />
            <Typography variant="body2" component="div" fontWeight={500}>
              OpenLP Song Database
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              © {new Date().getFullYear()} OpenLP Song Database
            </Typography>
            <Link
              href="https://github.com/doszyja/openlp-remote-database"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <IconButton size="small" aria-label="GitHub" sx={{ padding: 0.5 }}>
                <GitHubIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

