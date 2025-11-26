import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Instagram, Facebook } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Post {
  id: string;
  title: string;
  scheduled_for: string;
  status: string;
  post_content: Array<{
    platform: string;
  }>;
}

export const Calendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, [currentDate]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          scheduled_for,
          status,
          post_content (platform)
        `)
        .eq('user_id', user?.id)
        .gte('scheduled_for', startOfMonth.toISOString())
        .lte('scheduled_for', endOfMonth.toISOString())
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getPostsForDay = (day: number) => {
    return posts.filter((post) => {
      const postDate = new Date(post.scheduled_for);
      return (
        postDate.getDate() === day &&
        postDate.getMonth() === currentDate.getMonth() &&
        postDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram size={12} className="text-pink-400" />;
      case 'facebook':
        return <Facebook size={12} className="text-blue-400" />;
      case 'tiktok':
        return <span className="text-[10px] font-bold">TT</span>;
      case 'pinterest':
        return <span className="text-[10px] font-bold text-red-400">P</span>;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'published':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Calendrier</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={previousMonth}
            className="p-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-xl font-medium text-white capitalize min-w-[200px] text-center">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-[#2A2A2A] rounded-xl p-12 text-center border border-gray-800">
          <p className="text-gray-400">Chargement...</p>
        </div>
      ) : (
        <div className="bg-[#2A2A2A] rounded-xl p-6 border border-gray-800">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayPosts = getPostsForDay(day);
              const isToday =
                day === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={day}
                  className={`aspect-square p-2 rounded-lg border transition-colors ${
                    isToday
                      ? 'border-[#B76E79] bg-[#B76E79]/10'
                      : 'border-gray-700 bg-[#1A1A1A] hover:border-gray-600'
                  }`}
                >
                  <div className="flex flex-col h-full">
                    <span
                      className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-[#B76E79]' : 'text-gray-300'
                      }`}
                    >
                      {day}
                    </span>
                    <div className="flex-1 overflow-y-auto space-y-1">
                      {dayPosts.map((post) => (
                        <div
                          key={post.id}
                          className={`text-xs p-1 rounded border ${getStatusColor(post.status)}`}
                          title={post.title}
                        >
                          <div className="truncate font-medium">{post.title}</div>
                          <div className="flex gap-1 mt-1">
                            {post.post_content?.map((content, idx) => (
                              <div key={idx}>{getPlatformIcon(content.platform)}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30"></div>
          <span className="text-gray-400">Programmé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30"></div>
          <span className="text-gray-400">Publié</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30"></div>
          <span className="text-gray-400">Échec</span>
        </div>
      </div>
    </div>
  );
};
