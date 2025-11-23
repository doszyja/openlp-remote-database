import { useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  const handleDiscordLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    window.location.href = `${apiUrl}/auth/discord`;
  };

  // If already authenticated, this shouldn't be shown (ProtectedRoute handles redirect)
  // But just in case, redirect if authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.href = '/';
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          bgcolor: '#f5f5f5',
        }}
      >
        <CircularProgress sx={{ color: '#5865F2' }} />
        <Typography variant="body1" sx={{ color: '#4f545c' }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(88, 101, 242, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(88, 101, 242, 0.05) 0%, transparent 50%)',
        px: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 480,
          bgcolor: '#ffffff',
          borderRadius: '8px',
          p: 5,
          boxShadow: '0 2px 10px 0 rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              mb: 3,
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 18V5l12-2v13"
                stroke="#5865F2"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle
                cx="6"
                cy="18"
                r="3"
                stroke="#5865F2"
                strokeWidth="2"
                fill="none"
              />
              <circle
                cx="18"
                cy="16"
                r="3"
                stroke="#5865F2"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                color: '#060607',
                fontWeight: 700,
                fontSize: '24px',
                lineHeight: '30px',
              }}
            >
              Pieśni Zborowe
            </Typography>
          </Box>
          
          <Typography
            variant="body1"
            sx={{
              color: '#4f545c',
              fontSize: '16px',
              lineHeight: '20px',
            }}
          >
            Zarządzaj i synchronizuj swoje pieśni z OpenLP
          </Typography>
        </Box>

        <Box
          component="button"
          onClick={handleDiscordLogin}
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            p: '10px 16px',
            bgcolor: '#5865F2',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 500,
            lineHeight: '24px',
            transition: 'background-color 0.17s ease, color 0.17s ease',
            mb: 2,
            fontFamily: 'inherit',
            '&:hover': {
              bgcolor: '#4752C4',
            },
            '&:active': {
              bgcolor: '#3C45A5',
            },
            '&:focus': {
              outline: 'none',
              boxShadow: '0 0 0 2px rgba(88, 101, 242, 0.3)',
            },
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 71 55"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z"
              fill="currentColor"
            />
          </svg>
          <span>Continue with Discord</span>
        </Box>

        <Typography
          variant="caption"
          sx={{
            display: 'block',
            color: '#747f8d',
            fontSize: '12px',
            lineHeight: '16px',
            textAlign: 'center',
            mt: 2,
          }}
        >
          By continuing, you agree to Discord's Terms of Service and Privacy Policy.
        </Typography>

        <Box
          sx={{
            mt: 4,
            pt: 4,
            borderTop: '1px solid #e3e5e8',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{
                minWidth: '20px',
                height: '20px',
                borderRadius: '4px',
                bgcolor: '#5865F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mt: 0.5,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                  fill="#ffffff"
                />
              </svg>
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: '#060607',
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontWeight: 500,
                  mb: 0.5,
                }}
              >
                What is OpenLP Song Database?
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#4f545c',
                  fontSize: '14px',
                  lineHeight: '20px',
                }}
              >
                A web-based platform for managing your song library and syncing with OpenLP presentation software. Create, edit, and organize your songs with ease.
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
            }}
          >
            <Box
              sx={{
                minWidth: '20px',
                height: '20px',
                borderRadius: '4px',
                bgcolor: '#faa61a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mt: 0.5,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                  fill="#ffffff"
                />
              </svg>
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: '#060607',
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontWeight: 500,
                  mb: 0.5,
                }}
              >
                Access Requirements
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#4f545c',
                  fontSize: '14px',
                  lineHeight: '20px',
                }}
              >
                You must be a member of the required Discord server with the required role to access this application.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

