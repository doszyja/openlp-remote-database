import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SongVersionHistory from '../components/SongVersionHistory';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export default function SongHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasEditPermission } = useAuth();
  usePageTitle('Historia wersji');

  if (!id) {
    return null;
  }

  return (
    <Box sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3, md: 4 }, maxWidth: 1200, mx: 'auto', width: '100%' }}>
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
          Historia wersji
        </Typography>
      </Box>
      <SongVersionHistory
        songId={id}
        embedded
        canRestore={hasEditPermission}
        onRestore={() => navigate(`/songs/${id}`)}
      />
    </Box>
  );
}