-- Estrutura inicial editável pelo painel. Não inclui produtos:
-- o catálogo real deve ser cadastrado em /admin/produtos.
insert into public.categories (slug, name, description, intro, art, sort) values
  ('acessorios-automotivos', 'Acessórios automotivos', 'Praticidade e organização para quem passa tempo no carro.', 'Suportes, carregadores e organizadores para deixar o carro mais prático no dia a dia.', '{"kind":"holder","tone":"#FFE7D6"}', 1),
  ('casa-e-organizacao', 'Casa e organização', 'Itens que deixam cada espaço mais leve e funcional.', 'Organizadores, iluminação e utilidades para a casa.', '{"kind":"organizer","tone":"#ECEFF3"}', 2),
  ('tecnologia-e-acessorios', 'Tecnologia e acessórios', 'Áudio, energia e conexão para acompanhar seu ritmo.', 'Fones, carregadores e cabos para o seu setup.', '{"kind":"earbuds","tone":"#E8ECF7"}', 3),
  ('dia-a-dia', 'Acessórios para o dia a dia', 'Companheiros de rotina: bolsas, garrafas e carteiras.', 'Itens para levar com você todos os dias.', '{"kind":"backpack","tone":"#EFEDE8"}', 4),
  ('novidades', 'Novidades', 'O que acabou de chegar ao catálogo.', 'Produtos adicionados recentemente ao catálogo.', '{"kind":"box","tone":"#FFF0E5"}', 5)
on conflict (slug) do nothing;
