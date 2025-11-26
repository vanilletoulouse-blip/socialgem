import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    const { data: postsToPublish, error: fetchError } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        title,
        media_ids,
        scheduled_for,
        post_content (
          id,
          platform,
          content_text,
          hashtags
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .limit(10);

    if (fetchError) throw fetchError;

    if (!postsToPublish || postsToPublish.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucun post à publier', processed: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];

    for (const post of postsToPublish) {
      try {
        const { error: updateError } = await supabase
          .from('posts')
          .update({ status: 'publishing' })
          .eq('id', post.id);

        if (updateError) throw updateError;

        const { data: socialAccounts } = await supabase
          .from('social_accounts')
          .select('*')
          .eq('user_id', post.user_id)
          .eq('is_active', true);

        let successCount = 0;
        let failureCount = 0;

        for (const content of post.post_content) {
          const account = socialAccounts?.find(acc => acc.platform === content.platform);

          if (!account) {
            await supabase
              .from('post_content')
              .update({ error_message: 'Compte non connecté' })
              .eq('id', content.id);
            failureCount++;
            continue;
          }

          try {
            const publishResult = await publishToSocialMedia(
              content.platform,
              content.content_text,
              content.hashtags,
              post.media_ids,
              account
            );

            await supabase
              .from('post_content')
              .update({
                published_url: publishResult.url,
                published_at: new Date().toISOString(),
                error_message: null,
              })
              .eq('id', content.id);

            successCount++;
          } catch (publishError: any) {
            await supabase
              .from('post_content')
              .update({ error_message: publishError.message })
              .eq('id', content.id);
            failureCount++;
          }
        }

        const finalStatus = failureCount === 0 ? 'published' : (successCount > 0 ? 'published' : 'failed');
        await supabase
          .from('posts')
          .update({ status: finalStatus })
          .eq('id', post.id);

        results.push({
          post_id: post.id,
          title: post.title,
          success: successCount,
          failed: failureCount,
        });
      } catch (error: any) {
        await supabase
          .from('posts')
          .update({ status: 'failed' })
          .eq('id', post.id);

        results.push({
          post_id: post.id,
          title: post.title,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Publication terminée',
        processed: postsToPublish.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
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

async function publishToSocialMedia(
  platform: string,
  content: string,
  hashtags: string[],
  mediaIds: string[],
  account: any
): Promise<{ url: string }> {
  const fullContent = `${content}\n\n${hashtags.join(' ')}`;

  switch (platform) {
    case 'instagram':
      return await publishToInstagram(fullContent, mediaIds, account);
    case 'facebook':
      return await publishToFacebook(fullContent, mediaIds, account);
    case 'tiktok':
      return await publishToTikTok(fullContent, mediaIds, account);
    case 'pinterest':
      return await publishToPinterest(fullContent, mediaIds, account);
    default:
      throw new Error(`Plateforme non supportée: ${platform}`);
  }
}

async function publishToInstagram(
  content: string,
  mediaIds: string[],
  account: any
): Promise<{ url: string }> {
  throw new Error('Instagram API nécessite une configuration OAuth complète avec un compte Business');
}

async function publishToFacebook(
  content: string,
  mediaIds: string[],
  account: any
): Promise<{ url: string }> {
  throw new Error('Facebook API nécessite une configuration OAuth complète');
}

async function publishToTikTok(
  content: string,
  mediaIds: string[],
  account: any
): Promise<{ url: string }> {
  throw new Error('TikTok API nécessite une configuration OAuth complète');
}

async function publishToPinterest(
  content: string,
  mediaIds: string[],
  account: any
): Promise<{ url: string }> {
  throw new Error('Pinterest API nécessite une configuration OAuth complète');
}