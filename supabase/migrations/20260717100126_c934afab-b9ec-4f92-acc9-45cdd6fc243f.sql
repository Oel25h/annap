
-- Lock down SECURITY DEFINER functions and consolidate storage policies

-- 1) has_role: revoke from PUBLIC and anon; keep for authenticated (needed by RLS policies)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- 2) unsubscribe_by_token: no longer exposed via RPC; unsubscribe moves to a
--    server route that verifies the token with the service-role client
DROP FUNCTION IF EXISTS public.unsubscribe_by_token(uuid);

-- 3) storage.objects: consolidate duplicate media-admin policies
DROP POLICY IF EXISTS "admins upload media" ON storage.objects;
DROP POLICY IF EXISTS "admins update media" ON storage.objects;
DROP POLICY IF EXISTS "admins delete media" ON storage.objects;
