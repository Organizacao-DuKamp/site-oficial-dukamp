-- Flexible option groups are part of the product and inherit its existing RLS.
ALTER TABLE public.products
  ADD COLUMN options jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) <= 20);

-- Preserve the chosen labels and photo even if the catalog changes later.
ALTER TABLE public.order_items
  ADD COLUMN selected_options jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(selected_options) = 'array' AND jsonb_array_length(selected_options) <= 20);

COMMENT ON COLUMN public.products.options IS 'Option groups with stable IDs, names and alternatives (label and optional image).';
COMMENT ON COLUMN public.order_items.selected_options IS 'Server-resolved snapshot of the alternatives selected for this order item.';
