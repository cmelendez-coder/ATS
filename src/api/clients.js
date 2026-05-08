import { supabase } from '../lib/supabase'

const CLIENT_COLUMNS = 'id, name, sector, country, office_location, business_hours, benefits, headquarters_location, timezone, notes'

export async function listClients() {
  const [{ data: clients, error: cErr }, { data: contacts, error: ctErr }] = await Promise.all([
    supabase.from('client').select(CLIENT_COLUMNS).order('name'),
    supabase.from('client_contact').select('id, client_id, name, job_title, email, mobile, location, timezone').order('id'),
  ])
  if (cErr) throw cErr
  if (ctErr) throw ctErr
  return (clients ?? []).map(c => ({
    ...c,
    contacts: (contacts ?? []).filter(ct => ct.client_id === c.id),
  }))
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
