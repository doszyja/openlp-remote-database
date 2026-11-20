import { Box, Typography } from '@mui/material';
import { isChromeIos } from '../hooks/pwaInstallDetection';

const SAFARI_STEPS = [
  'Stuknij Udostępnij (kwadrat ze strzałką w górę) na dolnym lub górnym pasku.',
  'Wybierz Dodaj do ekranu początkowego, potem Dodaj w prawym górnym rogu.',
];

const CHROME_IOS_STEPS = [
  'Stuknij menu ⋯ na dolnym pasku Chrome.',
  'Wybierz Udostępnij, potem Dodaj do ekranu początkowego → Dodaj.',
];

export interface PwaIosInstallInstructionsProps {
  /** Mniejszy wariant na banerze strony głównej */
  compact?: boolean;
}

export default function PwaIosInstallInstructions({ compact = false }: PwaIosInstallInstructionsProps) {
  const steps = isChromeIos() ? CHROME_IOS_STEPS : SAFARI_STEPS;
  const browserLabel = isChromeIos() ? 'Chrome na iPhone / iPad' : 'Safari na iPhone / iPad';

  return (
    <Box sx={{ textAlign: 'left' }}>
      <Typography
        variant={compact ? 'subtitle2' : 'body1'}
        fontWeight={600}
        sx={{ mb: compact ? 0.75 : 1 }}
      >
        Dodaj śpiewnik do ekranu głównego ({browserLabel})
      </Typography>
      <Box
        component="ol"
        sx={{
          m: 0,
          pl: 2.25,
          '& li': {
            typography: compact ? 'body2' : 'body2',
            color: 'text.secondary',
            mb: compact ? 0.5 : 0.75,
          },
        }}
      >
        {steps.map(step => (
          <li key={step}>{step}</li>
        ))}
      </Box>
    </Box>
  );
}