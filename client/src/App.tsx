import { Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatWindow } from './components/chat/ChatWindow';

function Layout() {
  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />} />
      <Route path="/c/:conversationId" element={<Layout />} />
      <Route path="*" element={<Layout />} />
    </Routes>
  );
}
