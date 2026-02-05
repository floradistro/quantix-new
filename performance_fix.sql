-- Performance fix: Create RPC function and indexes for fast dashboard loading
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. RPC FUNCTION: Count documents by profile
-- ============================================
DROP FUNCTION IF EXISTS count_documents_by_profile(uuid);

CREATE OR REPLACE FUNCTION count_documents_by_profile(p_store_id uuid)
RETURNS TABLE(profile_id text, doc_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    data->>'profile_id' as profile_id,
    COUNT(*) as doc_count
  FROM store_documents
  WHERE store_id = p_store_id
    AND is_active = true
    AND data->>'profile_id' IS NOT NULL
  GROUP BY data->>'profile_id';
$$;

GRANT EXECUTE ON FUNCTION count_documents_by_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION count_documents_by_profile(uuid) TO anon;

-- ============================================
-- 2. INDEXES: Speed up common queries
-- ============================================

-- Index for profile_id filtering (dashboard profile counts)
CREATE INDEX IF NOT EXISTS idx_store_documents_profile_id
  ON store_documents ((data->>'profile_id'))
  WHERE is_active = true;

-- Composite index for store + profile filtering
CREATE INDEX IF NOT EXISTS idx_store_documents_store_profile
  ON store_documents (store_id, (data->>'profile_id'))
  WHERE is_active = true;

-- Index for document name searches (COA lookup by name)
CREATE INDEX IF NOT EXISTS idx_store_documents_name_lower
  ON store_documents (store_id, lower(document_name))
  WHERE is_active = true;

-- GIN index for faster ILIKE searches on document_name
CREATE INDEX IF NOT EXISTS idx_store_documents_name_trgm
  ON store_documents USING gin (document_name gin_trgm_ops)
  WHERE is_active = true;

-- Enable trigram extension if not already enabled (for above index)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for store + created_at (common sort pattern)
CREATE INDEX IF NOT EXISTS idx_store_documents_store_created
  ON store_documents (store_id, created_at DESC)
  WHERE is_active = true;

-- ============================================
-- 3. ANALYZE: Update statistics
-- ============================================
ANALYZE store_documents;
