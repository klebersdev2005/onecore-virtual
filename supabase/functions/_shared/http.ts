import { createClient } from 'npm:@supabase/supabase-js@2.46.1'

const ORIGIN = Deno.env.get('SITE_URL') ?? '*'

export const cors = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Cliente com service_role — só existe no servidor. */
export const adminClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

/** Usuário autenticado a partir do JWT enviado pelo navegador. */
export async function getUser(req: Request) {
  const auth = req.headers.get('Authorization')
  if (!auth) return null
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  })
  const { data } = await client.auth.getUser()
  return data.user
}
