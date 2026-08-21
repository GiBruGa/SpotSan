import { createClient } from "jsr:@supabase/supabase-js@2";

// Suppression de compte en self-service (SpotSan V2, plan V2-PLAN.md §5.1).
// Deployee via l'integration Supabase MCP (pas de Supabase CLI dans ce
// depot) -- ce fichier est la copie de reference versionnee dans git.
//
// verify_jwt plateforme = true (la verification automatique n'empeche pas
// le pre-vol OPTIONS de passer, contrairement a ce qu'on aurait pu
// craindre -- teste en conditions reelles). La fonction verifie quand
// meme elle-meme l'identite de l'appelant via son propre token -- jamais
// depuis le corps de la requete -- pour ne jamais permettre a quelqu'un
// de supprimer le compte d'un autre.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non authentifie" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Supprime explicitement le profil (donnees personnelles) avant le
    // compte lui-meme, sans compter sur une cascade FK eventuelle.
    const { error: profilError } = await adminClient
      .from("SitInZen_Users")
      .delete()
      .eq("user_id", user.id);
    if (profilError) throw profilError;

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
