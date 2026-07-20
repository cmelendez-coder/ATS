import { supabase } from '../lib/supabase'

// ─── Internal helper: upsert a catalog row and return its PK ─────
async function upsertCatalog(table, nameCol, idCol, value) {
  if (!value?.trim()) return null
  const { data, error } = await supabase
    .from(table)
    .upsert({ [nameCol]: value.trim() }, { onConflict: nameCol })
    .select(idCol)
    .single()
  if (error) throw error
  return data[idCol]
}

// ─── Search / list candidates ─────────────────────────────────────
// Searches across: full_name, email, role name, technology names, and skillset notes (all OR'd)
export async function searchCandidates({ q = '', englishMin = '', englishMax = '' } = {}) {
  let baseQuery = supabase
    .from('candidate')
    .select(`
      candidate_id, candidate_code, full_name, email, phone, source,
      english_score, years_experience, cv_url, linkedin_url,
      status:catalog_status!status_id(name),
      seniority:catalog_seniority!seniority_id(name),
      location:catalog_location!location_id(name),
      role:catalog_role!role_id(name),
      candidate_availability(availability_id, last_contact_date, recorded_at),
      candidate_stack(technology:catalog_technology!technology_id(ct_name_tech))
    `)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (englishMin !== '') baseQuery = baseQuery.gte('english_score', Number(englishMin))
  if (englishMax !== '') baseQuery = baseQuery.lte('english_score', Number(englishMax))

  if (!q.trim()) {
    const { data, error } = await baseQuery
    if (error) throw error
    return data ?? []
  }

  const term = q.trim()

  // Parallel lookups in related tables
  const [techData, roleData, noteData] = await Promise.all([
    supabase.from('catalog_technology').select('technology_id').ilike('ct_name_tech', `%${term}%`),
    supabase.from('catalog_role').select('role_id').ilike('name', `%${term}%`),
    supabase.from('candidate_note').select('candidate_id').ilike('note_text', `%${term}%`).eq('note_type', 'skillset'),
  ])

  // Resolve tech IDs → candidate IDs via candidate_stack
  let techCandIds = []
  if (techData.data?.length) {
    const { data: stackRows } = await supabase
      .from('candidate_stack')
      .select('candidate_id')
      .in('technology_id', techData.data.map(r => r.technology_id))
    techCandIds = (stackRows ?? []).map(r => r.candidate_id)
  }

  // Merge all indirect candidate IDs (tech + skillset notes)
  const extraIds = [...new Set([
    ...techCandIds,
    ...(noteData.data ?? []).map(r => r.candidate_id),
  ])]

  // Build OR: name, email, role, bdd legacy columns, and all indirect matches
  const conditions = [
    `full_name.ilike.%${term}%`,
    `bdd_role.ilike.%${term}%`,
    `bdd_technology.ilike.%${term}%`,
    `bdd_module.ilike.%${term}%`,
    `bdd_skills.ilike.%${term}%`,
  ]
  if (roleData.data?.length) {
    conditions.push(`role_id.in.(${roleData.data.map(r => r.role_id).join(',')})`)
  }
  if (extraIds.length) {
    conditions.push(`candidate_id.in.(${extraIds.join(',')})`)
  }

  const { data, error } = await baseQuery.or(conditions.join(','))
  if (error) throw error
  return data ?? []
}

// ─── Get a single candidate with all related data ─────────────────
export async function getCandidate(code) {
  const { data, error } = await supabase
    .from('candidate')
    .select(`
      *,
      status:catalog_status!status_id(name),
      seniority:catalog_seniority!seniority_id(name),
      location:catalog_location!location_id(name),
      role:catalog_role!role_id(name),
      hiring_pref:catalog_hiring_preference!hiring_preference_id(name),
      contract_type:catalog_contract_type!contract_type_id(name),
      candidate_stack(
        candidate_stack_id,
        technology:catalog_technology!technology_id(technology_id, ct_name_tech)
      ),
      candidate_compensation(comp_id, cost_text, recorded_at),
      candidate_note(note_id, note_type, note_text),
      candidate_availability(availability_id, last_contact_date, notes, available_from, available_to, recorded_at)
    `)
    .eq('candidate_code', code)
    .single()
  if (error) throw error
  return data
}

// ─── Catalog helpers for dropdowns ───────────────────────────────
export async function fetchCatalog(table, nameCol, idCol) {
  const { data, error } = await supabase
    .from(table)
    .select(`${idCol}, ${nameCol}`)
    .order(nameCol)
  if (error) throw error
  return data ?? []
}

// ─── Create a new candidate ───────────────────────────────────────
export async function createCandidate(form) {
  const [roleId, locationId, contractId] = await Promise.all([
    upsertCatalog('catalog_role',          'name',         'role_id',          form.role),
    upsertCatalog('catalog_location',      'name',         'location_id',      form.location),
    upsertCatalog('catalog_contract_type', 'name',         'contract_type_id', form.scheme),
  ])

  const { data: statusRow } = await supabase
    .from('catalog_status').select('status_id').eq('name', 'Available').single()
  const statusId = statusRow?.status_id ?? null

  const code = `CAND-${Date.now().toString(36).toUpperCase()}`

  const { data: candidate, error } = await supabase
    .from('candidate')
    .insert({
      candidate_code:   code,
      full_name:        form.fullName,
      email:            form.email            || null,
      phone:            form.phone            || null,
      cv_url:           form.cvUrl            || null,
      linkedin_url:     form.linkedin         || null,
      role_id:          roleId,
      location_id:      locationId,
      status_id:        statusId,
      contract_type_id: contractId,
      english_score:    form.englishLevel ? Number(form.englishLevel) : null,
      years_experience: form.yearsExp ? Number(form.yearsExp) : null,
    })
    .select('candidate_id, candidate_code')
    .single()

  if (error) throw error
  const { candidate_id } = candidate

  // Technology stack
  if (form.technologies?.length) {
    for (const techName of form.technologies) {
      const techId = await upsertCatalog(
        'catalog_technology', 'ct_name_tech', 'technology_id', techName
      )
      if (techId) {
        await supabase.from('candidate_stack').insert({ candidate_id, technology_id: techId })
      }
    }
  }

  // Salary expectation
  if (form.salaryExpectation?.trim()) {
    await supabase.from('candidate_compensation').insert({
      candidate_id, cost_text: form.salaryExpectation.trim(),
    })
  }

  // Notes
  const notes = []
  if (form.skillset?.trim()) notes.push({ candidate_id, note_type: 'skillset', note_text: form.skillset })
  if (notes.length) await supabase.from('candidate_note').insert(notes)

  // Assignment to requirement + stage
  if (form.requirementId) {
    const now = new Date().toISOString()
    const { data: rc, error: rcError } = await supabase
      .from('requirement_candidate')
      .insert({
        requirement_id:   form.requirementId,
        candidate_id,
        submitted_at:     now,
        submittal_status: form.stageName || null,
        stage_updated_at: form.stageName ? now : null,
      })
      .select('id')
      .single()
    if (rcError) throw rcError

    if (form.stageName && rc) {
      await supabase.from('requirement_candidate_stage_history').insert({
        rc_id:          rc.id,
        candidate_id,
        requirement_id: form.requirementId,
        stage_name:     form.stageName,
        entered_at:     now,
      })
    }
  }

  return candidate
}

// ─── Create a minimal client-sourced candidate ────────────────────
export async function createClientCandidate(fullName, email) {
  const code = `CAND-${Date.now().toString(36).toUpperCase()}`
  const { data: statusRow } = await supabase
    .from('catalog_status').select('status_id').eq('name', 'Available').single()
  const { data, error } = await supabase
    .from('candidate')
    .insert({
      candidate_code: code,
      full_name:      fullName.trim(),
      email:          email?.trim() || null,
      source:         'client',
      status_id:      statusRow?.status_id ?? null,
    })
    .select('candidate_id, candidate_code')
    .single()
  if (error) throw error
  return data
}

// ─── Assignment helpers for Add Talent form ───────────────────────
export async function fetchClientsSimple() {
  const { data, error } = await supabase
    .from('client').select('id, name').order('name')
  if (error) throw error
  return data ?? []
}

export async function fetchRequirementsByClient(clientId) {
  const { data, error } = await supabase
    .from('requirement')
    .select('id, req_number, job_title, status:status_id(name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).filter(r => !String(r.status?.name ?? '').toLowerCase().startsWith('closed'))
}

export async function fetchStagesByClient(clientId) {
  const { data, error } = await supabase
    .from('catalog_pipeline_stage')
    .select('stage_id, name, position')
    .eq('client_id', clientId)
    .order('position')
  if (error) throw error
  return data ?? []
}

// ─── Update an existing candidate ────────────────────────────────
export async function updateCandidate(code, form) {
  const { data: existing, error: fetchErr } = await supabase
    .from('candidate').select('candidate_id').eq('candidate_code', code).single()
  if (fetchErr) throw fetchErr
  const candidateId = existing.candidate_id

  const [roleId, locationId, hiringPrefId, contractId, seniorityId] = await Promise.all([
    form.role       ? upsertCatalog('catalog_role',              'name', 'role_id',              form.role)       : null,
    form.location   ? upsertCatalog('catalog_location',          'name', 'location_id',          form.location)   : null,
    form.hiringPref ? upsertCatalog('catalog_hiring_preference', 'name', 'hiring_preference_id', form.hiringPref) : null,
    form.scheme     ? upsertCatalog('catalog_contract_type',     'name', 'contract_type_id',     form.scheme)     : null,
    form.seniority  ? upsertCatalog('catalog_seniority',         'name', 'seniority_id',         form.seniority)  : null,
  ])

  const patch = { updated_at: new Date().toISOString() }
  if (form.fullName      != null) patch.full_name        = form.fullName
  if (form.email         != null) patch.email            = form.email
  if (form.phone         != null) patch.phone            = form.phone
  if (form.cvUrl         != null) patch.cv_url           = form.cvUrl
  if (form.linkedin      != null) patch.linkedin_url     = form.linkedin || null
  if (form.englishScore  != null) patch.english_score    = form.englishScore !== '' ? Number(form.englishScore) : null
  if (form.yearsExp      != null) patch.years_experience = form.yearsExp !== '' ? Number(form.yearsExp) : null
  if (roleId)                     patch.role_id          = roleId
  if (locationId)                 patch.location_id      = locationId
  if (hiringPrefId)               patch.hiring_preference_id = hiringPrefId
  if (contractId)                 patch.contract_type_id = contractId
  if (seniorityId)                patch.seniority_id     = seniorityId

  const { error: updateErr } = await supabase
    .from('candidate').update(patch).eq('candidate_code', code)
  if (updateErr) throw updateErr

  // Replace stack when user modified it
  if (form.replaceStack && form.technologies?.length) {
    await supabase.from('candidate_stack').delete().eq('candidate_id', candidateId)
    for (const techName of form.technologies) {
      const techId = await upsertCatalog(
        'catalog_technology', 'ct_name_tech', 'technology_id', techName
      )
      if (techId) {
        await supabase.from('candidate_stack').insert({ candidate_id: candidateId, technology_id: techId })
      }
    }
  }

  // Upsert compensation
  if (form.salaryExpectation != null) {
    const { data: comp } = await supabase
      .from('candidate_compensation').select('comp_id')
      .eq('candidate_id', candidateId).order('recorded_at', { ascending: false }).limit(1)
    if (comp?.length) {
      await supabase.from('candidate_compensation')
        .update({ cost_text: form.salaryExpectation }).eq('comp_id', comp[0].comp_id)
    } else {
      await supabase.from('candidate_compensation')
        .insert({ candidate_id: candidateId, cost_text: form.salaryExpectation })
    }
  }

  // Upsert notes
  for (const noteType of ['skillset', 'recruiter_notes']) {
    if (form[noteType] === undefined) continue
    const { data: existingNote } = await supabase
      .from('candidate_note').select('note_id')
      .eq('candidate_id', candidateId).eq('note_type', noteType).limit(1)
    if (existingNote?.length) {
      await supabase.from('candidate_note')
        .update({ note_text: form[noteType] }).eq('note_id', existingNote[0].note_id)
    } else if (form[noteType]?.trim()) {
      await supabase.from('candidate_note')
        .insert({ candidate_id: candidateId, note_type: noteType, note_text: form[noteType] })
    }
  }

  // Upsert availability (last_contact_date + notes)
  if (form.lastContactDate !== undefined || form.availabilityNotes !== undefined) {
    const { data: existing } = await supabase
      .from('candidate_availability').select('availability_id')
      .eq('candidate_id', candidateId).order('availability_id', { ascending: false }).limit(1)

    const avPatch = {}
    if (form.lastContactDate !== undefined)
      avPatch.last_contact_date = form.lastContactDate || null
    if (form.availabilityNotes !== undefined)
      avPatch.notes = form.availabilityNotes || null

    if (existing?.length) {
      await supabase.from('candidate_availability')
        .update(avPatch).eq('availability_id', existing[0].availability_id)
    } else {
      await supabase.from('candidate_availability')
        .insert({ candidate_id: candidateId, ...avPatch })
    }
  }
}
