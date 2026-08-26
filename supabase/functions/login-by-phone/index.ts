import { createClient } from "jsr:@supabase/supabase-js@2";

// Connexion a un compte existant par numero de telephone (declaratif, pas
// d'OTP -- meme niveau de confiance que l'inscription, decision actee avec
// Gilles le 2026-08-24). Deployee via l'integration Supabase MCP (pas de
// Supabase CLI dans ce depot) -- ce fichier est la copie de reference
// versionnee dans git.
//
// L'appelant est deja une session anonyme fraiche (sans profil SitInZen_Users
// encore) au moment ou cet ecran est atteignable -- voir App.svelte. On
// retrouve le compte existant par Phone, puis on RE-POINTE ses lignes
// (SitInZen_Users, Sanitary_Reviews) vers l'auth.uid() de la session
// appelante, dans cet ordre precis : reassigner AVANT de supprimer
// l'ancien auth.users, sinon une eventuelle cascade FK supprimerait le
// profil qu'on veut justement garder. Le module badge (SitInZen_Badges,
// Access_Grants) n'est pas touche ici -- "en cours, ne pas toucher
// incidemment" (V2-PLAN.md §4).

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

    const { telephone } = await req.json();
    if (!telephone || typeof telephone !== "string") {
      return new Response(JSON.stringify({ error: "Numero de telephone manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existant, error: rechercheError } = await adminClient
      .from("SitInZen_Users")
      .select("*")
      .eq("Phone", telephone)
      .neq("user_id", user.id)
      .maybeSingle();
    if (rechercheError) throw rechercheError;

    if (!existant) {
      return new Response(JSON.stringify({ error: "compte_introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ancienUserId = existant.user_id;

    const { data: profilTransfere, error: reassignProfilError } = await adminClient
      .from("SitInZen_Users")
      .update({ user_id: user.id })
      .eq("user_id", ancienUserId)
      .select()
      .single();
    if (reassignProfilError) throw reassignProfilError;

    const { error: reassignAvisError } = await adminClient
      .from("Sanitary_Reviews")
      .update({ user_id: user.id })
      .eq("user_id", ancienUserId);
    if (reassignAvisError) throw reassignAvisError;

    // Best-effort : l'ancienne session anonyme devient orpheline. Si la
    // suppression echoue (compte deja supprime entre-temps, etc.), le
    // transfert du profil ci-dessus reste valide -- on ne bloque pas
    // dessus.
    await adminClient.auth.admin.deleteUser(ancienUserId).catch(() => {});

    return new Response(JSON.stringify({ profil: profilTransfere }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
