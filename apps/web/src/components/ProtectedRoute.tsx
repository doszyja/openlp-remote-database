import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          px: 2,
        }}
      >
        <Alert severity="info" sx={{ maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Wymagane Uwierzytelnienie
          </Typography>
          <Typography variant="body2">
            Zaloguj się przez Ustawienia, aby uzyskać dostęp do tej strony. Kliknij ikonę ustawień w prawym górnym rogu, aby zalogować się przez Discord.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
}

