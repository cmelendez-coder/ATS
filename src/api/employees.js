import { supabase } from '../lib/supabase'

export async function fetchEmployees() {
  const { data, error } = await supabase
    .from('employee')
    .select('*, client:client_id(id, name)')
    .order('start_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function saveEmployee(emp) {
  const payload = { ...emp }
  delete payload.client
  if (payload.id) {
    const { data, error } = await supabase
      .from('employee')
      .update(payload)
      .eq('id', payload.id)
      .select('*, client:client_id(id, name)')
      .single()
    if (error) throw error
    return data
  } else {
    delete payload.id
    const { data, error } = await supabase
      .from('employee')
      .insert(payload)
      .select('*, client:client_id(id, name)')
      .single()
    if (error) throw error
    return data
  }
}

export async function deleteEmployee(id) {
  const { error } = await supabase.from('employee').delete().eq('id', id)
  if (error) throw error
}

export async function fetchClients() {
  const { data, error } = await supabase
    .from('client')
    .select('id, name')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function fetchEquipment() {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data ?? []
}

export async function saveEquipment(item) {
  const payload = { ...item }
  if (payload.id) {
    const { data, error } = await supabase
      .from('equipment')
      .update(payload)
      .eq('id', payload.id)
      .select('*')
      .single()
    if (error) throw error
    return data
  }
  delete payload.id
  const { data, error } = await supabase
    .from('equipment')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteEquipment(id) {
  const { error } = await supabase.from('equipment').delete().eq('id', id)
  if (error) throw error
}
