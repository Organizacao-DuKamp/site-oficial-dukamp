
INSERT INTO public.categories (slug, name, sort_order) VALUES
  ('racoes-gado-corte', 'Rações Gado de Corte', 10),
  ('racoes-gado-leiteiro', 'Rações Gado Leiteiro', 11),
  ('nucleos', 'Núcleos', 12),
  ('concentrados', 'Concentrados', 13),
  ('proteinados-energeticos', 'Proteinados Energéticos', 14),
  ('equinos-racoes', 'Equinos - Rações', 15),
  ('ovinos-racoes', 'Ovinos - Rações', 16),
  ('confinamento-grao-inteiro', 'Confinamento Grão Inteiro', 17),
  ('aditivados-premium', 'Aditivados Premium', 18)
ON CONFLICT (slug) DO NOTHING;
