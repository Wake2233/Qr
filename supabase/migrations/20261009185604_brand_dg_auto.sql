-- The business is "DG Auto": the column default and the not-yet-customized row follow it.
-- Admins still change the brand from the site settings page.
alter table public.site_settings alter column brand_name set default 'DG Auto';

update public.site_settings set brand_name = 'DG Auto' where brand_name = 'Car Platform';
