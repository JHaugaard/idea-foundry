import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, ...payload } = await req.json()

    switch (action) {
      case 'get_auth_url':
        return await getAuthUrl(payload)
      
      case 'exchange_code':
        return await exchangeCode(payload.code, supabaseClient, user.id, payload)
      
      case 'upload_file':
        return await uploadFile(payload, supabaseClient, user.id)
      
      case 'list_files':
        return await listFiles(supabaseClient, user.id)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getAuthUrl(payload: any) {
  const clientId = payload.clientId || Deno.env.get('GOOGLE_DRIVE_CLIENT_ID')
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-drive`
  
  if (!clientId) {
    throw new Error('Google Drive Client ID not provided')
  }
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}&` +
    `access_type=offline&` +
    `prompt=consent`

  return new Response(
    JSON.stringify({ auth_url: authUrl }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function exchangeCode(code: string, supabaseClient: any, userId: string, payload: any) {
  const clientId = payload.clientId || Deno.env.get('GOOGLE_DRIVE_CLIENT_ID')
  const clientSecret = payload.clientSecret || Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET')
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-drive`
  
  if (!clientId || !clientSecret) {
    throw new Error('Google Drive credentials not provided')
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  const tokenData = await tokenResponse.json()

  if (tokenData.error) {
    throw new Error(tokenData.error_description || 'Failed to exchange code')
  }

  // Store tokens in user profile
  await supabaseClient
    .from('profiles')
    .upsert({
      user_id: userId,
      google_drive_access_token: tokenData.access_token,
      google_drive_refresh_token: tokenData.refresh_token,
    })

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function uploadFile(payload: any, supabaseClient: any, userId: string) {
  // Get user's access token
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('google_drive_access_token')
    .eq('user_id', userId)
    .single()

  if (!profile?.google_drive_access_token) {
    throw new Error('Google Drive not connected')
  }

  const { title, content } = payload
  const fileContent = `Title: ${title}\n\nContent: ${content || ''}`

  // Upload to Google Drive
  const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${profile.google_drive_access_token}`,
      'Content-Type': 'multipart/related; boundary=boundary123',
    },
    body: [
      '--boundary123',
      'Content-Type: application/json',
      '',
      JSON.stringify({
        name: `${title}.txt`,
        parents: ['appDataFolder'],
      }),
      '--boundary123',
      'Content-Type: text/plain',
      '',
      fileContent,
      '--boundary123--',
    ].join('\r\n'),
  })

  const uploadResult = await uploadResponse.json()

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message)
  }

  // Store file reference in database
  await supabaseClient
    .from('drive_files')
    .insert({
      user_id: userId,
      google_drive_file_id: uploadResult.id,
      title,
      content,
      file_name: `${title}.txt`,
    })

  return new Response(
    JSON.stringify({ success: true, file_id: uploadResult.id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function listFiles(supabaseClient: any, userId: string) {
  const { data: files } = await supabaseClient
    .from('drive_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return new Response(
    JSON.stringify({ files }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}