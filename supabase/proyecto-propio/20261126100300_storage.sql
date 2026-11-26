-- FutbolLab Sesiones · 0004 · almacenamiento privado de notas de voz y vídeos propios.
-- Ruta obligatoria: <id del usuario>/<id del archivo>. Nadie lee el de otro.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audios', 'audios', false, 10485760, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'])
on conflict (id) do nothing;

create policy audios_propios_ver on storage.objects for select to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy audios_propios_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'audios' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy audios_propios_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = (select auth.uid())::text);
