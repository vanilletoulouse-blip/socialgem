import { useState, useEffect } from 'react';
import { Search, Tag, FolderPlus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Media {
  id: string;
  file_url: string;
  file_type: string;
  filename: string;
  tags: string[];
  collection_id: string | null;
  created_at: string;
}

interface Collection {
  id: string;
  name: string;
  description: string | null;
}

export const MediaLibrary = () => {
  const { user } = useAuth();
  const [media, setMedia] = useState<Media[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedCollection, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: collectionsData } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      setCollections(collectionsData || []);

      let query = supabase
        .from('media_library')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (selectedCollection) {
        query = query.eq('collection_id', selectedCollection);
      }

      const { data: mediaData } = await query;

      let filteredMedia = mediaData || [];
      if (searchQuery) {
        filteredMedia = filteredMedia.filter(
          (m) =>
            m.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      setMedia(filteredMedia);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      const { error } = await supabase
        .from('collections')
        .insert({
          user_id: user?.id,
          name: newCollectionName,
        });

      if (error) throw error;

      setNewCollectionName('');
      setShowNewCollection(false);
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de la collection');
    }
  };

  const deleteMedia = async (mediaId: string, fileUrl: string) => {
    if (!confirm('Supprimer ce média ?')) return;

    try {
      const fileName = fileUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('media').remove([`${user?.id}/${fileName}`]);
      }

      const { error } = await supabase
        .from('media_library')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Bibliothèque Média</h2>
        <button
          onClick={() => setShowNewCollection(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#B76E79] text-white rounded-lg hover:bg-[#A05D68] transition-colors"
        >
          <FolderPlus size={18} />
          Nouvelle collection
        </button>
      </div>

      {showNewCollection && (
        <div className="bg-[#2A2A2A] rounded-xl p-4 mb-6 border border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Nom de la collection"
              className="flex-1 px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#B76E79]"
            />
            <button
              onClick={createCollection}
              className="px-4 py-2 bg-[#B76E79] text-white rounded-lg hover:bg-[#A05D68] transition-colors"
            >
              Créer
            </button>
            <button
              onClick={() => setShowNewCollection(false)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom ou tag..."
            className="w-full pl-10 pr-4 py-3 bg-[#2A2A2A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#B76E79]"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCollection(null)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            selectedCollection === null
              ? 'bg-[#B76E79] text-white'
              : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
          }`}
        >
          Tous les médias
        </button>
        {collections.map((collection) => (
          <button
            key={collection.id}
            onClick={() => setSelectedCollection(collection.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedCollection === collection.id
                ? 'bg-[#B76E79] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
            }`}
          >
            {collection.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-[#2A2A2A] rounded-xl p-12 text-center border border-gray-800">
          <p className="text-gray-400">Chargement...</p>
        </div>
      ) : media.length === 0 ? (
        <div className="bg-[#2A2A2A] rounded-xl p-12 text-center border border-gray-800">
          <p className="text-gray-400">Aucun média trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="group relative bg-[#2A2A2A] rounded-lg overflow-hidden border border-gray-800 hover:border-[#B76E79] transition-colors"
            >
              <div className="aspect-square">
                {item.file_type === 'image' ? (
                  <img
                    src={item.file_url}
                    alt={item.filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={item.file_url}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => deleteMedia(item.id, item.file_url)}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <p className="text-white text-sm font-medium truncate mb-1">
                    {item.filename}
                  </p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-[#B76E79]/20 text-[#B76E79] text-xs rounded"
                        >
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 2 && (
                        <span className="text-xs text-gray-400">+{item.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
