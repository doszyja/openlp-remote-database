import { Box, Typography } from '@mui/material';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 1.5,
        textAlign: 'center',
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: 400,
          fontSize: { xs: '0.85rem', sm: '0.9rem' },
          color: 'text.secondary',
        }}
      >
        Świętochłowice Kościół Wolnych Chrześcijan
      </Typography>
    </Box>
  );
}

