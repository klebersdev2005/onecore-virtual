-- OneCore Virtual — schema inicial
-- Tabelas, constraints, índices, triggers de integridade e RLS.


-- ---------------------------------------------------------------- enums
create type public.user_role as enum ('customer', 'admin');
create type public.availability as enum ('available', 'unavailable', 'to_confirm');
create type public.order_status as enum (
  'pending_payment', 'paid', 'preparing', 'ordered_from_supplier',
  'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'canceled', 'refunded'
);
create type public.payment_status as enum ('pending', 'approved', 'rejected', 'canceled', 'refunded');
create type public.payment_method as enum ('pix', 'card');
create type public.review_status as enum ('pending', 'published', 'rejected');

-- ---------------------------------------------------------------- perfis
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  cpf text check (cpf is null or cpf ~ '^\d{11}$'),
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Verificação de admin usada por todas as políticas (security definer evita recursão de RLS).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  recipient text not null,
  cep text not null check (cep ~ '^\d{8}$'),
  street text not null,
  number text not null,
  complement text,
  district text not null,
  city text not null,
  state char(2) not null check (state ~ '^[A-Z]{2}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

-- ---------------------------------------------------------------- catálogo
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  intro text not null default '',
  image_url text,
  art jsonb,
  sort int not null default 0,
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  image_url text,
  art jsonb,
  sort int not null default 0,
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  category_id uuid references public.categories (id) on delete set null,
  short_description text not null default '',
  overview text not null default '',
  features text[] not null default '{}',
  specs jsonb not null default '{}',
  dimensions text,
  materials text,
  package_contents text[],
  compatibility text,
  usage text,
  care text,
  price_cents int not null check (price_cents > 0),
  -- Preço anterior só com comparação legítima: precisa ser maior que o atual.
  compare_at_price_cents int check (compare_at_price_cents is null or compare_at_price_cents > price_cents),
  availability public.availability not null default 'available',
  is_active boolean not null default true,
  is_new boolean not null default false,
  tags text[] not null default '{}',
  art jsonb,
  seo_title text,
  seo_description text,
  -- Agregados mantidos por trigger a partir de avaliações publicadas.
  rating_avg numeric(2, 1),
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id) where is_active;
create index products_created_idx on public.products (created_at desc) where is_active;

create table public.product_collections (
  product_id uuid not null references public.products (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  primary key (product_id, collection_id)
);
create index product_collections_coll_idx on public.product_collections (collection_id);

-- Cada linha é uma opção de um grupo (ex.: name='Cor', value='Preto').
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  value text not null,
  price_delta_cents int not null default 0,
  is_active boolean not null default true,
  sort int not null default 0,
  unique (product_id, name, value)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  storage_path text,
  alt text not null,
  width int not null default 1200,
  height int not null default 1200,
  sort int not null default 0
);
create index product_images_product_idx on public.product_images (product_id, sort);

-- ---------------------------------------------------------------- configurações da loja
create table public.store_settings (
  id int primary key default 1 check (id = 1),
  shipping_flat_cents int check (shipping_flat_cents is null or shipping_flat_cents >= 0),
  free_shipping_min_cents int check (free_shipping_min_cents is null or free_shipping_min_cents > 0),
  shipping_days_min int check (shipping_days_min is null or shipping_days_min > 0),
  shipping_days_max int check (shipping_days_max is null or shipping_days_max >= shipping_days_min),
  contact_email text,
  contact_whatsapp text,
  company_name text,
  cnpj text,
  company_address text,
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1);

-- ---------------------------------------------------------------- pedidos
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number int not null unique default nextval('public.order_number_seq'),
  user_id uuid not null references auth.users (id) on delete restrict,
  status public.order_status not null default 'pending_payment',
  customer_name text not null,
  email text not null,
  phone text,
  cpf text check (cpf is null or cpf ~ '^\d{11}$'),
  shipping_address jsonb not null,
  subtotal_cents int not null check (subtotal_cents >= 0),
  shipping_cents int not null check (shipping_cents >= 0),
  total_cents int not null,
  payment_method public.payment_method not null,
  accepted_terms_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_check check (total_cents = subtotal_cents + shipping_cents)
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_slug text not null,
  product_name text not null,
  variant jsonb not null default '{}',
  unit_price_cents int not null check (unit_price_cents > 0),
  quantity int not null check (quantity between 1 and 10),
  line_total_cents int generated always as (unit_price_cents * quantity) stored
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_payment_id text unique,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  status_detail text,
  amount_cents int not null check (amount_cents > 0),
  installments int,
  pix_qr_code text,
  pix_qr_base64 text,
  pix_expires_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);

-- Payload bruto das notificações do provedor (somente admin).
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments (id) on delete cascade,
  provider_payment_id text,
  status text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Dados internos de aquisição (somente admin).
create table public.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  supplier_name text not null,
  supplier_order_ref text,
  purchased_at timestamptz,
  cost_cents int check (cost_cents is null or cost_cents >= 0),
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index supplier_orders_order_idx on public.supplier_orders (order_id);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  carrier text not null,
  tracking_code text not null,
  tracking_url text,
  shipped_at timestamptz not null,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index shipments_order_idx on public.shipments (order_id);

create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  status public.order_status not null,
  description text not null,
  location text,
  occurred_at timestamptz not null,
  source text not null default 'admin' check (source in ('admin', 'carrier')),
  created_at timestamptz not null default now()
);
create index shipment_events_shipment_idx on public.shipment_events (shipment_id, occurred_at);

-- Linha do tempo real do pedido (gerada por trigger a cada mudança de status).
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- Observações internas e auditoria (somente admin).
create table public.order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  author_id uuid references auth.users (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id bigserial primary key,
  actor_id uuid,
  table_name text not null,
  record_id text,
  action text not null,
  changes jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- avaliações
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_item_id uuid not null unique references public.order_items (id) on delete cascade,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text not null check (char_length(body) between 10 and 3000),
  verified_purchase boolean not null default false,
  status public.review_status not null default 'pending',
  moderation_reason text,
  moderated_by uuid,
  moderated_at timestamptz,
  report_count int not null default 0,
  created_at timestamptz not null default now()
);
create index reviews_product_idx on public.reviews (product_id, created_at desc) where status = 'published';

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (review_id, user_id)
);

-- ================================================================ triggers

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

-- Cria o perfil ao cadastrar um usuário.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Somente admin altera papel de usuário.
create or replace function public.guard_profile_role() returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and not public.is_admin() and auth.uid() is not null then
    raise exception 'Somente administradores podem alterar papéis';
  end if;
  return new;
end $$;
create trigger profiles_guard_role before update on public.profiles for each row execute function public.guard_profile_role();

-- Um único endereço padrão por usuário.
create or replace function public.single_default_address() returns trigger language plpgsql as $$
begin
  if new.is_default then
    update public.addresses set is_default = false where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end $$;
create trigger addresses_single_default after insert or update of is_default on public.addresses
  for each row when (new.is_default) execute function public.single_default_address();

-- Integridade de status do pedido: nada de "pago" sem pagamento aprovado
-- nem "enviado" sem envio registrado.
create or replace function public.validate_order_status() returns trigger language plpgsql as $$
declare
  has_approved boolean;
  has_shipment boolean;
begin
  if new.status = old.status then return new; end if;
  select exists (select 1 from public.payments where order_id = new.id and status in ('approved', 'refunded')) into has_approved;
  select exists (select 1 from public.shipments where order_id = new.id) into has_shipment;

  if new.status in ('paid', 'preparing', 'ordered_from_supplier', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'refunded')
     and not has_approved then
    raise exception 'Pedido % sem pagamento aprovado não pode ir para %', new.number, new.status;
  end if;
  if new.status in ('shipped', 'in_transit', 'out_for_delivery', 'delivered') and not has_shipment then
    raise exception 'Registre o envio (transportadora e rastreio) antes de marcar o pedido como %', new.status;
  end if;
  if old.status in ('canceled', 'refunded') then
    raise exception 'Pedido % já está encerrado (%)', new.number, old.status;
  end if;
  return new;
end $$;
create trigger orders_validate_status before update of status on public.orders
  for each row execute function public.validate_order_status();

create or replace function public.log_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by) values (new.id, null, new.status, auth.uid());
  elsif new.status <> old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by) values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger orders_log_status after insert or update of status on public.orders
  for each row execute function public.log_order_status();

-- Avaliações: compra verificada definida pelo sistema; somente após a entrega;
-- moderação não pode reescrever o conteúdo do cliente.
create or replace function public.prepare_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ok boolean;
begin
  if tg_op = 'INSERT' then
    select exists (
      select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
      where oi.id = new.order_item_id and o.user_id = new.user_id
        and oi.product_id = new.product_id and o.status = 'delivered'
    ) into ok;
    if not ok then raise exception 'Avaliação permitida apenas para produtos comprados e entregues'; end if;
    new.verified_purchase := true;
    new.status := 'pending';
    new.report_count := 0;
  else
    if new.rating <> old.rating or new.body <> old.body or new.title is distinct from old.title
       or new.user_id <> old.user_id or new.author_name <> old.author_name then
      raise exception 'O conteúdo da avaliação não pode ser alterado';
    end if;
    new.verified_purchase := old.verified_purchase;
    if new.status <> old.status then
      new.moderated_by := auth.uid();
      new.moderated_at := now();
    end if;
  end if;
  return new;
end $$;
create trigger reviews_prepare before insert or update on public.reviews for each row execute function public.prepare_review();

create or replace function public.refresh_product_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  pid uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p set
    rating_count = s.cnt,
    rating_avg = case when s.cnt > 0 then round(s.avg, 1) else null end
  from (select count(*)::int cnt, avg(rating) avg from public.reviews where product_id = pid and status = 'published') s
  where p.id = pid;
  return null;
end $$;
create trigger reviews_rating after insert or update or delete on public.reviews for each row execute function public.refresh_product_rating();

create or replace function public.count_review_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.reviews set report_count = report_count + 1 where id = new.review_id;
  return new;
end $$;
-- report_count é incrementado direto (ignora guarda de conteúdo pois só muda contador)
create trigger review_reports_count after insert on public.review_reports for each row execute function public.count_review_report();

-- Auditoria das alterações administrativas.
create or replace function public.audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.admin_audit_log (actor_id, table_name, record_id, action, changes)
  values (auth.uid(), tg_table_name, coalesce(new.id, old.id)::text, tg_op,
          case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return null;
end $$;
create trigger audit_orders after update on public.orders for each row execute function public.audit();
create trigger audit_products after insert or update or delete on public.products for each row execute function public.audit();
create trigger audit_supplier_orders after insert or update or delete on public.supplier_orders for each row execute function public.audit();
create trigger audit_shipments after insert or update or delete on public.shipments for each row execute function public.audit();
create trigger audit_reviews after update on public.reviews for each row execute function public.audit();

-- ================================================================ RLS
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_collections enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.supplier_orders enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_notes enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.reviews enable row level security;
alter table public.review_reports enable row level security;

-- perfis e endereços: o próprio usuário; admin lê
create policy profiles_self_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy addresses_owner on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy addresses_admin_read on public.addresses for select using (public.is_admin());

-- catálogo: leitura pública do que está ativo; escrita só admin
create policy categories_read on public.categories for select using (is_active or public.is_admin());
create policy categories_admin on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy collections_read on public.collections for select using (is_active or public.is_admin());
create policy collections_admin on public.collections for all using (public.is_admin()) with check (public.is_admin());
create policy products_read on public.products for select using (is_active or public.is_admin());
create policy products_admin on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy product_collections_read on public.product_collections for select using (true);
create policy product_collections_admin on public.product_collections for all using (public.is_admin()) with check (public.is_admin());
create policy product_variants_read on public.product_variants for select using (is_active or public.is_admin());
create policy product_variants_admin on public.product_variants for all using (public.is_admin()) with check (public.is_admin());
create policy product_images_read on public.product_images for select using (true);
create policy product_images_admin on public.product_images for all using (public.is_admin()) with check (public.is_admin());
create policy store_settings_read on public.store_settings for select using (true);
create policy store_settings_admin on public.store_settings for update using (public.is_admin()) with check (public.is_admin());

-- pedidos: criados apenas pelo backend (service_role); cliente lê os próprios; admin gerencia
create policy orders_owner_read on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy orders_admin_update on public.orders for update using (public.is_admin()) with check (public.is_admin());
create policy order_items_read on public.order_items for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy payments_read on public.payments for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy payment_events_admin on public.payment_events for select using (public.is_admin());
create policy supplier_orders_admin on public.supplier_orders for all using (public.is_admin()) with check (public.is_admin());
create policy shipments_read on public.shipments for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy shipments_admin on public.shipments for all using (public.is_admin()) with check (public.is_admin());
create policy shipment_events_read on public.shipment_events for select using (
  public.is_admin() or exists (select 1 from public.shipments s join public.orders o on o.id = s.order_id
                               where s.id = shipment_id and o.user_id = auth.uid()));
create policy shipment_events_admin on public.shipment_events for all using (public.is_admin()) with check (public.is_admin());
create policy order_status_history_read on public.order_status_history for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy order_notes_admin on public.order_notes for all using (public.is_admin()) with check (public.is_admin());
create policy audit_admin on public.admin_audit_log for select using (public.is_admin());

-- avaliações: público lê publicadas; autor lê as suas; só o comprador cria (admin NÃO cria em nome de cliente)
create policy reviews_public_read on public.reviews for select using (status = 'published' or user_id = auth.uid() or public.is_admin());
create policy reviews_buyer_insert on public.reviews for insert with check (user_id = auth.uid());
create policy reviews_admin_moderate on public.reviews for update using (public.is_admin()) with check (public.is_admin());
create policy review_reports_insert on public.review_reports for insert with check (user_id = auth.uid());
create policy review_reports_admin on public.review_reports for select using (public.is_admin());
create policy review_reports_admin_update on public.review_reports for update using (public.is_admin()) with check (public.is_admin());

-- ================================================================ storage (imagens de produtos)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict do nothing;
    execute $p$create policy "product images public read" on storage.objects for select using (bucket_id = 'product-images')$p$;
    execute $p$create policy "product images admin write" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin())$p$;
    execute $p$create policy "product images admin update" on storage.objects for update using (bucket_id = 'product-images' and public.is_admin())$p$;
    execute $p$create policy "product images admin delete" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin())$p$;
  end if;
end $$;
