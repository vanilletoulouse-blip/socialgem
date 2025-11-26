import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/AuthForm';
import { Layout } from './components/Layout';
import { CreatePost } from './components/CreatePost';
import { Calendar } from './components/Calendar';
import { MediaLibrary } from './components/MediaLibrary';
import { Settings } from './components/Settings';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('create');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {currentView === 'create' && <CreatePost />}
      {currentView === 'calendar' && <Calendar />}
      {currentView === 'media' && <MediaLibrary />}
      {currentView === 'settings' && <Settings />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
