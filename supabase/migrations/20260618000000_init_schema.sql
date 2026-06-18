-- Create custom profiles table linking to Supabase auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Trigger to automatically create a profile entry when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Subscriptions Table (Razorpay Integration)
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null check (status in ('active', 'trialing', 'past_due', 'cancelled')),
  razorpay_subscription_id text unique,
  razorpay_plan_id text,
  current_period_end timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Accounts Table
create table public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('bank', 'credit', 'cash', 'investment')),
  balance numeric(12,2) default 0.00 not null,
  currency text default 'INR' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.accounts enable row level security;

create policy "Users can CRUD their own accounts" on public.accounts
  for all using (auth.uid() = user_id);

-- Transactions Table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  account_id uuid references public.accounts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  description text not null,
  amount numeric(12,2) not null,
  category text not null,
  type text not null check (type in ('income', 'expense')),
  is_pending boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.transactions enable row level security;

create policy "Users can CRUD their own transactions" on public.transactions
  for all using (auth.uid() = user_id);

create index idx_transactions_user_date on public.transactions(user_id, date desc);

-- Budgets Table
create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  limit_amount numeric(12,2) not null,
  current_spent numeric(12,2) default 0.00 not null,
  period text default 'monthly' not null check (period in ('monthly', 'yearly')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, category, period)
);

alter table public.budgets enable row level security;

create policy "Users can CRUD their own budgets" on public.budgets
  for all using (auth.uid() = user_id);

-- AI Coach Conversations
create table public.ai_coach_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ai_coach_conversations enable row level security;

create policy "Users can CRUD their own conversations" on public.ai_coach_conversations
  for all using (auth.uid() = user_id);

-- AI Coach Messages
create table public.ai_coach_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.ai_coach_conversations(id) on delete cascade not null,
  sender text not null check (sender in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ai_coach_messages enable row level security;

create policy "Users can view messages in their conversations" on public.ai_coach_messages
  for select using (
    exists (
      select 1 from public.ai_coach_conversations c 
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in their conversations" on public.ai_coach_messages
  for insert with check (
    exists (
      select 1 from public.ai_coach_conversations c 
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
