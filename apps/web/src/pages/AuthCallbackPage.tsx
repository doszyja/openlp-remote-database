import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Box, CircularProgress, Alert, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showError } = useNotification();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      showError(`Uwierzytelnienie nie powiodło się: ${decodeURIComponent(error)}`);
      navigate('/songs');
      return;
    }

    if (token) {
      login(token)
        .then(() => {
          navigate('/songs');
        })
        .catch((err) => {
          console.error('Login error:', err);
          showError('Nie udało się zakończyć logowania. Spróbuj ponownie.');
          navigate('/songs');
        });
    } else {
      showError('Nie otrzymano tokenu uwierzytelnienia.');
      navigate('/songs');
    }
  }, [searchParams, navigate, login, showError]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary">
          Kończenie uwierzytelniania...
        </Typography>
      </Box>
    </Container>
  );
}

