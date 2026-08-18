alter table public.sellers
  drop column if exists erp_seller_code,
  drop column if exists erp_seller_name;
