import { useState, useEffect } from 'react';
import { Instagram, Facebook, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SocialAccount {
  id: string;
  platform: string;
  username: string | null;
  is_active: boolean;
}

interface Profile {
  full_name: string;
  ai_tone: string;
  brand_hashtags: string[];
}

export const Settings = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    ai_tone: 'professional',
    brand_hashtags: [],
  });
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          ai_tone: profileData.ai_tone || 'professional',
          brand_hashtags: profileData.brand_hashtags || [],
        });
      }

      const { data: accountsData } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', user?.id);

      setSocialAccounts(accountsData || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          ai_tone: profile.ai_tone,
          brand_hashtags: profile.brand_hashtags,
        })
        .eq('id', user?.id);

      if (error) throw error;
      alert('Paramètres enregistrés');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const addHashtag = () => {
    if (!newHashtag.trim()) return;
    const tag = newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`;
    if (!profile.brand_hashtags.includes(tag)) {
      setProfile((prev) => ({
        ...prev,
        brand_hashtags: [...prev.brand_hashtags, tag],
      }));
    }
    setNewHashtag('');
  };

  const removeHashtag = (tag: string) => {
    setProfile((prev) => ({
      ...prev,
      brand_hashtags: prev.brand_hashtags.filter((t) => t !== tag),
    }));
  };

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F' },
    { id: 'tiktok', name: 'TikTok', icon: () => <span className="text-lg font-bold">TT</span>, color: '#000000' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2' },
    { id: 'pinterest', name: 'Pinterest', icon: () => <span className="text-lg font-bold">P</span>, color: '#E60023' },
  ];

  const getAccountStatus = (platformId: string) => {
    return socialAccounts.find((acc) => acc.platform === platformId);
  };

  const connectPlatform = (platformId: string) => {
    console.log(`Connexion à ${platformId} demandée`);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#2A2A2A] rounded-xl p-12 text-center border border-gray-800">
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-6">Paramètres</h2>

      <div className="space-y-6">
        <div className="bg-[#2A2A2A] rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-semibold text-white mb-4">Profil</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom complet
              </label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#B76E79] focus:ring-1 focus:ring-[#B76E79]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ton de l'IA
              </label>
              <select
                value={profile.ai_tone}
                onChange={(e) => setProfile({ ...profile, ai_tone: e.target.value })}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#B76E79] focus:ring-1 focus:ring-[#B76E79]"
              >
                <option value="casual">Décontracté</option>
                <option value="professional">Professionnel</option>
                <option value="friendly">Amical</option>
                <option value="enthusiastic">Enthousiaste</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-[#2A2A2A] rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-semibold text-white mb-4">Hashtags de marque</h3>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newHashtag}
              onChange={(e) => setNewHashtag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
              placeholder="Ex: #bijoux #handmade"
              className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#B76E79] focus:ring-1 focus:ring-[#B76E79]"
            />
            <button
              onClick={addHashtag}
              className="px-6 py-3 bg-[#B76E79] text-white rounded-lg hover:bg-[#A05D68] transition-colors"
            >
              Ajouter
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {profile.brand_hashtags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-2 px-3 py-2 bg-[#B76E79]/20 text-[#B76E79] rounded-lg border border-[#B76E79]/30"
              >
                {tag}
                <button
                  onClick={() => removeHashtag(tag)}
                  className="hover:text-white transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
            {profile.brand_hashtags.length === 0 && (
              <p className="text-gray-500 text-sm">Aucun hashtag de marque défini</p>
            )}
          </div>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full bg-[#B76E79] text-white py-3 rounded-lg font-medium hover:bg-[#A05D68] transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
        </button>

        <div className="bg-[#2A2A2A] rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-semibold text-white mb-4">Réseaux sociaux connectés</h3>

          <div className="space-y-3">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              const account = getAccountStatus(platform.id);

              return (
                <div
                  key={platform.id}
                  className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg border border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#2A2A2A] rounded-lg">
                      <Icon />
                    </div>
                    <div>
                      <p className="text-white font-medium">{platform.name}</p>
                      {account && account.username && (
                        <p className="text-sm text-gray-400">@{account.username}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {account && account.is_active ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle size={20} />
                        <span className="text-sm">Connecté</span>
                      </div>
                    ) : (
                      <>
                        {account && !account.is_active && (
                          <div className="flex items-center gap-2 text-red-400">
                            <XCircle size={20} />
                            <span className="text-sm">Déconnecté</span>
                          </div>
                        )}
                        <button
                          onClick={() => connectPlatform(platform.name)}
                          disabled
                          className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed text-sm"
                          title="Configuration OAuth requise"
                        >
                          Connecter
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-400">
              <strong>Note:</strong> La connexion des réseaux sociaux nécessite la configuration
              d'applications OAuth sur chaque plateforme. Les tokens d'accès doivent être stockés
              de manière sécurisée dans la base de données.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
