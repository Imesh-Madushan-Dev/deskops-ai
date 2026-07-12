-- Enable http extension for pg_cron to POST to the job worker API
create extension if not exists http;

-- Schedule the job worker to run every 5 minutes via HTTP POST
-- Before deploying, replace:
--   - YOUR_DEPLOYMENT_URL with your actual hosting domain (e.g., https://my-app.vercel.app)
--   - YOUR_CRON_SECRET with the actual value of CRON_SECRET from your deployment environment
-- The endpoint /api/jobs/worker expects Authorization: Bearer <CRON_SECRET> header
select cron.schedule(
  'process-deskops-jobs',
  '*/5 * * * *',
  'select http_post(''https://YOUR_DEPLOYMENT_URL/api/jobs/worker'', '''', ''application/json'', ''{"Authorization": "Bearer YOUR_CRON_SECRET"}'', ''{}'');'
);
