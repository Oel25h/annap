
-- Replace permissive anon UPDATE with a token-scoped SECURITY DEFINER function
DROP POLICY IF EXISTS "unsubscribe by token" ON public.subscribers;
REVOKE UPDATE ON public.subscribers FROM anon;

CREATE OR REPLACE FUNCTION public.unsubscribe_by_token(_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected int;
BEGIN
  UPDATE public.subscribers SET status='unsubscribed' WHERE unsubscribe_token = _token AND status <> 'unsubscribed';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;
GRANT EXECUTE ON FUNCTION public.unsubscribe_by_token(uuid) TO anon, authenticated;
