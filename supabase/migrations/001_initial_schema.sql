-- ============================================================
-- RestaurantOS — Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ROLES (admin, manager, cashier)
-- ============================================================
create type user_role as enum ('admin', 'manager', 'cashier');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        user_role not null default 'cashier',
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'User'), 
          coalesce((new.raw_user_meta_data->>'role')::user_role, 'cashier'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- RESTAURANT INFO
-- ============================================================
create table restaurant (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  address       text,
  phone         text,
  gstin         text,
  fssai         text,
  logo_url      text,
  cgst_rate     numeric(5,2) not null default 2.5,
  sgst_rate     numeric(5,2) not null default 2.5,
  currency      text not null default 'INR',
  created_at    timestamptz not null default now()
);

-- Insert default restaurant
insert into restaurant (name, cgst_rate, sgst_rate)
values ('My Restaurant', 2.5, 2.5);

-- ============================================================
-- TABLES (dining tables)
-- ============================================================
create type table_status as enum ('available', 'occupied', 'reserved', 'cleaning');

create table dining_tables (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,          -- e.g. "T1", "T2", "Terrace 1"
  capacity    int not null default 4,
  section     text not null default 'Main Hall',
  status      table_status not null default 'available',
  position_x  int not null default 0, -- for floor map
  position_y  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Sample tables
insert into dining_tables (name, capacity, section, position_x, position_y) values
('T1', 2, 'Main Hall', 0, 0),
('T2', 4, 'Main Hall', 1, 0),
('T3', 4, 'Main Hall', 2, 0),
('T4', 6, 'Main Hall', 0, 1),
('T5', 4, 'Main Hall', 1, 1),
('T6', 2, 'Main Hall', 2, 1),
('T7', 4, 'Terrace',   0, 0),
('T8', 4, 'Terrace',   1, 0);

-- ============================================================
-- MENU CATEGORIES
-- ============================================================
create table categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into categories (name, sort_order) values
('Starters', 1), ('Main Course', 2), ('Breads', 3),
('Rice & Biryani', 4), ('Drinks', 5), ('Desserts', 6);

-- ============================================================
-- MENU ITEMS
-- ============================================================
create type food_type as enum ('veg', 'non_veg', 'egg');

create table menu_items (
  id            uuid primary key default uuid_generate_v4(),
  category_id   uuid not null references categories(id) on delete restrict,
  name          text not null,
  description   text,
  price         numeric(10,2) not null,
  food_type     food_type not null default 'veg',
  image_url     text,
  is_available  boolean not null default true,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- Sample items
insert into menu_items (category_id, name, price, food_type) 
select id, 'Paneer Tikka', 220, 'veg' from categories where name = 'Starters';
insert into menu_items (category_id, name, price, food_type)
select id, 'Chicken 65', 250, 'non_veg' from categories where name = 'Starters';
insert into menu_items (category_id, name, price, food_type)
select id, 'Veg Biryani', 180, 'veg' from categories where name = 'Rice & Biryani';
insert into menu_items (category_id, name, price, food_type)
select id, 'Chicken Biryani', 220, 'non_veg' from categories where name = 'Rice & Biryani';
insert into menu_items (category_id, name, price, food_type)
select id, 'Butter Naan', 40, 'veg' from categories where name = 'Breads';
insert into menu_items (category_id, name, price, food_type)
select id, 'Mango Lassi', 80, 'veg' from categories where name = 'Drinks';

-- ============================================================
-- ORDERS
-- ============================================================
create type order_status as enum ('open', 'kot_printed', 'served', 'billed', 'paid', 'cancelled');
create type order_type as enum ('dine_in', 'takeaway', 'delivery');

create table orders (
  id              uuid primary key default uuid_generate_v4(),
  order_number    serial,               -- human-readable order number
  table_id        uuid references dining_tables(id),
  order_type      order_type not null default 'dine_in',
  status          order_status not null default 'open',
  customer_name   text,
  customer_phone  text,
  guests          int not null default 1,
  notes           text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
create type item_status as enum ('pending', 'preparing', 'ready', 'served', 'cancelled');

create table order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references orders(id) on delete cascade,
  item_id     uuid not null references menu_items(id),
  item_name   text not null,    -- snapshot at time of order
  item_price  numeric(10,2) not null,
  quantity    int not null default 1,
  notes       text,
  status      item_status not null default 'pending',
  created_at  timestamptz not null default now()
);

-- ============================================================
-- BILLS
-- ============================================================
create type payment_method as enum ('cash', 'upi', 'card', 'split');
create type bill_status as enum ('draft', 'paid', 'cancelled', 'refunded');

create table bills (
  id              uuid primary key default uuid_generate_v4(),
  bill_number     serial,
  order_id        uuid not null references orders(id),
  subtotal        numeric(10,2) not null,
  discount_type   text,               -- 'flat' or 'percent'
  discount_value  numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  cgst_rate       numeric(5,2) not null,
  sgst_rate       numeric(5,2) not null,
  cgst_amount     numeric(10,2) not null,
  sgst_amount     numeric(10,2) not null,
  total_amount    numeric(10,2) not null,
  payment_method  payment_method not null default 'cash',
  cash_given      numeric(10,2),
  change_amount   numeric(10,2),
  status          bill_status not null default 'draft',
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);

-- ============================================================
-- KOT (Kitchen Order Tickets)
-- ============================================================
create table kot (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references orders(id) on delete cascade,
  kot_number  serial,
  items       jsonb not null,   -- snapshot of items at print time
  printed_at  timestamptz not null default now(),
  printed_by  uuid references profiles(id)
);

-- ============================================================
-- INVENTORY
-- ============================================================
create table inventory_items (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  unit          text not null default 'kg',   -- kg, litre, piece, etc.
  current_stock numeric(10,3) not null default 0,
  min_stock     numeric(10,3) not null default 0,  -- low stock threshold
  cost_per_unit numeric(10,2),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table inventory_logs (
  id            uuid primary key default uuid_generate_v4(),
  item_id       uuid not null references inventory_items(id),
  change_type   text not null,   -- 'add', 'deduct', 'adjust'
  quantity      numeric(10,3) not null,
  notes         text,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles          enable row level security;
alter table restaurant        enable row level security;
alter table dining_tables     enable row level security;
alter table categories        enable row level security;
alter table menu_items        enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table bills             enable row level security;
alter table kot               enable row level security;
alter table inventory_items   enable row level security;
alter table inventory_logs    enable row level security;

-- All authenticated users can read core data
create policy "authenticated read" on profiles         for select using (auth.role() = 'authenticated');
create policy "authenticated read" on restaurant       for select using (auth.role() = 'authenticated');
create policy "authenticated read" on dining_tables    for select using (auth.role() = 'authenticated');
create policy "authenticated read" on categories       for select using (auth.role() = 'authenticated');
create policy "authenticated read" on menu_items       for select using (auth.role() = 'authenticated');
create policy "authenticated read" on orders           for select using (auth.role() = 'authenticated');
create policy "authenticated read" on order_items      for select using (auth.role() = 'authenticated');
create policy "authenticated read" on bills            for select using (auth.role() = 'authenticated');
create policy "authenticated read" on kot              for select using (auth.role() = 'authenticated');
create policy "authenticated read" on inventory_items  for select using (auth.role() = 'authenticated');
create policy "authenticated read" on inventory_logs   for select using (auth.role() = 'authenticated');

-- All authenticated users can write orders (cashier needs this)
create policy "authenticated write orders"      on orders       for all using (auth.role() = 'authenticated');
create policy "authenticated write order items" on order_items  for all using (auth.role() = 'authenticated');
create policy "authenticated write bills"       on bills        for all using (auth.role() = 'authenticated');
create policy "authenticated write kot"         on kot          for all using (auth.role() = 'authenticated');
create policy "authenticated write tables"      on dining_tables for update using (auth.role() = 'authenticated');

-- Inventory — manager + admin only (enforced in app layer too)
create policy "auth write inventory" on inventory_items for all using (auth.role() = 'authenticated');
create policy "auth write inv logs"  on inventory_logs  for all using (auth.role() = 'authenticated');

-- Restaurant & menu — admin only (enforced in app layer)
create policy "auth write restaurant" on restaurant   for all using (auth.role() = 'authenticated');
create policy "auth write categories" on categories   for all using (auth.role() = 'authenticated');
create policy "auth write menu"       on menu_items   for all using (auth.role() = 'authenticated');

-- ============================================================
-- REALTIME (for live KOT updates)
-- ============================================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table dining_tables;
alter publication supabase_realtime add table kot;

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Today's sales summary
create or replace view daily_summary as
select
  date_trunc('day', b.created_at) as sale_date,
  count(b.id)                      as total_bills,
  sum(b.subtotal)                  as subtotal,
  sum(b.discount_amount)           as total_discount,
  sum(b.cgst_amount + b.sgst_amount) as total_tax,
  sum(b.total_amount)              as total_revenue,
  count(case when b.payment_method = 'cash' then 1 end) as cash_count,
  count(case when b.payment_method = 'upi'  then 1 end) as upi_count,
  count(case when b.payment_method = 'card' then 1 end) as card_count
from bills b
where b.status = 'paid'
group by 1
order by 1 desc;

-- Active orders with table name
create or replace view active_orders as
select
  o.*,
  t.name as table_name,
  t.section as table_section,
  count(oi.id) as item_count,
  sum(oi.quantity * oi.item_price) as running_total
from orders o
left join dining_tables t on o.table_id = t.id
left join order_items oi on o.id = oi.order_id and oi.status != 'cancelled'
where o.status in ('open', 'kot_printed', 'served')
group by o.id, t.name, t.section;

-- ============================================================
-- PHASE 2 TABLES
-- ============================================================

-- SHIFTS
create table shifts (
  id           uuid primary key default uuid_generate_v4(),
  opened_by    uuid references profiles(id),
  opened_at    timestamptz not null default now(),
  closed_at    timestamptz,
  opening_cash numeric(10,2) not null default 0,
  closing_cash numeric(10,2),
  total_sales  numeric(10,2),
  cash_sales   numeric(10,2),
  upi_sales    numeric(10,2),
  card_sales   numeric(10,2),
  status       text not null default 'open'
);

-- CUSTOMERS
create table customers (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  phone          text unique not null,
  email          text,
  birthday       date,
  loyalty_points int not null default 0,
  visit_count    int not null default 0,
  total_spent    numeric(10,2) not null default 0,
  tier           text not null default 'Silver',
  created_at     timestamptz not null default now()
);

-- COUPONS
create table coupons (
  id          uuid primary key default uuid_generate_v4(),
  code        text unique not null,
  type        text not null default 'percent',
  value       numeric(10,2) not null,
  min_order   numeric(10,2) not null default 0,
  max_uses    int not null default 100,
  used_count  int not null default 0,
  expiry      date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- FEEDBACK
create table feedback (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid references orders(id),
  customer_name text,
  rating        int not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now()
);

-- SUPPLIERS
create table suppliers (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  phone      text,
  email      text,
  address    text,
  gst        text,
  created_at timestamptz not null default now()
);

-- PURCHASE ORDERS
create table purchase_orders (
  id            uuid primary key default uuid_generate_v4(),
  supplier_id   uuid references suppliers(id),
  expected_date date,
  lines         jsonb not null default '[]',
  total_amount  numeric(10,2) not null default 0,
  status        text not null default 'pending',
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- GRN
create table grn (
  id           uuid primary key default uuid_generate_v4(),
  grn_number   serial,
  po_id        uuid references purchase_orders(id),
  supplier_id  uuid references suppliers(id),
  lines        jsonb not null default '[]',
  total_amount numeric(10,2) not null default 0,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

-- RECIPES / BOM
create table recipes (
  id           uuid primary key default uuid_generate_v4(),
  menu_item_id uuid unique references menu_items(id),
  ingredients  jsonb not null default '[]',
  created_at   timestamptz not null default now()
);

-- WASTAGE
create table wastage (
  id          uuid primary key default uuid_generate_v4(),
  item_id     uuid references inventory_items(id),
  qty         numeric(10,3) not null,
  reason      text,
  cost        numeric(10,2),
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- Enable RLS on new tables
alter table shifts          enable row level security;
alter table customers       enable row level security;
alter table coupons         enable row level security;
alter table feedback        enable row level security;
alter table suppliers       enable row level security;
alter table purchase_orders enable row level security;
alter table grn             enable row level security;
alter table recipes         enable row level security;
alter table wastage         enable row level security;

-- Policies for new tables
create policy "auth all shifts"   on shifts          for all using (auth.role() = 'authenticated');
create policy "auth all customers" on customers      for all using (auth.role() = 'authenticated');
create policy "auth all coupons"  on coupons         for all using (auth.role() = 'authenticated');
create policy "auth all feedback" on feedback        for all using (auth.role() = 'authenticated');
create policy "auth all suppliers" on suppliers      for all using (auth.role() = 'authenticated');
create policy "auth all po"       on purchase_orders for all using (auth.role() = 'authenticated');
create policy "auth all grn"      on grn             for all using (auth.role() = 'authenticated');
create policy "auth all recipes"  on recipes         for all using (auth.role() = 'authenticated');
create policy "auth all wastage"  on wastage         for all using (auth.role() = 'authenticated');

-- Add to realtime
alter publication supabase_realtime add table shifts;
alter publication supabase_realtime add table customers;

-- ============================================================
-- PHASE 3 TABLES
-- ============================================================

-- BRANCHES (multi-location)
create table branches (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  address       text,
  phone         text,
  gstin         text,
  manager_email text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- EXPENSES
create table expenses (
  id          uuid primary key default uuid_generate_v4(),
  category    text not null,
  amount      numeric(10,2) not null,
  description text,
  date        date not null default current_date,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- MENU PUSH LOG (for multi-branch)
create table menu_push_log (
  id                uuid primary key default uuid_generate_v4(),
  pushed_at         timestamptz not null default now(),
  categories_count  int,
  items_count       int,
  branches_count    int
);

-- Add missing columns to bills for multi-payment
alter table bills add column if not exists payments jsonb;

-- Enable RLS
alter table branches       enable row level security;
alter table expenses       enable row level security;
alter table menu_push_log  enable row level security;

create policy "auth all branches"  on branches      for all using (auth.role() = 'authenticated');
create policy "auth all expenses"  on expenses      for all using (auth.role() = 'authenticated');
create policy "auth all pushlog"   on menu_push_log for all using (auth.role() = 'authenticated');

-- ============================================================
-- USEFUL FUNCTIONS
-- ============================================================

-- Decrement stock function (used by wastage)
create or replace function decrement(x numeric)
returns numeric language sql as $$
  select greatest(0, x)
$$;
