
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_position INTEGER;

CREATE INDEX IF NOT EXISTS products_category_position_idx
  ON public.products (catalog_id, category_position)
  WHERE category_position IS NOT NULL;

CREATE OR REPLACE FUNCTION public.check_product_category_position()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  conflict_name TEXT;
BEGIN
  IF NEW.category_position IS NULL OR NEW.catalog_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.category_position < 1 THEN
    RAISE EXCEPTION 'A posição na categoria deve ser 1 ou maior.';
  END IF;
  SELECT name INTO conflict_name FROM public.products
    WHERE catalog_id = NEW.catalog_id
      AND category_position = NEW.category_position
      AND id <> NEW.id
    LIMIT 1;
  IF conflict_name IS NOT NULL THEN
    RAISE EXCEPTION 'A posição % já está ocupada pelo produto %. Escolha outra posição.', NEW.category_position, conflict_name;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS check_product_category_position_trg ON public.products;
CREATE TRIGGER check_product_category_position_trg
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.check_product_category_position();

UPDATE public.catalogs SET sort_order = 1000 WHERE sort_order IS NULL OR sort_order < 1000;
UPDATE public.catalogs SET sort_order = 1 WHERE slug = 'racoes-gado-corte';
UPDATE public.catalogs SET sort_order = 2 WHERE slug = 'proteinados-energeticos';
UPDATE public.catalogs SET sort_order = 3 WHERE slug = 'concentrados';
UPDATE public.catalogs SET sort_order = 4 WHERE slug = 'nucleos';
UPDATE public.catalogs SET sort_order = 5 WHERE slug = 'confinamento-grao-inteiro';
UPDATE public.catalogs SET sort_order = 6 WHERE slug = 'equinos';
UPDATE public.catalogs SET sort_order = 7 WHERE slug = 'ovinos';
UPDATE public.catalogs SET sort_order = 8 WHERE slug = 'aditivados-premium';
UPDATE public.catalogs SET sort_order = 9 WHERE slug = 'racoes-gado-leiteiro';
