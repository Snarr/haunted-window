create or replace function public.halloween_api(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
 v_now timestamptz := clock_timestamp();
 v_online boolean;
 v_id uuid;
 v_message text;
 v_row halloween.messages%rowtype;
 v_count integer;
 v_ahead integer;
 v_status jsonb := null;
 v_device halloween.device%rowtype;
begin
 if p_action='device' then
  select * into v_device from halloween.device where id=1 for update;
  if v_device.token_hash is null or (p_data->>'token_hash') is distinct from v_device.token_hash then
   return jsonb_build_object('error','Unauthorized','http_status',401);
  end if;
  update halloween.device set last_seen=v_now where id=1;
  if p_data->>'ack' is not null then
   update halloween.messages set status='done' where id=(p_data->>'ack')::uuid and status='playing';
  end if;
  if p_data->>'current' is not null then
   update halloween.messages set lease=v_now+interval '120 seconds' where id=(p_data->>'current')::uuid and status='playing';
   return jsonb_build_object('message',null);
  end if;
  delete from halloween.messages where created<v_now-interval '1 day';
  select * into v_row from halloween.messages where created>v_now-interval '10 minutes'
   and (status='queued' or (status='playing' and lease<v_now)) order by created,id limit 1 for update skip locked;
  if v_row.id is null then return jsonb_build_object('message',null); end if;
  update halloween.messages set status='playing',lease=v_now+interval '120 seconds' where id=v_row.id;
  return jsonb_build_object('message',jsonb_build_object('id',v_row.id,'message',v_row.message));
 end if;
 if p_action='messages' then
  if jsonb_typeof(p_data->'message') is distinct from 'string' or jsonb_typeof(p_data->'id') is distinct from 'string' then
   return jsonb_build_object('error','Please enter a message.','http_status',400);
  end if;
  v_message=upper(trim(regexp_replace(p_data->>'message','\s+',' ','g')));
  if length(v_message) not between 1 and 60 or v_message !~ '^[ -~]+$' then
   return jsonb_build_object('error','Use 1-60 characters: English letters, numbers and punctuation.','http_status',400);
  end if;
  v_id=(p_data->>'id')::uuid;
  -- Serialize submissions so queue limits remain correct under concurrency.
  select * into v_device from halloween.device where id=1 for update;
  if exists(select 1 from halloween.messages where id=v_id and client=p_data->>'client') then return jsonb_build_object('id',v_id); end if;
  if v_device.last_seen is null or v_device.last_seen<v_now-interval '25 seconds' then
   return jsonb_build_object('error','The display is offline. Try again when the light turns green.','http_status',503);
  end if;
  select count(*) into v_count from halloween.messages where status in ('queued','playing') and created>v_now-interval '10 minutes';
  if v_count>=10 then
   return jsonb_build_object('error','The queue is full. Please try again shortly.','http_status',429);
  end if;
  insert into halloween.messages(id,message,client,created) values(v_id,v_message,p_data->>'client',v_now);
  return jsonb_build_object('id',v_id,'http_status',201);
 end if;
 if p_action='status' then
  select last_seen>v_now-interval '25 seconds' into v_online from halloween.device where id=1;
  select count(*) into v_count from halloween.messages where status in ('queued','playing') and created>v_now-interval '10 minutes';
  if p_data->>'id' is not null then
   select * into v_row from halloween.messages where id=(p_data->>'id')::uuid;
   if v_row.id is not null then
    select count(*) into v_ahead from halloween.messages where status in ('queued','playing') and created>v_now-interval '10 minutes' and (created,id)<(v_row.created,v_row.id);
    v_status=jsonb_build_object('status',case when v_row.status='queued' and v_row.created<v_now-interval '10 minutes' then 'expired' else v_row.status end,'ahead',v_ahead);
   end if;
  end if;
  return jsonb_build_object('online',coalesce(v_online,false),'queued',v_count,'message',v_status);
 end if;
 return jsonb_build_object('error','Not found','http_status',404);
exception when invalid_text_representation then
 return jsonb_build_object('error','Invalid message identifier','http_status',400);
end;
$$;
revoke all on function public.halloween_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.halloween_api(text,jsonb) to service_role;
