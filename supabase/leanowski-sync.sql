-- Sky-synk til Leanowski Beer Pong Liga.
--
-- Kør hele filen én gang i Supabase → SQL Editor → New query → Run.
-- Den kan køres igen uden at ødelægge noget.
--
-- Sikkerhedsmodellen: appen kører i en offentlig HTML-side, så anon-nøglen
-- kan læses af alle. Derfor har anon INGEN direkte adgang til tabellen —
-- kun til to funktioner der kræver at man kender liga-koden. Koden er en
-- lang tilfældig streng, så man kan ikke gætte eller liste sig frem til den.
-- Den der har koden kan læse og skrive ligaen. Del den kun med dem der
-- skal kunne rette i sæsonen.

create table if not exists public.leagues (
  id          text primary key,
  data        jsonb       not null,
  rev         bigint      not null default 1,
  updated_at  timestamptz not null default now()
);

alter table public.leagues enable row level security;

-- Ingen politikker = ingen direkte adgang for anon. Al adgang går gennem
-- funktionerne nedenfor, der kører som ejeren (security definer).
revoke all on public.leagues from anon, authenticated;

-- Hent ligaen. Kender man ikke koden, får man ingenting.
create or replace function public.league_get(p_id text)
returns table (data jsonb, rev bigint, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select l.data, l.rev, l.updated_at
    from public.leagues l
   where l.id = p_id;
$$;

-- Gem ligaen.
--   p_rev = 0  -> opret ny liga. Returnerer null hvis koden er optaget.
--   p_rev > 0  -> opdatér, men kun hvis ingen andre har gemt i mellemtiden.
--                 Returnerer null ved konflikt, så appen kan spørge brugeren
--                 i stedet for at overskrive en anden enheds aften.
create or replace function public.league_put(p_id text, p_data jsonb, p_rev bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_rev bigint;
begin
  if p_id is null or length(p_id) < 12 then
    raise exception 'Liga-koden er for kort';
  end if;

  if p_rev = 0 then
    insert into public.leagues (id, data, rev)
         values (p_id, p_data, 1)
    on conflict (id) do nothing
      returning rev into new_rev;
    return new_rev;
  end if;

  update public.leagues
     set data = p_data,
         rev = p_rev + 1,
         updated_at = now()
   where id = p_id
     and rev = p_rev
  returning rev into new_rev;

  return new_rev;
end;
$$;

grant execute on function public.league_get(text)                 to anon;
grant execute on function public.league_put(text, jsonb, bigint)  to anon;
