create policy "Staff read request attachments" on storage.objects for select to authenticated
  using (bucket_id = 'request-attachments' and public.is_staff(auth.uid()));
create policy "Master deletes request attachments" on storage.objects for delete to authenticated
  using (bucket_id = 'request-attachments' and public.has_role(auth.uid(), 'master'));