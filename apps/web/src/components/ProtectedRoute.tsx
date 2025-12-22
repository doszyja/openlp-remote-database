import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { hasEditPermission, isLoading } = useAuth();

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

  if (!hasEditPermission) {
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
            Wymagane Uprawnienia
          </Typography>
          <Typography variant="body2">
            Nie masz uprawnień do edycji pieśni. Skontaktuj się z administratorem, aby uzyskać
            odpowiednią rolę na serwerze Discord.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
}
