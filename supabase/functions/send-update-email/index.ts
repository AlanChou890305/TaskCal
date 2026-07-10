import { serve } from "http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signUid } from "../_shared/hmac.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const UNSUBSCRIBE_SECRET = Deno.env.get("UNSUBSCRIBE_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  subject: string;
  html: string;
  testEmail?: string; // If provided, only send to this email
  emailType?: "product_updates" | "marketing" | "welcome"; // Type of email
}

// ⚠️ EMAIL FUNCTION TEMPORARILY DISABLED
// Email sending is temporarily disabled until a proper domain is configured
const EMAIL_ENABLED = false;

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Early return if email is disabled
    if (!EMAIL_ENABLED) {
      console.log(
        `📧 Update email function called but disabled (email sending temporarily disabled)`
      );
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email sending temporarily disabled",
          skipped: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 1. Validate Environment Variables
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase Configuration");
    }

    // 2. Parse Request Body
    const {
      subject,
      html,
      testEmail,
      emailType = "product_updates",
    }: EmailRequest = await req.json();

    if (!subject || !html) {
      throw new Error("Missing 'subject' or 'html' in request body");
    }

    console.log(`📧 Email Type: ${emailType}`);

    // 3. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Fetch Users
    let recipients: { email: string; id: string }[] = [];

    if (testEmail) {
      console.log(`🧪 Test Mode: Sending only to ${testEmail}`);
      // For testing, we just use a dummy ID or try to find the user
      recipients = [{ email: testEmail, id: "test-user-id" }];
    } else {
      // Fetch all users from auth.users
      const {
        data: { users },
        error: userError,
      } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000, // Adjust as needed
      });

      if (userError) throw userError;

      // Get user IDs
      const userIds = users.map((u: any) => u.id);

      // Fetch user_settings for all users to check email preferences
      const { data: userSettings, error: settingsError } = await supabaseAdmin
        .from("user_settings")
        .select("user_id, email_preferences")
        .in("user_id", userIds);

      if (settingsError) {
        console.warn("⚠️ Error fetching user settings:", settingsError);
        // Continue without settings check
      }

      // Create a map of user_id -> email_preferences
      const preferencesMap = new Map();
      if (userSettings) {
        userSettings.forEach((setting: any) => {
          preferencesMap.set(setting.user_id, setting.email_preferences);
        });
      }

      // Filter users based on email type and preferences
      recipients = users
        .filter((u: any) => {
          // Skip if no email
          if (!u.email) return false;

          // Check old unsubscribe flag
          const isUnsubscribed = u.user_metadata?.unsubscribed === true;
          if (isUnsubscribed) {
            console.log(`🚫 Skipping unsubscribed user: ${u.email}`);
            return false;
          }

          // Welcome emails always send (don't check preferences)
          if (emailType === "welcome") {
            return true;
          }

          // Check email preferences from user_settings
          const preferences = preferencesMap.get(u.id);

          if (!preferences) {
            // If no preferences found, use defaults
            // product_updates: true (default on)
            // marketing: false (default off)
            if (emailType === "product_updates") {
              return true; // Default is to receive product updates
            } else if (emailType === "marketing") {
              return false; // Default is NOT to receive marketing
            }
          }

          // Check specific preference
          if (
            emailType === "product_updates" &&
            preferences?.product_updates === false
          ) {
            console.log(
              `🚫 Skipping user (product_updates disabled): ${u.email}`
            );
            return false;
          }

          if (emailType === "marketing" && preferences?.marketing !== true) {
            console.log(`🚫 Skipping user (marketing not enabled): ${u.email}`);
            return false;
          }

          return true;
        })
        .map((u: any) => ({ email: u.email!, id: u.id }));

      console.log(
        `📢 Found ${recipients.length} eligible users for ${emailType} emails.`
      );
    }

    // 5. Send Emails via Resend API
    const results = [];

    for (const recipient of recipients) {
      // Generate Unsubscribe Link (signed so the endpoint can verify authenticity)
      if (!UNSUBSCRIBE_SECRET) {
        throw new Error("UNSUBSCRIBE_SECRET is not configured");
      }
      const sig = await signUid(recipient.id, UNSUBSCRIBE_SECRET);
      const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/unsubscribe?uid=${recipient.id}&sig=${sig}`;

      // Inject Link into HTML
      // We replace {unsubscribe_url} with the actual link
      const personalizedHtml = html.replace(
        /{unsubscribe_url}/g,
        unsubscribeUrl
      );

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "TaskCal <onboarding@resend.dev>",
          to: [recipient.email],
          subject: subject,
          html: personalizedHtml,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
          },
        }),
      });

      const data = await res.json();
      results.push({ email: recipient.email, status: res.status, data });
    }

    return new Response(
      JSON.stringify({
        message: "Emails processed",
        emailType,
        count: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
