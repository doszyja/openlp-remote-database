import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showError } = useNotification();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      const decodedError = decodeURIComponent(error);
      let message = '';
      
      // Handle specific error types with Polish messages
      if (decodedError === 'missing_role' || decodedError.includes('missing role') || decodedError.includes('not authorized')) {
        message = 'Nie masz uprawnień do tego, aby zalogować się do tej strony i móc edytować oraz usuwać pieśni. Skontaktuj się z administratorem, aby uzyskać dostęp.';
      } else {
        message = `Uwierzytelnienie nie powiodło się: ${decodedError}`;
      }
      
      setErrorMessage(message);
      showError(message);
      
      // Redirect after showing error for a bit
      setTimeout(() => {
        navigate('/songs');
      }, 5000); // 5 seconds to read the error
      return;
    }

    if (token) {
      login(token)
        .then(() => {
          navigate('/songs');
        })
        .catch((err) => {
          console.error('Login error:', err);
          const message = 'Nie udało się zakończyć logowania. Spróbuj ponownie.';
          setErrorMessage(message);
          showError(message);
          setTimeout(() => {
            navigate('/songs');
          }, 5000);
        });
    } else {
      const message = 'Nie otrzymano tokenu uwierzytelnienia.';
      setErrorMessage(message);
      showError(message);
      setTimeout(() => {
        navigate('/songs');
      }, 5000);
    }
  }, [searchParams, navigate, login, showError]);

  // Show error message if there's an error
  if (errorMessage) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 3,
          backgroundColor: (theme) => 
            theme.palette.mode === 'dark' 
              ? 'rgba(26, 35, 50, 0.98)' 
              : 'rgba(255, 255, 255, 0.98)',
          zIndex: 9999,
          px: 3,
        }}
      >
        <Alert 
          severity="error" 
          sx={{ 
            maxWidth: 600,
            width: '100%',
            py: 2,
            '& .MuiAlert-message': {
              fontSize: '1rem',
            },
          }}
        >
          {errorMessage}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/songs')}
          sx={{
            mt: 2,
          }}
        >
          Powrót do strony głównej
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3,
        backgroundColor: (theme) => 
          theme.palette.mode === 'dark' 
            ? 'rgba(26, 35, 50, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
        zIndex: 9999,
      }}
    >
      <CircularProgress size={60} />
      <Typography variant="body1" color="text.secondary">
        Kończenie uwierzytelniania...
      </Typography>
    </Box>
  );
}

