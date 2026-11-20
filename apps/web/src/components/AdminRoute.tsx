import { ReactNode } from 'react';
import { Box, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_ROLE_ID = '1161734352447746110';

interface AdminRouteProps {
  children: ReactNode;
  deniedMessage?: string;
}

export default function AdminRoute({
  children,
  deniedMessage = 'Brak uprawnień. Tylko administratorzy mogą przeglądać tę stronę.',
}: AdminRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.discordRoles?.includes(ADMIN_ROLE_ID);

  if (!isAuthenticated || !isAdmin) {
    return (
      <Box sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">{deniedMessage}</Alert>
      </Box>
    );
  }

  return <>{children}</>;
}
