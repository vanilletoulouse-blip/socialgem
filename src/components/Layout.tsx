import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Image, Settings, PlusCircle, LogOut } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Layout = ({ children, currentView, onViewChange }: LayoutProps) => {
  const { signOut } = useAuth();

  const navItems = [
    { id: 'create', label: 'Créer', icon: PlusCircle },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
    { id: 'media', label: 'Bibliothèque', icon: Image },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      <nav className="bg-[#2A2A2A] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-white">
                Social<span className="text-[#B76E79]">Gem</span>
              </h1>

              <div className="flex gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        currentView === item.id
                          ? 'bg-[#B76E79] text-white'
                          : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="hidden sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={signOut}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
