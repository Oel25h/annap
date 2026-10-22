
-- Restrict has_role: only referenced from RLS, doesn't need to be callable from clients
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;

-- Tighten public INSERT policies with sanity checks (still allow anonymous form submissions)
DROP POLICY "anyone can send a message" ON public.contact_messages;
CREATE POLICY "anyone can send a message" ON public.contact_messages
  FOR INSERT WITH CHECK (
    length(name) BETWEEN 1 AND 200
    AND length(email) BETWEEN 3 AND 320
    AND length(message) BETWEEN 1 AND 5000
    AND enquiry_type IN ('General','Speaking','Media','Partnerships')
  );

DROP POLICY "anyone can subscribe" ON public.subscribers;
CREATE POLICY "anyone can subscribe" ON public.subscribers
  FOR INSERT WITH CHECK (
    length(email) BETWEEN 3 AND 320 AND email LIKE '%_@_%._%'
  );
