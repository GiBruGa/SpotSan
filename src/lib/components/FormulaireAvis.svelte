<script>
  // Formulaire "Donner son avis" (plan V2-PLAN.md §5.5, Lot 5).
  // 3 etapes + boutons flottants Sauvegarder / Sortir sans sauvegarder.
  // Reprend le dernier avis de l'utilisateur s'il existe (§5.4).

  import { onMount } from 'svelte'
  import EchelleEtat from './EchelleEtat.svelte'
  import EchelleCompte from './EchelleCompte.svelte'
  import BoutonPhoto from './BoutonPhoto.svelte'
  import { GROUPES_CELLULES, GENRES, TYPE_OPTIONS, CHANGE_BEBE_OPTIONS, EQUIPEMENTS } from '../config/cellules.js'
  import { STATUT_OPTIONS } from '../config/statut.js'
  import { chargerDernierAvis } from '../avis.js'
  import { sauvegarderAvis } from '../queueAvis.js'
  import { chargerSanitaire } from '../sanitaires.js'
  import { statutActuelSanitaire } from '../classification.js'
  import { obtenirPosition } from '../geolocalisation.js'

  // Statut declare avec l'avis (retour Gilles du 2026-08-31) : liste a
  // cocher a choix unique, remplace les boutons "Inexistant"/"Hors Service"
  // separes essayes plus tot le meme jour -- desormais un simple champ de
  // l'avis normal, cote base voir soumettre_avis (3 avis concordants
  // basculent la categorie sur la carte, meme principe Waze qu'avant).
  // Liste partagee avec FicheSanitaire.svelte, voir config/statut.js.

  // entrainement=true (module "S'entrainer", 2026-09-02) : le formulaire
  // reel, mais rien n'est envoye -- ni geolocalisation, ni ecriture en
  // base. Voir aussi BoutonPhoto (photos jamais televersees).
  let { userId, ubId, nomLieu = '', entrainement = false, onFerme } = $props()

  let chargement = $state(true)
  let dateDernierAvis = $state(null)
  let etape = $state(1)
  let enregistrement = $state(false)
  let messageStatut = $state('')

  // etats demarre avec toutes les cles a 'Abs' (par defaut, cf. §3.1/§5.5)
  // -- necessaire aussi pour que bind:value={etats[cle]} ait toujours une
  // valeur existante des le premier rendu (sinon Svelte 5 refuse le bind
  // sur une cle absente de l'objet reactif).
  function clesCellules() {
    return GROUPES_CELLULES.flatMap((g) => g.genres.map((genre) => `${g.cle}_${genre}`))
  }

  function etatsParDefaut() {
    return Object.fromEntries([...clesCellules(), ...EQUIPEMENTS.map((e) => e.cle)].map((cle) => [cle, 'Abs']))
  }

  let avisGeneral = $state(null)
  let statutDeclare = $state('Disponible')
  let commentaire = $state('')
  let configuration = $state({})
  let etats = $state(etatsParDefaut())
  // Ordre impose par Gilles le 2026-09-01, a la suite des equipements
  // "confort" existants : verrou mecanique anti intrusion, decompte du
  // temps d'utilisation, eclairage naturel (oui/non), puis luminosite et
  // ambiance (echelle de smileys, meme domaine que l'avis general).
  let verrouMecanique = $state(null)
  let decompteTemps = $state(null)
  let eclairageNaturel = $state(null)
  let luminosite = $state(null)
  let ambiance = $state(null)
  let changeBebe = $state(null)
  let accessibleNuit = $state(null)

  // Position saisie a l'ouverture du formulaire, valable 20 minutes
  // (retour Gilles du 2026-09-18) : on prend souvent les photos pres du
  // sanitaire puis on termine la saisie en s'eloignant -- verifier la
  // proximite seulement a l'ouverture (et non plus a chaque sauvegarde)
  // evite de se faire recaler par erreur en fin de parcours. Passe 20 min,
  // on retombe sur une verification fraiche (comportement d'avant).
  const DUREE_VALIDITE_POSITION_MS = 20 * 60 * 1000
  let positionCapturee = $state(null) // { lat, lon, quand }

  // Etape 4 -- photos (Lot 6, §5.6). Niveau 1 : champs structures avec
  // finalite propre a chacun (§5.6.1). Niveau 2 : photos taguees
  // confort/equipements, liste fermee (§5.6.2).
  let photoVueLoin = $state(null)
  let photoSignaletique = $state(null)
  let photoAcces = $state(null)
  let photosConfort = $state([])

  // 1 photo par equipement (remplace une eventuelle photo deja prise pour
  // ce meme tag, plutot que d'empiler des doublons) -- pour laisser de la
  // place aux contributions des autres, explique dans les instructions du
  // module "S'entrainer".
  // Apercu local (blob: URL) tenu a part de l'URL/jeton final -- necessaire
  // pour que la vignette de .liste-photos-confort reste affichable meme
  // quand la photo est encore en attente d'envoi (jeton "horsligne:<id>",
  // pas une URL image valide). Voir BoutonPhoto.svelte, prop onApercu.
  let apercusConfort = $state({})
  // Libere le blob: URL d'un apercu remplace/retire (audit qualite du
  // 2026-09-23) -- sans ca, chaque photo prise sur une tournee restait en
  // memoire jusqu'a la fermeture de l'onglet.
  function revoquerApercu(p) {
    if (p?.apercu?.startsWith?.('blob:')) URL.revokeObjectURL(p.apercu)
  }
  function ajouterPhotoConfort(tag, url, apercu) {
    const remplacee = photosConfort.find((p) => p.tag === tag)
    if (remplacee) revoquerApercu(remplacee)
    photosConfort = [...photosConfort.filter((p) => p.tag !== tag), { tag, url, apercu }]
  }
  function retirerPhotoConfort(index) {
    revoquerApercu(photosConfort[index])
    photosConfort = photosConfort.filter((_, i) => i !== index)
  }

  function type(cle) {
    return configuration[cle]?.type ?? null
  }
  function definirType(cle, val) {
    configuration[cle] = { ...configuration[cle], type: configuration[cle]?.type === val ? null : val }
  }
  function sousChoix(cle) {
    return configuration[cle]?.sousChoix ?? null
  }
  function definirSousChoix(cle, val) {
    configuration[cle] = { ...configuration[cle], sousChoix: configuration[cle]?.sousChoix === val ? null : val }
  }

  onMount(async () => {
    // Capture la position des l'ouverture (non bloquant : un echec ici ne
    // gene pas la saisie, on retombera sur une verification fraiche a la
    // sauvegarde -- comportement d'avant, cf. DUREE_VALIDITE_POSITION_MS).
    if (!entrainement) {
      obtenirPosition()
        .then(({ lat, lon }) => (positionCapturee = { lat, lon, quand: Date.now() }))
        .catch(() => {})
    }
    try {
      const [dernier, sanitaire] = await Promise.all([chargerDernierAvis(userId, ubId), chargerSanitaire(ubId)])
      // Pre-coche le statut EN COURS (celui valide, exploitant ou 3 avis
      // concordants) -- pas la propre derniere declaration de la personne,
      // qui pourrait etre perimee si d'autres avis/l'exploitant ont fait
      // bouger les choses depuis (demande Gilles du 2026-08-31).
      statutDeclare = statutActuelSanitaire(sanitaire)
      if (dernier) {
        dateDernierAvis = dernier.updated_at
        avisGeneral = dernier.avis_general
        commentaire = dernier.commentaire ?? ''
        configuration = dernier.configuration ?? {}
        etats = { ...etatsParDefaut(), ...(dernier.etats ?? {}) }
        eclairageNaturel = dernier.eclairage_naturel
        verrouMecanique = dernier.verrou_mecanique
        decompteTemps = dernier.decompte_temps
        luminosite = dernier.luminosite
        ambiance = dernier.ambiance
        accessibleNuit = dernier.accessible_nuit
        changeBebe = (dernier.configuration ?? {}).change_bebe?.choix ?? null
        photoVueLoin = dernier.photo_vue_loin
        photoSignaletique = dernier.photo_signaletique
        photoAcces = dernier.photo_acces
        photosConfort = dernier.photos_confort ?? []
      }
    } catch (e) {
      console.error(e)
    } finally {
      chargement = false
    }
  })

  // Filet de securite (retour Gilles du 2026-09-19, apres des "blocages"
  // constates sur le terrain) : si une des etapes async de la sauvegarde
  // (IndexedDB en particulier, connu pour rester bloque dans certaines
  // conditions sur Safari/iOS) ne repond jamais, le bouton "Sauvegarder"
  // restait desactive indefiniment sans aucun message. Au-dela de 15s, on
  // abandonne l'attente et on rend la main -- les reponses deja saisies
  // restent affichees, rien n'est perdu, l'utilisateur peut reessayer.
  function avecTimeout(promesse, ms) {
    return Promise.race([
      promesse,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout_sauvegarde')), ms)),
    ])
  }

  // Validation avant meme de tenter le reseau (retour Gilles du 2026-09-18 :
  // aucun message clair n'indiquait pourquoi la sauvegarde etait bloquee,
  // en particulier un avis general non rempli). Renvoie un message si
  // quelque chose de bloquant manque, null sinon.
  function messageValidationBloquante() {
    if (avisGeneral == null) return 'Donnez une note générale avant de sauvegarder (étape 1).'
    return null
  }

  async function sauvegarder() {
    messageStatut = ''
    // Verifiee avant meme la branche entrainement, pour que la simulation
    // reste fidele au vrai parcours (cf. bandeau "le formulaire reel, mais
    // rien n'est envoye").
    const messageBloquant = messageValidationBloquante()
    if (messageBloquant) {
      messageStatut = messageBloquant
      return
    }
    if (entrainement) {
      enregistrement = true
      // Rien a envoyer -- juste simuler l'attente pour que le geste soit
      // credible, puis confirmer sans rien avoir ecrit nulle part.
      await new Promise((r) => setTimeout(r, 500))
      messageStatut = 'Entraînement terminé — rien n\'a été enregistré. Vous êtes prêt·e pour un vrai avis !'
      enregistrement = false
      setTimeout(() => onFerme?.(), 1400)
      return
    }
    enregistrement = true
    try {
      // Position capturee a l'ouverture du formulaire, reutilisee si elle a
      // moins de 20 minutes (retour Gilles du 2026-09-18) -- evite de
      // recaler quelqu'un qui a pris ses photos pres du sanitaire puis
      // s'en est eloigne pour finir de remplir la fiche. Passe ce delai (ou
      // si la capture d'ouverture a echoue), on revient a une verification
      // fraiche, comme avant.
      const positionValide = positionCapturee && Date.now() - positionCapturee.quand <= DUREE_VALIDITE_POSITION_MS
      const { lat, lon } = positionValide ? positionCapturee : await obtenirPosition()
      const configurationAEnvoyer = { ...configuration, change_bebe: changeBebe ? { choix: changeBebe } : null }
      const { horsLigne } = await avecTimeout(sauvegarderAvis({
        ub_id: ubId,
        lat,
        lon,
        donnees: {
          avis_general: avisGeneral,
          statut_declare: statutDeclare,
          commentaire: commentaire.trim() || null,
          configuration: configurationAEnvoyer,
          etats,
          eclairage_naturel: eclairageNaturel,
          verrou_mecanique: verrouMecanique,
          decompte_temps: decompteTemps,
          luminosite,
          ambiance,
          accessible_nuit: accessibleNuit,
          photo_vue_loin: photoVueLoin,
          photo_signaletique: photoSignaletique,
          photo_acces: photoAcces,
          photos_confort: photosConfort,
        },
      }), 15000)
      messageStatut = horsLigne
        ? 'Pas de réseau — votre avis est enregistré sur votre téléphone et sera envoyé dès que possible.'
        : 'Avis enregistré.'
      setTimeout(() => onFerme?.(), 900)
    } catch (e) {
      console.error(e)
      if (e.message === 'geolocalisation_indisponible' || e.message === 'geolocalisation_refusee') {
        messageStatut = 'Activez la localisation pour donner votre avis — il faut être sur place, près du sanitaire.'
      } else if (e.message?.includes('trop_loin')) {
        messageStatut = 'Vous devez être à proximité du sanitaire pour donner votre avis.'
      } else if (e.message === 'timeout_sauvegarde') {
        messageStatut = "Ça prend trop de temps — vos réponses sont toujours là, réessayez (vérifiez votre réseau si ça persiste)."
      } else {
        messageStatut = "Impossible d'enregistrer pour l'instant (problème technique) — réessayez ; si ça persiste, vos réponses restent remplies, sortez et revenez sans les perdre."
      }
    } finally {
      enregistrement = false
    }
  }

</script>

<div class="formulaire-avis">
  {#if entrainement}<p class="banniere-entrainement">Mode entraînement — rien ne sera enregistré</p>{/if}
  {#if chargement}
    <p class="etat-chargement">Chargement…</p>
  {:else}
    <header>
      <h1>Donner mon avis{nomLieu ? ` — ${nomLieu}` : ''}</h1>
      {#if dateDernierAvis}
        <p class="reprise">
          Reprise de votre dernier avis du {new Date(dateDernierAvis).toLocaleDateString('fr-FR')} —
          modifiez ce qui a changé.
        </p>
      {/if}
      <div class="etapes-nav">
        <button type="button" class:active={etape === 1} onclick={() => (etape = 1)}>1. Avis</button>
        <button type="button" class:active={etape === 2} onclick={() => (etape = 2)}>2. Photos</button>
        <button type="button" class:active={etape === 3} onclick={() => (etape = 3)}>3. Configuration</button>
        <button type="button" class:active={etape === 4} onclick={() => (etape = 4)}>4. Équipements</button>
      </div>
    </header>

    <div class="contenu">
      {#if etape === 1}
        <section>
          <EchelleEtat label="Avis général" bind:value={avisGeneral} />
          <!-- Case "Accessible de nuit" (retour Gilles du 2026-09-18) :
               moyen detourne de renseigner les horaires d'ouverture sans
               demander un vrai champ horaires. -->
          <label class="case-accessible-nuit">
            <input type="checkbox" checked={accessibleNuit === true} onchange={(e) => (accessibleNuit = e.target.checked)} />
            Accessible de nuit
          </label>
          <hr class="separateur-champ" />
          <div class="champ">
            <span>État de fonctionnement</span>
            <div class="statut-liste" role="radiogroup" aria-label="État de fonctionnement">
              {#each STATUT_OPTIONS as opt (opt.valeur)}
                <label class="statut-option">
                  <input type="radio" name="statut-declare" value={opt.valeur} checked={statutDeclare === opt.valeur} onchange={() => (statutDeclare = opt.valeur)} />
                  {opt.label}
                </label>
              {/each}
            </div>
          </div>
          <hr class="separateur-champ" />
          <label class="champ">
            <span>Commentaire (facultatif)</span>
            <textarea bind:value={commentaire} rows="3" maxlength="500" placeholder="Ex. nettoyage par arrosage au sol, attention aux robes/pantalons longs…"></textarea>
          </label>
        </section>
      {:else if etape === 2}
        <section class="grille-photos">
          <p class="consigne-camera">
            Ajoutez les photos qui vous semblent compléter les informations déjà partagées.
          </p>

          <div class="groupe-photo">
            <h3>Environnement</h3>
            <BoutonPhoto
              consigne="Repérer le sanitaire dans son environnement : cadre depuis l'endroit où on arrive (rue, parking, allée), pas un gros plan."
              {entrainement}
              bind:valeur={photoVueLoin}
            />
          </div>

          <div class="groupe-photo">
            <h3>Accès</h3>
            <BoutonPhoto
              consigne="Juger l'accessibilité avant de se déplacer : cadre le cheminement (porte, marches, rampe) pour que largeur et pente soient visibles."
              {entrainement}
              bind:valeur={photoAcces}
            />
          </div>

          <div class="groupe-photo">
            <h3>Signalétique</h3>
            <p class="note-photos texte-centre">
              Voyez-vous comment savoir si le sanitaire est disponible, momentanément indisponible ou Hors Service / Condamné ?
            </p>
            <BoutonPhoto
              consigne="Rendre l'état vérifiable : cadre le panneau ou l'indicateur lui-même (affiche de fermeture, voyant), pas une vue large."
              {entrainement}
              bind:valeur={photoSignaletique}
            />
          </div>

          <div class="groupe-photo">
            <h3>Confort / équipements (facultatif)</h3>
            <p class="note-photos">Pour donner une idée à quoi ça ressemble, sans être normatif.</p>
            <div class="tags-confort">
              {#each EQUIPEMENTS as e (e.cle)}
                <div class="tag-confort">
                  <BoutonPhoto
                    {entrainement}
                    onApercu={(url) => (apercusConfort[e.cle] = url)}
                    onTermine={(url) => ajouterPhotoConfort(e.label, url, apercusConfort[e.cle])}
                  />
                  <span class="tag-confort-label">{e.label}</span>
                </div>
              {/each}
            </div>
            {#if photosConfort.length}
              <ul class="liste-photos-confort">
                {#each photosConfort as p, i (i)}
                  <li>
                    <img src={p.apercu ?? p.url} alt={p.tag} />
                    <span>{p.tag}</span>
                    <button type="button" onclick={() => retirerPhotoConfort(i)}>Retirer</button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </section>
      {:else if etape === 3}
        <section class="grille-configuration">
          <p class="consigne-configuration">Les chiffres indiquent le nombre de cellules.</p>
          {#each GROUPES_CELLULES as g (g.cle)}
            <div class="carte-groupe">
              <div class="entete-groupe">
                <span class="nom-groupe">{g.label}</span>
                {#if g.avecType}
                  <div class="chips">
                    {#each TYPE_OPTIONS as t (t)}
                      <button type="button" class:selected={type(g.cle) === t} onclick={() => definirType(g.cle, t)}>{t}</button>
                    {/each}
                  </div>
                {/if}
              </div>
              {#if g.note}<p class="note-groupe">{g.note}</p>{/if}
              {#each g.genres as genreCle (genreCle)}
                {@const genre = GENRES.find((x) => x.cle === genreCle)}
                <div class="ligne-genre">
                  {#if g.genres.length > 1}<span class="label-genre">{genre.label}</span>{/if}
                  <EchelleCompte couleur={genre.couleur} bind:value={etats[`${g.cle}_${genreCle}`]} />
                </div>
              {/each}
            </div>
          {/each}

          <div class="carte-groupe">
            <span class="nom-groupe">Change Bébé</span>
            <div class="options-change-bebe">
              {#each CHANGE_BEBE_OPTIONS as opt (opt)}
                <label class="option-radio">
                  <input type="radio" name="change-bebe" value={opt} checked={changeBebe === opt} onchange={() => (changeBebe = opt)} />
                  {opt}
                </label>
              {/each}
            </div>
          </div>
        </section>
      {:else if etape === 4}
        <section class="grille-equipements">
          {#each EQUIPEMENTS as e (e.cle)}
            <div class="ligne-equipement">
              <EchelleEtat label={e.label} bind:value={etats[e.cle]} extensions={e.extensions} />
              {#if e.sousChoix && etats[e.cle] && etats[e.cle] !== 'Abs'}
                <div class="chips">
                  {#each e.sousChoix as s (s)}
                    <button type="button" class:selected={sousChoix(e.cle) === s} onclick={() => definirSousChoix(e.cle, s)}>{s}</button>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}

          <div class="ligne-equipement">
            <span class="nom-cellule">Verrou mécanique anti intrusion</span>
            <div class="chips">
              <button type="button" class:selected={verrouMecanique === true} onclick={() => (verrouMecanique = verrouMecanique === true ? null : true)}>Oui</button>
              <button type="button" class:selected={verrouMecanique === false} onclick={() => (verrouMecanique = verrouMecanique === false ? null : false)}>Non</button>
            </div>
          </div>
          <div class="ligne-equipement">
            <span class="nom-cellule">Décompte du temps d'utilisation</span>
            <div class="chips">
              <button type="button" class:selected={decompteTemps === true} onclick={() => (decompteTemps = decompteTemps === true ? null : true)}>Oui</button>
              <button type="button" class:selected={decompteTemps === false} onclick={() => (decompteTemps = decompteTemps === false ? null : false)}>Non</button>
            </div>
          </div>
          <div class="ligne-equipement">
            <span class="nom-cellule">Éclairage naturel</span>
            <div class="chips">
              <button type="button" class:selected={eclairageNaturel === true} onclick={() => (eclairageNaturel = eclairageNaturel === true ? null : true)}>Oui</button>
              <button type="button" class:selected={eclairageNaturel === false} onclick={() => (eclairageNaturel = eclairageNaturel === false ? null : false)}>Non</button>
            </div>
          </div>
          <div class="ligne-equipement">
            <EchelleEtat label="Luminosité" bind:value={luminosite} />
          </div>
          <div class="ligne-equipement">
            <EchelleEtat label="Ambiance" bind:value={ambiance} />
          </div>
        </section>
      {/if}
    </div>

    {#if messageStatut}<p class="statut">{messageStatut}</p>{/if}

    <div class="boutons-flottants">
      <button type="button" class="sortir" onclick={() => onFerme?.()}>Sortir sans sauvegarder</button>
      <button type="button" class="sauvegarder" disabled={enregistrement} onclick={sauvegarder}>
        {enregistrement ? 'Sauvegarde…' : 'Sauvegarder'}
      </button>
    </div>
  {/if}
</div>

<style>
  .formulaire-avis {
    max-width: 560px;
    margin: 0 auto;
    padding: 1rem 1rem 6rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .formulaire-avis {
    color: var(--texte);
  }

  .etat-chargement {
    padding: 2rem;
    text-align: center;
    color: var(--texte-attenue);
  }

  .banniere-entrainement {
    margin: 0 0 0.8rem;
    padding: 0.5rem 0.8rem;
    border-radius: 8px;
    background: var(--accent-fond);
    color: var(--accent-texte);
    font-size: 0.82rem;
    font-weight: 600;
    text-align: center;
  }

  header h1 {
    font-size: 1.2rem;
    margin: 0 0 0.3rem;
  }

  .reprise {
    font-size: 0.82rem;
    color: var(--texte-attenue);
    margin: 0 0 0.6rem;
  }

  .etapes-nav {
    display: flex;
    gap: 0.4rem;
  }

  .etapes-nav button {
    flex: 1;
    min-height: 40px;
    border-radius: 999px;
    border: 1px solid var(--bordure);
    background: var(--fond);
    color: var(--texte);
    font-size: 0.8rem;
    cursor: pointer;
  }

  .etapes-nav button.active {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
    font-weight: 600;
  }

  .contenu {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .champ {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .champ span {
    font-weight: 600;
    font-size: 0.9rem;
  }

  /* Separe visuellement chaque bloc "label + champ a remplir" de l'etape
     Avis -- retour Gilles du 2026-09-04, pour ne pas laisser croire que
     l'echelle de smileys/le statut/le commentaire ne forment qu'un seul
     champ. */
  .separateur-champ {
    width: 100%;
    border: none;
    border-top: 1px solid var(--bordure);
    margin: 0.4rem 0;
  }

  .statut-liste {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .statut-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 38px;
    font-size: 0.88rem;
    cursor: pointer;
  }

  .statut-option input {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
    flex-shrink: 0;
    cursor: pointer;
  }

  textarea {
    border-radius: 8px;
    border: 1px solid var(--bordure);
    padding: 0.6rem;
    font: inherit;
    color: var(--texte);
    background: var(--fond);
    resize: vertical;
  }

  .grille-configuration,
  .grille-equipements {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .ligne-equipement {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 0.8rem;
    border-bottom: 1px solid var(--bordure);
  }

  .nom-cellule {
    font-weight: 600;
    font-size: 0.9rem;
  }

  /* "Encadrement" (retour Gilles du 2026-09-03) : un cadre par groupe pour
     que ses parents/oncles/tantes reperent d'un coup d'oeil ou commence et
     ou finit chaque rubrique de l'etape "Configuration". */
  .carte-groupe {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.8rem 0.9rem;
    border: 1px solid var(--bordure);
    border-radius: 12px;
  }

  .entete-groupe {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .nom-groupe {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .note-groupe {
    margin: -0.3rem 0 0;
    font-size: 0.78rem;
    font-style: italic;
    color: var(--texte-attenue);
  }

  .ligne-genre {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .label-genre {
    font-size: 0.82rem;
    color: var(--texte-attenue);
  }

  .options-change-bebe {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .option-radio {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 38px;
    font-size: 0.88rem;
    cursor: pointer;
  }

  .option-radio input {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
    flex-shrink: 0;
    cursor: pointer;
  }

  .case-accessible-nuit {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 38px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }

  .case-accessible-nuit input {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
    flex-shrink: 0;
    cursor: pointer;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .chips button {
    min-height: 38px;
    padding: 0 0.6rem;
    border-radius: 999px;
    border: 1px solid var(--bordure);
    background: var(--fond);
    color: var(--texte);
    font-size: 0.8rem;
    cursor: pointer;
  }

  .chips button.selected {
    border-color: var(--accent);
    background: var(--accent-fond);
    color: var(--accent-texte);
    font-weight: 600;
  }

  .grille-photos {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .groupe-photo h3 {
    font-size: 0.95rem;
    margin: 0 0 0.5rem;
  }

  .note-photos {
    font-size: 0.8rem;
    color: var(--texte-attenue);
    margin: 0 0 0.6rem;
  }

  .texte-centre {
    text-align: center;
  }

  .consigne-camera {
    font-size: 0.85rem;
    color: var(--texte);
    margin: 0;
  }

  .consigne-configuration {
    font-size: 0.82rem;
    color: var(--texte-attenue);
    margin: 0;
  }

  .tags-confort {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .tag-confort {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    width: 5.5rem;
  }

  .tag-confort-label {
    font-size: 0.72rem;
    text-align: center;
    color: var(--texte-attenue);
  }

  .liste-photos-confort {
    list-style: none;
    margin: 0.8rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .liste-photos-confort li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.82rem;
  }

  .liste-photos-confort img {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
  }

  .liste-photos-confort button {
    margin-left: auto;
    border: none;
    background: none;
    color: var(--danger-texte);
    font-size: 0.78rem;
    cursor: pointer;
  }

  .statut {
    font-size: 0.85rem;
    text-align: center;
    color: var(--texte);
  }

  .boutons-flottants {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    gap: 0.6rem;
    padding: 0.8rem 1rem calc(0.8rem + env(safe-area-inset-bottom));
    background: var(--fond);
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
  }

  .boutons-flottants button {
    flex: 1;
    min-height: 48px;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
  }

  .sortir {
    border: 1px solid var(--bordure);
    background: var(--fond);
    color: var(--texte);
  }

  .sauvegarder {
    border: none;
    background: var(--accent);
    color: #fff;
  }

  .sauvegarder:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
