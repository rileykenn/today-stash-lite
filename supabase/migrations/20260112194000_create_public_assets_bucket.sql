-- Create the bucket 'public_assets'
insert into storage.buckets (id, name, public)
values ('public_assets', 'public_assets', true)
on conflict (id) do nothing;

-- Allow public access to view files
create policy "Public Assets are viewable by everyone"
  on storage.objects for select
  using ( bucket_id = 'public_assets' );

-- Allow authenticated users to upload files
create policy "Authenticated users can upload to public_assets"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'public_assets' );

-- Allow authenticated users to update files
create policy "Authenticated users can update public_assets"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'public_assets' );

-- Allow authenticated users to delete files
create policy "Authenticated users can delete public_assets"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'public_assets' );
