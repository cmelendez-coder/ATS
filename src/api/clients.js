import { supabase } from '../lib/supabase'

const CLIENT_COLUMNS = 'id, name, sector, country, office_location, business_hours, benefits, headquarters_location, timezone, notes'
const CLIENT_MUTABLE_FIELDS = ['name', 'sector', 'country', 'office_location', 'business_hours', 'benefits', 'headquarters_location', 'timezone', 'notes']
const PIPELINE_STAGE_COLUMNS = 'stage_id, name, color, position, client_id'

export async function listClients() {
  const [{ data: clients, error: cErr }, { data: contacts, error: ctErr }, { data: stages, error: stErr }] = await Promise.all([
    supabase.from('client').select(CLIENT_COLUMNS).order('name'),
    supabase.from('client_contact').select('id, client_id, name, job_title, email, mobile, location, timezone').order('id'),
    supabase.from('catalog_pipeline_stage').select(PIPELINE_STAGE_COLUMNS).order('position').order('stage_id'),
  ])
  if (cErr) throw cErr
  if (ctErr) throw ctErr
  if (stErr) throw stErr
  return (clients ?? []).map(c => ({
    ...c,
    contacts: (contacts ?? []).filter(ct => ct.client_id === c.id),
    stages:   (stages ?? []).filter(stage => stage.client_id === c.id),
  }))
}

export async function createClient(payload) {
  const clean = Object.fromEntries(
    CLIENT_MUTABLE_FIELDS.map(k => [k, payload[k]?.trim?.() ? payload[k].trim() : payload[k] ?? null])
  )

  const { data, error } = await supabase
    .from('client')
    .insert(clean)
    .select(CLIENT_COLUMNS)
    .single()
  if (error) throw error
  return { ...data, contacts: [], stages: [] }
}

const CLIENT_UPDATABLE = ['sector', 'country', 'office_location', 'business_hours', 'benefits', 'headquarters_location', 'timezone', 'notes']

export async function updateClient(id, payload) {
  const clean = Object.fromEntries(
    CLIENT_UPDATABLE.map(k => [k, payload[k] ?? null])
  )
  const { error } = await supabase.from('client').update(clean).eq('id', id)
  if (error) throw error
}

export async function createContact(clientId, payload) {
  const { data, error } = await supabase
    .from('client_contact')
    .insert({ client_id: clientId, ...payload })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateContact(id, payload) {
  const { data, error } = await supabase
    .from('client_contact')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteContact(id) {
  const { error } = await supabase.from('client_contact').delete().eq('id', id)
  if (error) throw error
}

function cleanStagePayload(payload) {
  return {
    name: payload.name?.trim() || null,
    color: payload.color?.trim() || '#1D4ED8',
    position: Number(payload.position) || 1,
  }
}

export async function createClientStage(clientId, payload) {
  const { data, error } = await supabase
    .from('catalog_pipeline_stage')
    .insert({ client_id: clientId, ...cleanStagePayload(payload) })
    .select(PIPELINE_STAGE_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function updateClientStage(stageId, payload) {
  const { data, error } = await supabase
    .from('catalog_pipeline_stage')
    .update(cleanStagePayload(payload))
    .eq('stage_id', stageId)
    .select(PIPELINE_STAGE_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function deleteClientStage(stageId) {
  const { error } = await supabase
    .from('catalog_pipeline_stage')
    .delete()
    .eq('stage_id', stageId)
  if (error) throw error
}
