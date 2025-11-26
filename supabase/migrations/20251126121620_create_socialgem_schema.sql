/*
  # SocialGem Database Schema

  ## Overview
  Complete database structure for SocialGem - a multi-social-network post management platform with AI optimization.

  ## Tables Created

  ### 1. profiles
  Extends Supabase auth.users with additional user information:
  - id: References auth.users(id)
  - full_name: User's display name
  - avatar_url: Profile picture
  - brand_hashtags: Array of brand-specific hashtags
  - ai_tone: Preferred AI writing tone (casual, professional, friendly)
  - created_at, updated_at: Timestamps

  ### 2. social_accounts
  Stores connected social media accounts with OAuth tokens:
  - id: Primary key
  - user_id: References profiles
  - platform: Social network name (instagram, tiktok, facebook, pinterest)
  - platform_user_id: User ID on the social platform
  - username: Display username
  - access_token: Encrypted OAuth access token
  - refresh_token: Encrypted OAuth refresh token
  - token_expires_at: Token expiration timestamp
  - is_active: Connection status
  - metadata: Additional platform-specific data (JSON)

  ### 3. media_library
  Central storage for all uploaded media files:
  - id: Primary key
  - user_id: References profiles
  - file_url: Supabase storage URL
  - file_type: Media type (image, video)
  - filename: Original filename
  - file_size: Size in bytes
  - tags: Array of searchable tags
  - collection: Collection name (e.g., "Bagues", "Colliers")
  - thumbnail_url: Preview thumbnail URL
  - created_at: Upload timestamp

  ### 4. posts
  Core table for social media posts (scheduled, published, draft):
  - id: Primary key
  - user_id: References profiles
  - title: Internal post title
  - media_ids: Array of media_library IDs
  - scheduled_for: Publication date/time
  - status: draft, scheduled, publishing, published, failed
  - created_at, updated_at: Timestamps

  ### 5. post_content
  Platform-specific content for each post:
  - id: Primary key
  - post_id: References posts
  - platform: Target social network
  - content_text: Optimized post text
  - hashtags: Array of hashtags
  - is_optimized: Whether AI optimization was applied
  - seo_score: AI-generated SEO score (0-100)
  - suggestions: AI improvement suggestions
  - best_time_to_post: AI-recommended posting time
  - published_url: URL after successful publication
  - published_at: Actual publication timestamp
  - error_message: Error details if publication failed

  ### 6. collections
  Organize media into collections:
  - id: Primary key
  - user_id: References profiles
  - name: Collection name
  - description: Optional description
  - created_at: Creation timestamp

  ## Security
  - Row Level Security (RLS) enabled on ALL tables
  - Users can only access their own data
  - Authenticated access required for all operations
  - Comprehensive policies for SELECT, INSERT, UPDATE, DELETE

  ## Important Notes
  - All tokens stored in social_accounts should be encrypted at application level
  - Media files stored in Supabase Storage (separate from database)
  - CRON job will check posts table every minute for scheduled posts
  - AI optimization via Claude API (configured in application)
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  brand_hashtags text[] DEFAULT '{}',
  ai_tone text DEFAULT 'professional',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Social accounts table
CREATE TABLE IF NOT EXISTS social_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'facebook', 'pinterest')),
  platform_user_id text,
  username text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social accounts"
  ON social_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social accounts"
  ON social_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social accounts"
  ON social_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own social accounts"
  ON social_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collections"
  ON collections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON collections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Media library table
CREATE TABLE IF NOT EXISTS media_library (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video')),
  filename text NOT NULL,
  file_size bigint,
  tags text[] DEFAULT '{}',
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media"
  ON media_library FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media"
  ON media_library FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media"
  ON media_library FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
  ON media_library FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  media_ids uuid[] DEFAULT '{}',
  scheduled_for timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own posts"
  ON posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Post content table (platform-specific content)
CREATE TABLE IF NOT EXISTS post_content (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'facebook', 'pinterest')),
  content_text text NOT NULL,
  hashtags text[] DEFAULT '{}',
  is_optimized boolean DEFAULT false,
  seo_score integer CHECK (seo_score >= 0 AND seo_score <= 100),
  suggestions text,
  best_time_to_post timestamptz,
  published_url text,
  published_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(post_id, platform)
);

ALTER TABLE post_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own post content"
  ON post_content FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_content.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own post content"
  ON post_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_content.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own post content"
  ON post_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_content.post_id
      AND posts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_content.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own post content"
  ON post_content FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_content.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_media_library_user_id ON media_library(user_id);
CREATE INDEX IF NOT EXISTS idx_media_library_collection_id ON media_library(collection_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_for ON posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_post_content_post_id ON post_content(post_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_social_accounts_updated_at') THEN
    CREATE TRIGGER update_social_accounts_updated_at
      BEFORE UPDATE ON social_accounts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_posts_updated_at') THEN
    CREATE TRIGGER update_posts_updated_at
      BEFORE UPDATE ON posts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_post_content_updated_at') THEN
    CREATE TRIGGER update_post_content_updated_at
      BEFORE UPDATE ON post_content
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;