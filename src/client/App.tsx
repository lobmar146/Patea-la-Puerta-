import { Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { RoomGate } from './pages/RoomGate';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/s/:code" element={<RoomGate mode="app" />} />
      <Route path="/s/:code/tv" element={<RoomGate mode="tv" />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
