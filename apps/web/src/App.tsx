import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import SongListPage from './pages/SongListPage';
import SongCreatePage from './pages/SongCreatePage';
import SongEditPage from './pages/SongEditPage';
import SongDetailPage from './pages/SongDetailPage';

function App() {
  return (
    <Layout>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/songs" element={<SongListPage />} />
        <Route path="/songs/new" element={<SongCreatePage />} />
        <Route path="/songs/:id" element={<SongDetailPage />} />
        <Route path="/songs/:id/edit" element={<SongEditPage />} />
      </Routes>
    </Layout>
  );
}

export default App;

