import { Routes, Route } from 'react-router-dom';
import { Container } from '@mui/material';

function App() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Routes>
        <Route path="/" element={<div>OpenLP Song Manager - Coming Soon</div>} />
      </Routes>
    </Container>
  );
}

export default App;

