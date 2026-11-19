import { Link as RouterLink, useParams } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SongOpenLpPreview from '../components/SongOpenLpPreview';
import { usePageTitle } from '../hooks/usePageTitle';

export default function SongPreviewPage() {
  const { id } = useParams<{ id: string }>();
  usePageTitle('Podgląd OpenLP');

  if (!id) {
    return null;
  }

  return (
    <Box sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3, md: 4 }, maxWidth: 1100, mx: 'auto', width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          component={RouterLink}
          to={`/songs/${id}`}
          size="small"
        >
          Pieśń
        </Button>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 500, flex: 1 }}>
          Podgląd OpenLP
        </Typography>
      </Box>
      <SongOpenLpPreview songId={id} />
    </Box>
  );
}