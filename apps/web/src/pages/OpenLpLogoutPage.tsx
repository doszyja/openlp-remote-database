import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Typography, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

/**
 * OpenLP Song Stats plugin opens this URL to clear the browser session and notify
 * the local callback server on 127.0.0.1:{port}.
 */
export default function OpenLpLogoutPage() {
  const [searchParams] = useSearchParams();
  const { logout, isLoading } = useAuth();
  const [status, setStatus] = useState<'pending' | 'done' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  const port = parseInt(searchParams.get('port') || '', 10);
  const from = searchParams.get('from') || 'openlp';

  useEffect(() => {
    if (!Number.isFinite(port) || port < 1024 || port > 65535) {
      setError('Brak prawidłowego parametru port w adresie URL.');
      setStatus('error');
      return;
    }

    if (isLoading) {
      return;
    }

    const run = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        logout();
        if (token) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => undefined);
        }

        const params = new URLSearchParams({
          logout: '1',
          from,
        });
        window.location.href = `http://127.0.0.1:${port}/callback?${params.toString()}`;
        setStatus('done');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Nie udało się zakończyć sesji.';
        setError(message);
        setStatus('error');
      }
    };

    void run();
  }, [from, isLoading, logout, port]);

  if (status === 'error' && error) {
    return (
      <Box sx={{ p: 4, maxWidth: 480, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button component={Link} to="/songs">
          Wróć do pieśni
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 480, mx: 'auto', textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Wylogowywanie OpenLP…
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Czyszczenie sesji w przeglądarce i powiadomienie wtyczki na porcie {port}.
      </Typography>
      <CircularProgress />
      {status === 'done' && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Przekierowano do OpenLP. Możesz zamknąć tę kartę.
        </Alert>
      )}
    </Box>
  );
}