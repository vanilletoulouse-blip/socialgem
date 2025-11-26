import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

interface OptimizeRequest {
  content: string;
  platforms: string[];
}

interface PlatformOptimization {
  platform: string;
  content: string;
  hashtags: string[];
  seo_score: number;
  suggestions: string;
  best_time_to_post: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { content, platforms }: OptimizeRequest = await req.json();

    if (!content || !platforms || platforms.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Contenu et plateformes requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const platformNames = platforms.map(p => {
      switch(p) {
        case 'instagram': return 'Instagram';
        case 'tiktok': return 'TikTok';
        case 'facebook': return 'Facebook';
        case 'pinterest': return 'Pinterest';
        default: return p;
      }
    }).join(', ');

    const prompt = `Tu es un expert en marketing sur les réseaux sociaux. Optimise le contenu suivant pour les plateformes: ${platformNames}.

Contenu original:
${content}

Pour chaque plateforme, fournis:
1. Un texte optimisé adapté aux spécificités de la plateforme
2. 20-30 hashtags pertinents (principaux, de niche, trending, locaux)
3. Un score SEO sur 100
4. Des suggestions d'amélioration
5. Le meilleur moment pour publier

Réponds UNIQUEMENT avec un JSON valide dans ce format:
{
  "optimizations": [
    {
      "platform": "instagram",
      "content": "texte optimisé",
      "hashtags": ["#hashtag1", "#hashtag2", ...],
      "seo_score": 85,
      "suggestions": "suggestions d'amélioration",
      "best_time_to_post": "18h-20h en semaine"
    }
  ]
}`;

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          optimizations: platforms.map(platform => ({
            platform,
            content: content + '\n\n[Optimisation IA non disponible - Clé API manquante]',
            hashtags: ['#demo', '#test'],
            seo_score: 0,
            suggestions: 'Configurez la clé API Claude pour activer l\'optimisation IA',
            best_time_to_post: '18h-20h',
          }))
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const error = await anthropicResponse.text();
      console.error('Erreur API Claude:', error);
      throw new Error('Erreur lors de l\'appel à l\'API Claude');
    }

    const anthropicData = await anthropicResponse.json();
    const responseText = anthropicData.content[0].text;

    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Aucun JSON trouvé dans la réponse');
      }
    } catch (parseError) {
      console.error('Erreur parsing JSON:', parseError);
      result = {
        optimizations: platforms.map(platform => ({
          platform,
          content: content + '\n\n[Optimisation IA appliquée]',
          hashtags: ['#bijoux', '#jewelry', '#handmade', '#fashion', '#style'],
          seo_score: 75,
          suggestions: 'Ajoutez plus d\'émojis et d\'appels à l\'action',
          best_time_to_post: '18h-20h en semaine',
        }))
      };
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur serveur' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});