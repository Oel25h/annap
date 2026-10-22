# Vercel cutover

## Done
- Netlify removed (`netlify.toml`, `.netlify`, `netlify-cli`, scripts)
- Nitro preset `vercel`; `build:vercel` + gate; `vercel.json`
- Project: `anastasia-heartfelt-journey` (jbittss-projects)
- Production alias: https://anastasia-heartfelt-journey.vercel.app
- Env on Vercel: Supabase (server + VITE public), ADMIN_SETUP_SECRET, GEMINI_TRANSLATE_MODEL, SITE_URL/VITE_SITE_URL
- Missing local: GEMINI_API_KEY (skipped)
- LOVABLE_PREVIEW_HOST stripped from local .env

## Still open
- Custom domain (optional)
- GEMINI_API_KEY if admin Greek translate needed
- Admin E2E with login
- Git remote push
