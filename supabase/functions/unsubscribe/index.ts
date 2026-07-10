import { serve } from "http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyUidSignature } from "../_shared/hmac.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const UNSUBSCRIBE_SECRET = Deno.env.get("UNSUBSCRIBE_SECRET");

serve(async (req: Request) => {
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  const sig = url.searchParams.get("sig");

  if (!uid || !sig) {
    return new Response("Missing or invalid unsubscribe link", { status: 400 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !UNSUBSCRIBE_SECRET) {
    return new Response("Server Configuration Error", { status: 500 });
  }

  const isValid = await verifyUidSignature(uid, sig, UNSUBSCRIBE_SECRET);
  if (!isValid) {
    return new Response("Invalid or expired unsubscribe link", { status: 403 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Update user metadata
  const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, {
    user_metadata: { unsubscribed: true },
  });

  if (error) {
    return new Response("Unable to process unsubscribe request", { status: 500 });
  }

  // Return a simple success HTML page
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Unsubscribe Successful</title>
        <style>
          body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9f9f9; }
          .card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
          h1 { color: #9466EE; margin-bottom: 10px; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>已取消訂閱</h1>
          <p>您已成功取消訂閱 TaskCal 的更新通知。</p>
          <p>You have been unsubscribed from future updates.</p>
        </div>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});
