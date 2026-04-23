import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Guard {
  id: string
  name: string
  email: string
  phone: string | null
  work_start_time: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    const secretToken = Deno.env.get('FUNCTION_SECRET')
    
    if (secretToken && authHeader !== `Bearer ${secretToken}`) {
       return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const notificationEmail = Deno.env.get('NOTIFICATION_EMAIL')
    const today = new Date().toISOString().split('T')[0]

    console.log(`[${new Date().toISOString()}] Running smart shift-based absence check...`)

    // 1. Get guards who:
    // - Have NOT scanned today
    // - AND current time is 2+ hours past their work_start_time
    // - (Assuming India Standard Time - Asia/Kolkata)
    const { data: absentGuards, error: queryError } = await supabaseClient
      .rpc('get_absent_guards_after_grace_period', { 
        grace_hours: 2,
        timezone: 'Asia/Kolkata' 
      }) as { data: Guard[] | null, error: any }

    if (queryError) {
      console.error("Query Error:", queryError)
      // Fallback if RPC isn't created yet: get all then filter
      throw queryError
    }

    const notificationsSent = []

    for (const guard of (absentGuards || [])) {
      // Avoid duplicate emails for today
      const { data: existingLog } = await supabaseClient
        .from('whatsapp_logs')
        .select('id')
        .eq('guard_id', guard.id)
        .eq('date_checked', today)
        .maybeSingle()

      if (existingLog) continue

      if (resendApiKey && notificationEmail) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: notificationEmail,
            subject: `⚠️ LATE ALERT: ${guard.name}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #1a1a1a;">
                <div style="background-color: #f59e0b; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
                   <h2 style="margin: 0;">Shift Grace Period Exceeded</h2>
                </div>
                <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px; background-color: #fffbeb;">
                  <p>Guard <strong>${guard.name}</strong> has not scanned the QR code.</p>
                  <p>Their duty started at <strong>${guard.work_start_time}</strong>, and the 2-hour grace period has now passed.</p>
                  <hr style="border: none; border-top: 1px solid #fde68a; margin: 15px 0;">
                  <p><strong>Guard Stats:</strong></p>
                  <p>📧 Email: ${guard.email}<br>📱 Mobile: ${guard.phone || 'N/A'}</p>
                </div>
              </div>
            `,
          }),
        })

        if (response.ok) {
          notificationsSent.push(guard.name)
          await supabaseClient.from('whatsapp_logs').insert({
            guard_id: guard.id,
            admin_phone: notificationEmail,
            status: 'sent',
            date_checked: today
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ status: 'success', notified: notificationsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
