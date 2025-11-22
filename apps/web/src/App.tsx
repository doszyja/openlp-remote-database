import { Routes, Route } from 'react-router-dom';
import SongListPage from './pages/SongListPage';
import SongCreatePage from './pages/SongCreatePage';
import SongEditPage from './pages/SongEditPage';
import SongDetailPage from './pages/SongDetailPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<SongListPage />} />
      <Route path="/songs/new" element={<SongCreatePage />} />
      <Route path="/songs/:id" element={<SongDetailPage />} />
      <Route path="/songs/:id/edit" element={<SongEditPage />} />
    </Routes>
  );
}

export default App;

