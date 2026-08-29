import { createClient } from "jsr:@supabase/supabase-js@2";

// Remplace login-by-phone (2026-08-29, passage au telephone+mot de passe
// reel -- decision de Gilles). Ancien role : LA mecanique de connexion
// elle-meme (declaratif, sans verification). Nouveau role : un helper
// appele juste APRES une verification reelle du telephone (signInWithOtp
// + verifyOtp, voir SecuriserCompte.svelte cote client) pour retrouver
// et reattacher les donnees SitInZen_Users/Sanitary_Reviews d'un compte
// qui vivait encore sous un ancien user_id anonyme (cree avant ce
// changement, ou sur un autre appareil). Deployee via l'integration
// Supabase MCP (pas de Supabase CLI dans ce depot) -- ce fichier est la
// copie de reference versionnee dans git.
//
// Trois issues possibles, toutes en 200 (aucune n'est une erreur) :
//  - profil trouve sous un AUTRE user_id -> reassigne a l'appelant, renvoye
//  - profil deja sous le user_id de l'appelant -> renvoye tel quel (no-op)
//  - aucun profil pour ce telephone -> { profil: null } (nouvelle inscription)
//
// Reassigner AVANT de supprimer l'ancien auth.users, sinon une eventuelle
// cascade FK supprimerait le profil qu'on veut justement garder. Le module
// badge (SitInZen_Badges, Access_Grants) n'est pas touche ici -- "en cours,
// ne pas toucher incidemment" (V2-PLAN.md §4).

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
      .maybeSingle();
    if (rechercheError) throw rechercheError;

    if (!existant) {
      return new Response(JSON.stringify({ profil: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existant.user_id === user.id) {
      return new Response(JSON.stringify({ profil: existant }), {
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

    // Best-effort : l'ancien user_id devient orphelin (anonyme, ou meme
    // reel si l'appelant s'est deja identifie ailleurs entre-temps -- rare,
    // mais sans consequence : ses seules donnees etaient deja reassignees
    // ci-dessus). Si la suppression echoue, le transfert du profil reste
    // valide -- on ne bloque pas dessus.
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
