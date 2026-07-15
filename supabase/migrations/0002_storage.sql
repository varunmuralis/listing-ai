-- Storage bucket for imported property images.
-- Objects are keyed by `<project_id>/<image_id>` so access can be gated by
-- project ownership. The bucket is public-read for simplicity of image display;
-- writes are restricted to owners of the enclosing project.

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

create policy "property images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'property-images');

create policy "owners can write property images"
  on storage.objects for insert
  with check (
    bucket_id = 'property-images'
    and owns_project((storage.foldername(name))[1]::uuid)
  );

create policy "owners can update property images"
  on storage.objects for update
  using (
    bucket_id = 'property-images'
    and owns_project((storage.foldername(name))[1]::uuid)
  );

create policy "owners can delete property images"
  on storage.objects for delete
  using (
    bucket_id = 'property-images'
    and owns_project((storage.foldername(name))[1]::uuid)
  );
