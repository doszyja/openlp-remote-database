import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrlForOAuth } from '../utils/apiUrl';

interface AuthRouteProps {
  children: React.ReactNode;
}

/** Wymaga zalogowania (Discord) — bez roli edycji. */
export default function AuthRoute({ children }: AuthRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    const apiUrl = getApiUrlForOAuth();
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', px: 2 }}>
        <Alert severity="info" sx={{ maxWidth: 520 }}>
          <Typography variant="h6" gutterBottom>
            Wymagane logowanie
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Raport literówek jest dostępny po zalogowaniu przez Discord (wystarczy zwykłe konto zborowe, bez
            roli edycji).
          </Typography>
          <Button variant="contained" href={`${apiUrl}/auth/discord`} size="small">
            Zaloguj przez Discord
          </Button>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
}