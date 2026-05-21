// Roles: 1=usuario, 2=gerente, 3=administrador
const RULES = {
  'requirements.create':     ['gerente', 'administrador'],
  'requirements.edit':       ['gerente', 'administrador'],
  'requirements.delete':     ['gerente', 'administrador'],
  'requirements.approve':    ['administrador'],
  'requirements.pipeline':   ['usuario', 'gerente', 'administrador'],
  'talent.create':           ['gerente', 'administrador'],
  'talent.edit':             ['gerente', 'administrador'],
  'talent.delete':           ['gerente', 'administrador'],
  'talent.pipeline':         ['usuario', 'gerente', 'administrador'],
  'clients.create':          ['gerente', 'administrador'],
  'clients.contacts.manage': ['gerente', 'administrador'],
  'users.manage':            ['administrador'],
}

export function can(role, permission) {
  const allowed = RULES[permission]
  if (!allowed) return false
  return allowed.includes((role ?? '').toLowerCase())
}
