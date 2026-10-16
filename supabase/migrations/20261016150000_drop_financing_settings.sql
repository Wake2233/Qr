-- Last step of remove_financing: the APR table and lender-network size are no longer read by
-- any released app (web and mobile stopped selecting them in the previous release).
alter table public.site_settings
  drop column apr_by_tier,
  drop column lender_network_size;
