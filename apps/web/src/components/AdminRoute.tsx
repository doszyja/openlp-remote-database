import { ReactNode } from 'react';
import { Box, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_ROLE_ID = '1161734352447746110';

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.discordRoles?.includes(ADMIN_ROLE_ID);

  if (!isAuthenticated || !isAdmin) {
    return (
      <Box sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">
          Brak uprawnień. Tylko administratorzy mogą przeglądać logi audytu.
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
}

