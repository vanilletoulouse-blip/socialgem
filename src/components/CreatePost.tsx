import { useState, useCallback } from 'react';
import { Upload, X, Sparkles, Instagram, Facebook } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PlatformContent {
  platform: string;
  content: string;
  hashtags: string[];
  characterLimit: number;
}

export const CreatePost = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [platformContent, setPlatformContent] = useState<PlatformContent[]>([
    { platform: 'instagram', content: '', hashtags: [], characterLimit: 2200 },
  ]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', limit: 2200 },
    { id: 'tiktok', name: 'TikTok', icon: () => <span className="text-lg font-bold">TT</span>, color: '#000000', limit: 2200 },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', limit: 63206 },
    { id: 'pinterest', name: 'Pinterest', icon: () => <span className="text-lg font-bold">P</span>, color: '#E60023', limit: 500 },
  ];

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    handleFiles(droppedFiles);
  }, []);

  const handleFiles = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPreviewUrls((prev) => [...prev, url]);
    });
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms((prev) => prev.filter((id) => id !== platformId));
      setPlatformContent((prev) => prev.filter((pc) => pc.platform !== platformId));
    } else {
      setSelectedPlatforms((prev) => [...prev, platformId]);
      const platform = platforms.find((p) => p.id === platformId);
      setPlatformContent((prev) => [
        ...prev,
        { platform: platformId, content: '', hashtags: [], characterLimit: platform?.limit || 2200 },
      ]);
    }
  };

  const updatePlatformContent = (platform: string, content: string) => {
    setPlatformContent((prev) =>
      prev.map((pc) => (pc.platform === platform ? { ...pc, content } : pc))
    );
  };

  const optimizeWithAI = async () => {
    if (!platformContent[0]?.content.trim()) {
      alert('Veuillez entrer du contenu à optimiser');
      return;
    }

    setOptimizing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-post`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: platformContent[0].content,
          platforms: selectedPlatforms,
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de l\'optimisation');

      const result = await response.json();

      setPlatformContent((prev) =>
        prev.map((pc) => {
          const optimized = result.optimizations.find((o: any) => o.platform === pc.platform);
          return optimized
            ? {
                ...pc,
                content: optimized.content,
                hashtags: optimized.hashtags,
              }
            : pc;
        })
      );
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'optimisation IA');
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = async (status: 'draft' | 'scheduled') => {
    if (!title.trim()) {
      alert('Veuillez entrer un titre');
      return;
    }

    if (status === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      alert('Veuillez sélectionner une date et heure de publication');
      return;
    }

    setLoading(true);
    try {
      const mediaIds: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);

        const { data: mediaData, error: mediaError } = await supabase
          .from('media_library')
          .insert({
            user_id: user?.id,
            file_url: publicUrl,
            file_type: file.type.startsWith('image/') ? 'image' : 'video',
            filename: file.name,
            file_size: file.size,
          })
          .select()
          .single();

        if (mediaError) throw mediaError;
        mediaIds.push(mediaData.id);
      }

      const scheduledFor = status === 'scheduled'
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user?.id,
          title,
          media_ids: mediaIds,
          scheduled_for: scheduledFor,
          status,
        })
        .select()
        .single();

      if (postError) throw postError;

      for (const pc of platformContent) {
        const { error: contentError } = await supabase
          .from('post_content')
          .insert({
            post_id: postData.id,
            platform: pc.platform,
            content_text: pc.content,
            hashtags: pc.hashtags,
          });

        if (contentError) throw contentError;
      }

      alert(status === 'draft' ? 'Brouillon enregistré' : 'Post programmé avec succès');

      setTitle('');
      setFiles([]);
      setPreviewUrls([]);
      setPlatformContent([{ platform: 'instagram', content: '', hashtags: [], characterLimit: 2200 }]);
      setScheduledDate('');
      setScheduledTime('');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-6">Créer un post</h2>

      <div className="space-y-6">
        <div className="bg-[#2A2A2A] rounded-xl p-6 border border-gray-800">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Titre du post
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#B76E79] focus:ring-1 focus:ring-[#B76E79]"
            placeholder="Ex: Nouvelle collection bijoux automne 2024"
          />
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="bg-[#2A2A2A] rounded-xl p-6 border-2 border-dashed border-gray-700 hover:border-[#B76E79] transition-colors"
        >
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-300 mb-2">Glissez-déposez vos médias ici</p>
            <p className="text-sm text-gray-500 mb-4">ou</p>
            <label className="inline-flex items-center px-4 py-2 bg-[#B76E79] text-white rounded-lg cursor-pointer hover:bg-[#A05D68] transition-colors">
              <span>Choisir des fichiers</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                className="hidden"
              />
            </label>
          </div>

          {previewUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#2A2A2A] rounded-xl p-6 border border-gray-800">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Réseaux sociaux
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              const isSelected = selectedPlatforms.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-[#B76E79] bg-[#B76E79]/10 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <Icon />
                  <span className="text-sm">{platform.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {platformContent.map((pc) => {
          const platform = platforms.find((p) => p.id === pc.platform);
          return (
            <div key={pc.platform} className="bg-[#2A2A2A] rounded-xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">
                  Contenu - {platform?.name}
                </label>
                <span
                  className={`text-sm ${
                    pc.content.length > pc.characterLimit ? 'text-red-400' : 'text-gray-500'
                  }`}
                >
                  {pc.content.length} / {pc.characterLimit}
                </span>
              </div>
              <textarea
                value={pc.content}
                onChange={(e) => updatePlatformContent(pc.platform, e.target.value)}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#B76E79] focus:ring-1 focus:ring-[#B76E79] min-h-[120px]"
                placeholder={`Écrivez votre post pour ${platform?.name}...`}
              />
            </div>
          );
        })}

        <button
          onClick={optimizeWithAI}
          disabled={optimizing}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#B76E79] to-[#D4849A] text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Sparkles size={20} />
          {optimizing ? 'Optimisation en cours...' : 'Optimiser avec IA'}
        </button>

        <div className="bg-[#2A2A2A] rounded-xl p-6 border border-gray-800">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Programmer la publication
          </label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="px-4 py-3 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#B76E79] focus:ring-1 focus:ring-[#B76E79]"
            />
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="px-4 py-3 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#B76E79] focus:ring-1 focus:ring-[#B76E79]"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => handleSave('draft')}
            disabled={loading}
            className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Enregistrer brouillon
          </button>
          <button
            onClick={() => handleSave('scheduled')}
            disabled={loading}
            className="flex-1 bg-[#B76E79] text-white py-3 rounded-lg font-medium hover:bg-[#A05D68] transition-colors disabled:opacity-50"
          >
            Programmer
          </button>
        </div>
      </div>
    </div>
  );
};
