import { supabase } from '../lib/supabase'

const ROLE_MAP = { 1: 'usuario', 2: 'gerente', 3: 'administrador' }

async function fetchUserByAuthId(authId) {
  const { data: u } = await supabase
    .from('Usuario')
    .select('ID_CLP, NAME_CLP, USER_CLP, ROLE_CLP')
    .eq('auth_id', authId)
    .single()
  if (!u) return null
  return {
    id:       u.ID_CLP,
    name:     u.NAME_CLP,
    username: u.USER_CLP,
    role:     ROLE_MAP[Number(u.ROLE_CLP)] ?? 'usuario',
  }
}

export async function login({ EMAIL, PASS_CLP }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email:    EMAIL.trim().toLowerCase(),
    password: PASS_CLP,
  })
  if (error) throw error

  const user = await fetchUserByAuthId(data.user.id)
  if (!user) throw new Error('Usuario no encontrado en el sistema')
  return user
}

export async function logout() {
  await supabase.auth.signOut()
}

export async function getSessionUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return fetchUserByAuthId(user.id)
}
