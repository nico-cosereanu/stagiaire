-- =============================================================================
-- Stagiaire — Row-Level Security & Auth Bridge
-- =============================================================================
--
-- This file is hand-written (Drizzle does not manage RLS). It applies once
-- as a single migration; subsequent policy changes go in db/policies/0001_*.sql
-- and so on.
--
-- Architecture:
--   - public.users mirrors auth.users via the handle_new_user() trigger
--   - users.role is the source of truth for authorization (NEVER trust JWT
--     user_metadata; raw_app_meta_data is acceptable but only at signup)
--   - Every table in the public schema has RLS ENABLED
--   - Policies use auth.uid() for the current user; anonymous requests have
--     auth.uid() = NULL and pass only policies that explicitly allow anon
--
-- Roles:
--   - 'stagiaire' — aspiring chef, can submit stage requests
--   - 'restaurant_owner' — claims & manages a restaurant_profile
--   - 'admin' — moderation, claim approval, dispute resolution
--
-- =============================================================================
-- 1. Helpers
-- =============================================================================

-- Returns true if the current user has admin role.
-- SECURITY INVOKER so it respects RLS on public.users (which lets each user
-- see their own row — sufficient for a self-check).
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;


-- =============================================================================
-- 2. Auth bridge — public.users mirrors auth.users
-- =============================================================================

-- Trigger function. SECURITY DEFINER so it can write to public.users
-- regardless of the new user's RLS context (which doesn't exist yet at
-- INSERT-on-auth.users time anyway).
--
-- Role assignment:
--   - Reads from raw_app_meta_data->>'role' (set by signup server actions
--     using the secret/service-role key — users cannot set this themselves).
--   - Defaults to 'stagiaire' if missing.
--   - REFUSES 'admin' from signup. Admins are promoted manually via
--     service-role queries; they never self-signup.
--
-- raw_user_meta_data is NEVER read here. The supabase skill's first security
-- rule: "Never use user_metadata claims in JWT-based authorization decisions"
-- — the same caveat applies to the trigger that establishes the role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_role public.user_role;
begin
  v_role := coalesce(
    nullif(new.raw_app_meta_data->>'role', '')::public.user_role,
    'stagiaire'::public.user_role
  );

  -- Self-signup as admin is refused; downgrade silently to stagiaire.
  if v_role = 'admin' then
    v_role := 'stagiaire';
  end if;

  insert into public.users (id, email, role, email_verified_at)
  values (new.id, new.email, v_role, new.email_confirmed_at);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- =============================================================================
-- 3. Enable RLS on every public table
-- =============================================================================

alter table public.users               enable row level security;
alter table public.stagiaire_profiles  enable row level security;
alter table public.restaurant_profiles enable row level security;
alter table public.restaurant_claims   enable row level security;
alter table public.team_members        enable row level security;
alter table public.experiences         enable row level security;
alter table public.dishes              enable row level security;
alter table public.references          enable row level security;
alter table public.stage_requests      enable row level security;
alter table public.messages            enable row level security;
alter table public.reviews             enable row level security;
alter table public.notifications       enable row level security;
alter table public.audit_log           enable row level security;


-- =============================================================================
-- 4. users — own row + admin
-- =============================================================================
-- INSERT is exclusively via the auth trigger (SECURITY DEFINER bypasses RLS).
-- UPDATE is exclusively via service role (no client-side mutation; admin
--   changes role via admin tooling that uses the secret key).
-- DELETE cascades from auth.users deletion (handled by Supabase).

create policy users_select_own
  on public.users for select
  using (id = auth.uid());

create policy users_select_admin
  on public.users for select
  using (public.is_admin());


-- =============================================================================
-- 5. stagiaire_profiles — public read; self write
-- =============================================================================

create policy stagiaire_profiles_select_public
  on public.stagiaire_profiles for select
  using (true);

create policy stagiaire_profiles_insert_self
  on public.stagiaire_profiles for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'stagiaire'
    )
  );

create policy stagiaire_profiles_update_self
  on public.stagiaire_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy stagiaire_profiles_delete_self_or_admin
  on public.stagiaire_profiles for delete
  using (user_id = auth.uid() or public.is_admin());


-- =============================================================================
-- 6. restaurant_profiles — public read; owner update; admin write
-- =============================================================================

create policy restaurant_profiles_select_public
  on public.restaurant_profiles for select
  using (true);

create policy restaurant_profiles_insert_admin
  on public.restaurant_profiles for insert
  with check (public.is_admin());

create policy restaurant_profiles_update_owner
  on public.restaurant_profiles for update
  using (claimed_by_user_id = auth.uid())
  with check (claimed_by_user_id = auth.uid());

create policy restaurant_profiles_update_admin
  on public.restaurant_profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create policy restaurant_profiles_delete_admin
  on public.restaurant_profiles for delete
  using (public.is_admin());


-- =============================================================================
-- 7. restaurant_claims — claimant + admin see; claimant submits; admin reviews
-- =============================================================================

create policy restaurant_claims_select_claimant
  on public.restaurant_claims for select
  using (user_id = auth.uid());

create policy restaurant_claims_select_admin
  on public.restaurant_claims for select
  using (public.is_admin());

create policy restaurant_claims_insert_self
  on public.restaurant_claims for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'restaurant_owner'
    )
  );

create policy restaurant_claims_update_admin
  on public.restaurant_claims for update
  using (public.is_admin())
  with check (public.is_admin());

create policy restaurant_claims_delete_admin
  on public.restaurant_claims for delete
  using (public.is_admin());


-- =============================================================================
-- 8. team_members — public read; restaurant owner + admin write
-- =============================================================================

create policy team_members_select_public
  on public.team_members for select
  using (true);

create policy team_members_insert_owner_or_admin
  on public.team_members for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.restaurant_profiles
      where id = team_members.restaurant_id
        and claimed_by_user_id = auth.uid()
    )
  );

create policy team_members_update_owner_or_admin
  on public.team_members for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.restaurant_profiles
      where id = team_members.restaurant_id
        and claimed_by_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.restaurant_profiles
      where id = team_members.restaurant_id
        and claimed_by_user_id = auth.uid()
    )
  );

create policy team_members_delete_owner_or_admin
  on public.team_members for delete
  using (
    public.is_admin()
    or exists (
      select 1 from public.restaurant_profiles
      where id = team_members.restaurant_id
        and claimed_by_user_id = auth.uid()
    )
  );


-- =============================================================================
-- 9. experiences — public read; own write
-- =============================================================================

create policy experiences_select_public
  on public.experiences for select
  using (true);

create policy experiences_insert_own
  on public.experiences for insert
  with check (stagiaire_id = auth.uid());

create policy experiences_update_own
  on public.experiences for update
  using (stagiaire_id = auth.uid())
  with check (stagiaire_id = auth.uid());

create policy experiences_delete_own_or_admin
  on public.experiences for delete
  using (stagiaire_id = auth.uid() or public.is_admin());


-- =============================================================================
-- 10. dishes — public read; own write
-- =============================================================================

create policy dishes_select_public
  on public.dishes for select
  using (true);

create policy dishes_insert_own
  on public.dishes for insert
  with check (stagiaire_id = auth.uid());

create policy dishes_update_own
  on public.dishes for update
  using (stagiaire_id = auth.uid())
  with check (stagiaire_id = auth.uid());

create policy dishes_delete_own_or_admin
  on public.dishes for delete
  using (stagiaire_id = auth.uid() or public.is_admin());


-- =============================================================================
-- 11. references — public sees only confirmed; owner sees all
-- =============================================================================
-- Referee email is sensitive; pending references hidden from the public.

create policy references_select_public_confirmed
  on public.references for select
  using (status = 'confirmed');

create policy references_select_own
  on public.references for select
  using (stagiaire_id = auth.uid());

create policy references_select_admin
  on public.references for select
  using (public.is_admin());

create policy references_insert_own
  on public.references for insert
  with check (stagiaire_id = auth.uid());

-- Confirmation flow runs server-side via service role using the magic-link
-- token, so no client UPDATE policy is needed beyond admin's.
create policy references_update_admin
  on public.references for update
  using (public.is_admin())
  with check (public.is_admin());

create policy references_delete_own_or_admin
  on public.references for delete
  using (stagiaire_id = auth.uid() or public.is_admin());


-- =============================================================================
-- 12. stage_requests — stagiaire owns; restaurant owner sees own restaurant's
-- =============================================================================

create policy stage_requests_select_stagiaire
  on public.stage_requests for select
  using (stagiaire_id = auth.uid());

create policy stage_requests_select_restaurant_owner
  on public.stage_requests for select
  using (
    restaurant_id in (
      select id from public.restaurant_profiles
      where claimed_by_user_id = auth.uid()
    )
  );

create policy stage_requests_select_admin
  on public.stage_requests for select
  using (public.is_admin());

create policy stage_requests_insert_stagiaire
  on public.stage_requests for insert
  with check (
    stagiaire_id = auth.uid()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'stagiaire'
    )
  );

-- Stagiaire can update own (e.g. withdraw); restaurant owner can update
-- requests for their restaurant (e.g. accept/decline). Admin can update any.
create policy stage_requests_update_stagiaire
  on public.stage_requests for update
  using (stagiaire_id = auth.uid())
  with check (stagiaire_id = auth.uid());

create policy stage_requests_update_restaurant_owner
  on public.stage_requests for update
  using (
    restaurant_id in (
      select id from public.restaurant_profiles
      where claimed_by_user_id = auth.uid()
    )
  )
  with check (
    restaurant_id in (
      select id from public.restaurant_profiles
      where claimed_by_user_id = auth.uid()
    )
  );

create policy stage_requests_update_admin
  on public.stage_requests for update
  using (public.is_admin())
  with check (public.is_admin());

-- No DELETE policy; stage_requests are part of the audit trail and never
-- removed via the app. Admin-only deletion goes through service role.


-- =============================================================================
-- 13. messages — only parties to the parent stage_request
-- =============================================================================

create policy messages_select_party
  on public.messages for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.stage_requests sr
      where sr.id = messages.stage_request_id
        and (
          sr.stagiaire_id = auth.uid()
          or exists (
            select 1 from public.restaurant_profiles rp
            where rp.id = sr.restaurant_id
              and rp.claimed_by_user_id = auth.uid()
          )
        )
    )
  );

create policy messages_insert_party
  on public.messages for insert
  with check (
    sender_user_id = auth.uid()
    and exists (
      select 1 from public.stage_requests sr
      where sr.id = messages.stage_request_id
        and (
          sr.stagiaire_id = auth.uid()
          or exists (
            select 1 from public.restaurant_profiles rp
            where rp.id = sr.restaurant_id
              and rp.claimed_by_user_id = auth.uid()
          )
        )
    )
  );

-- Recipients update read_at; senders never edit body. Restricted via app.
create policy messages_update_party
  on public.messages for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.stage_requests sr
      where sr.id = messages.stage_request_id
        and (
          sr.stagiaire_id = auth.uid()
          or exists (
            select 1 from public.restaurant_profiles rp
            where rp.id = sr.restaurant_id
              and rp.claimed_by_user_id = auth.uid()
          )
        )
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.stage_requests sr
      where sr.id = messages.stage_request_id
        and (
          sr.stagiaire_id = auth.uid()
          or exists (
            select 1 from public.restaurant_profiles rp
            where rp.id = sr.restaurant_id
              and rp.claimed_by_user_id = auth.uid()
          )
        )
    )
  );

-- No DELETE policy; messages are part of the record.


-- =============================================================================
-- 14. reviews — public sees once visible_at <= now(); author + parties always
-- =============================================================================

create policy reviews_select_public_visible
  on public.reviews for select
  using (visible_at is not null and visible_at <= now());

create policy reviews_select_party
  on public.reviews for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.stage_requests sr
      where sr.id = reviews.stage_request_id
        and (
          sr.stagiaire_id = auth.uid()
          or exists (
            select 1 from public.restaurant_profiles rp
            where rp.id = sr.restaurant_id
              and rp.claimed_by_user_id = auth.uid()
          )
        )
    )
  );

-- Author inserts their own review. Direction enforces who can write what:
--   s_to_r: must be the stagiaire on the request
--   r_to_s: must be the restaurant owner of the request's restaurant
create policy reviews_insert_author
  on public.reviews for insert
  with check (
    (
      direction = 's_to_r'
      and exists (
        select 1 from public.stage_requests sr
        where sr.id = reviews.stage_request_id
          and sr.stagiaire_id = auth.uid()
      )
    )
    or (
      direction = 'r_to_s'
      and exists (
        select 1 from public.stage_requests sr
        join public.restaurant_profiles rp on rp.id = sr.restaurant_id
        where sr.id = reviews.stage_request_id
          and rp.claimed_by_user_id = auth.uid()
      )
    )
  );

-- Reviews are immutable post-submission. Admin updates (e.g. moderation
-- hide) go through service role; no client UPDATE policy needed.

create policy reviews_delete_admin
  on public.reviews for delete
  using (public.is_admin());


-- =============================================================================
-- 15. notifications — own inbox
-- =============================================================================

create policy notifications_select_own
  on public.notifications for select
  using (user_id = auth.uid());

create policy notifications_select_admin
  on public.notifications for select
  using (public.is_admin());

-- INSERT happens server-side via service role (no client policy).

create policy notifications_update_own
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_delete_own_or_admin
  on public.notifications for delete
  using (user_id = auth.uid() or public.is_admin());


-- =============================================================================
-- 16. audit_log — admin only
-- =============================================================================

create policy audit_log_select_admin
  on public.audit_log for select
  using (public.is_admin());

-- INSERT exclusively via service role from server actions. No client policies
-- for INSERT/UPDATE/DELETE — the audit log is append-only and immutable.


-- =============================================================================
-- End of file. After running, verify with:
--   select * from public.is_admin();      -- should return false (not signed in)
--   get_advisors(security)                -- should report zero rls_disabled errors
-- =============================================================================
