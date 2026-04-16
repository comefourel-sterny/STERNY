import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import './ContratLocationPage.css'

export default function ContratLocationPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const matchId = searchParams.get('match_id')

  // Data state
  const [matchData, setMatchData] = useState(null)
  const [contratData, setContratData] = useState(null)
  const [proprietaireData, setProprietaireData] = useState(null)
  const [isLocataire, setIsLocataire] = useState(false)
  const [isAdminGlobal, setIsAdminGlobal] = useState(false)

  // Display state
  const [nomProprietaire, setNomProprietaire] = useState('-')
  const [infoProprietaire, setInfoProprietaire] = useState('-')
  const [nomLocataire, setNomLocataire] = useState('-')
  const [infoLocataire, setInfoLocataire] = useState('-')
  const [loyerDetail, setLoyerDetail] = useState('\u2014')
  const [loyerMensuel, setLoyerMensuel] = useState('\u2014')
  const [depotDetail, setDepotDetail] = useState('\u2014')
  const [dateDebut, setDateDebut] = useState('1 mars 2026')
  const [dateFin, setDateFin] = useState('31 ao\u00fbt 2026')
  const [dureeMois, setDureeMois] = useState('6 mois')
  const [retourHref, setRetourHref] = useState('/dashboard')

  // Signature state
  const [sigNomComplet, setSigNomComplet] = useState('\u2014')
  const [sigEmail, setSigEmail] = useState('\u2014')
  const [sigSectionTitle, setSigSectionTitle] = useState('IX. Signature \u00e9lectronique')
  const [sigIdentityLabel, setSigIdentityLabel] = useState('Vous signez en tant que')
  const [labelLuContrat, setLabelLuContrat] = useState('')
  const [labelAccepteContrat, setLabelAccepteContrat] = useState('')
  const [checkLu, setCheckLu] = useState(false)
  const [checkAccepte, setCheckAccepte] = useState(false)
  const [checkCgv, setCheckCgv] = useState(false)
  const [sigSaisieNom, setSigSaisieNom] = useState('')
  const [sigHintText, setSigHintText] = useState('')
  const [sigHintClass, setSigHintClass] = useState('sig-type-hint')
  const [sigInputClass, setSigInputClass] = useState('sig-type-input')
  const [btnSignerDisabled, setBtnSignerDisabled] = useState(true)
  const [btnSignerText, setBtnSignerText] = useState('Signer et continuer')

  // Signature status
  const [showSignatureStatus, setShowSignatureStatus] = useState(false)
  const [locataireStatusName, setLocataireStatusName] = useState('Locataire')
  const [proprietaireStatusName, setProprietaireStatusName] = useState('Propri\u00e9taire')
  const [locataireSigned, setLocataireSigned] = useState(false)
  const [proprietaireSigned, setProprietaireSigned] = useState(false)
  const [locataireSignDate, setLocataireSignDate] = useState('En attente')
  const [proprietaireSignDate, setProprietaireSignDate] = useState('En attente')
  const [showDejaSign, setShowDejaSign] = useState(false)
  const [dejaSigneMsg, setDejaSigneMsg] = useState('En attente de la signature de l\'autre partie.')
  const [showSignForm, setShowSignForm] = useState(true)
  const [showBtnSigner, setShowBtnSigner] = useState(true)

  // Print proof
  const [printNomLocataire, setPrintNomLocataire] = useState('\u2014')
  const [printNomProprietaire, setPrintNomProprietaire] = useState('\u2014')
  const [printStatusLocataire, setPrintStatusLocataire] = useState('En attente')
  const [printStatusProprietaire, setPrintStatusProprietaire] = useState('En attente')
  const [printLocataireSigned, setPrintLocataireSigned] = useState(false)
  const [printProprietaireSigned, setPrintProprietaireSigned] = useState(false)

  // Progress bar
  const [progressSteps, setProgressSteps] = useState([
    { num: 1, label: 'Match', status: 'completed' },
    { num: 2, label: 'Dossier', status: 'completed' },
    { num: 3, label: 'Contrat', status: 'active' },
    { num: 4, label: 'Paiement', status: '' },
    { num: 5, label: '\u00c9tat des lieux', status: '' },
  ])
  const [progressWidth, setProgressWidth] = useState('40%')

  // Modal
  const [showModal, setShowModal] = useState(false)

  // Message bar
  const [messageBar, setMessageBar] = useState(null)

  // Refs for stable access in callbacks
  const signataireName = useRef('')
  const contratDataRef = useRef(null)
  const matchDataRef = useRef(null)
  const proprietaireDataRef = useRef(null)
  const isLocataireRef = useRef(false)
  const isAdminRef = useRef(false)

  const showMessage = useCallback((type, text) => {
    setMessageBar({ type, text })
    setTimeout(() => setMessageBar(null), 4000)
  }, [])

  const formatDateLisible = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  // Auto capitalize
  const autoCapitalize = (value) => {
    return value.replace(/\b\w/g, c => c.toUpperCase())
  }

  // Verify form
  const verifierFormulaire = useCallback((lu, accepte, cgv, saisie) => {
    if (isAdminRef.current) {
      setBtnSignerDisabled(false)
      return
    }

    let nomValide = false
    if (saisie.length > 0 && signataireName.current) {
      const normaliser = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
      nomValide = normaliser(saisie) === normaliser(signataireName.current)

      if (nomValide) {
        setSigInputClass('sig-type-input valid')
        setSigHintClass('sig-type-hint success')
        setSigHintText('Identit\u00e9 confirm\u00e9e')
      } else {
        setSigInputClass('sig-type-input invalid')
        setSigHintClass('sig-type-hint error')
        setSigHintText('Le nom ne correspond pas \u00e0 votre identit\u00e9')
      }
    } else {
      setSigInputClass('sig-type-input')
      setSigHintClass('sig-type-hint')
      setSigHintText('')
    }

    const toutValide = lu && accepte && cgv && nomValide
    setBtnSignerDisabled(!toutValide)
  }, [])

  // Adapt consents by role
  const adapterConsentsParRole = useCallback((isLoc) => {
    if (isLoc) {
      setSigSectionTitle('IX. Signature du locataire')
      setSigIdentityLabel('Vous signez en tant que locataire')
      setLabelLuContrat('Je d\u00e9clare avoir lu l\u2019int\u00e9gralit\u00e9 du contrat de location meubl\u00e9e ci-dessus et en avoir compris toutes les clauses.')
      setLabelAccepteContrat('J\u2019accepte les termes du pr\u00e9sent contrat. Je m\u2019engage \u00e0 payer le loyer et les charges aux \u00e9ch\u00e9ances convenues, \u00e0 souscrire une assurance habitation et \u00e0 restituer le logement en bon \u00e9tat.')
    } else {
      setSigSectionTitle('IX. Signature du propri\u00e9taire')
      setSigIdentityLabel('Vous signez en tant que propri\u00e9taire')
      setLabelLuContrat('Je d\u00e9clare avoir lu l\u2019int\u00e9gralit\u00e9 du contrat de location meubl\u00e9e ci-dessus et en avoir compris toutes les clauses.')
      setLabelAccepteContrat('J\u2019accepte les termes du pr\u00e9sent contrat. Je m\u2019engage \u00e0 fournir un logement d\u00e9cent et conforme, \u00e0 effectuer les r\u00e9parations \u00e0 ma charge et \u00e0 respecter les droits du locataire pr\u00e9vus par la loi.')
    }
  }, [])

  // SHA-256 hash
  const genererHashDocument = async () => {
    const contratEl = document.querySelector('.contrat-card')
    const texte = contratEl ? contratEl.innerText : ''
    const cd = contratDataRef.current
    const donnees = texte + '|' +
      (cd?.id || '') + '|' +
      (cd?.loyer_mensuel || '') + '|' +
      (cd?.depot_garantie || '') + '|' +
      (cd?.date_debut || '') + '|' +
      (cd?.date_fin || '')

    const encoder = new TextEncoder()
    const data = encoder.encode(donnees)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const recupererIP = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json')
      const data = await res.json()
      return data.ip || 'inconnu'
    } catch {
      return 'inconnu'
    }
  }

  // Sign contract
  const signerContrat = async () => {
    const cd = contratDataRef.current
    const md = matchDataRef.current
    const pd = proprietaireDataRef.current
    const isLoc = isLocataireRef.current

    // Demo mode
    if (!cd) {
      setBtnSignerDisabled(true)
      setBtnSignerText('Signature en cours...')
      setTimeout(() => {
        setBtnSignerText('\u2713 Contrat sign\u00e9 !')
        showMessage('success', 'Contrat sign\u00e9 par les deux parties ! Redirection...')
        setTimeout(() => {
          navigate('/paiement')
        }, 1500)
      }, 1000)
      return
    }

    setBtnSignerDisabled(true)
    setBtnSignerText('Collecte des preuves...')

    try {
      const now = new Date().toISOString()
      const [ipAddress, documentHash] = await Promise.all([
        recupererIP(),
        genererHashDocument()
      ])
      const userAgent = navigator.userAgent
      const email = isLoc ? md.users.email : pd.email
      const nomComplet = signataireName.current

      const consentement = [
        'J\'ai lu l\'int\u00e9gralit\u00e9 du contrat de location meubl\u00e9e et en ai compris toutes les clauses.',
        'J\'accepte l\'ensemble des termes et conditions du pr\u00e9sent contrat.',
        'J\'accepte les CGV de STERNY et autorise la conservation de la preuve de ma signature.'
      ].join(' | ')

      setBtnSignerText('Signature en cours...')

      let updateData = {}
      let newStatut = ''
      const role = isLoc ? 'locataire' : 'proprietaire'

      if (isLoc) {
        updateData = {
          signature_locataire: true,
          date_signature_locataire: now,
          signature_locataire_ip: ipAddress,
          signature_locataire_user_agent: userAgent,
          signature_locataire_hash: documentHash,
          signature_locataire_email: email,
          signature_locataire_nom_complet: nomComplet,
          signature_locataire_consentement: consentement
        }
        newStatut = cd.signature_proprietaire ? 'signe' : 'signe_locataire'
      } else {
        updateData = {
          signature_proprietaire: true,
          date_signature_proprietaire: now,
          signature_proprietaire_ip: ipAddress,
          signature_proprietaire_user_agent: userAgent,
          signature_proprietaire_hash: documentHash,
          signature_proprietaire_email: email,
          signature_proprietaire_nom_complet: nomComplet,
          signature_proprietaire_consentement: consentement
        }
        newStatut = cd.signature_locataire ? 'signe' : 'signe_proprietaire'
      }
      updateData.statut = newStatut

      if (!cd.contrat_hash) {
        updateData.contrat_hash = documentHash
      }

      const { error } = await supabaseClient
        .from('contrats')
        .update(updateData)
        .eq('id', cd.id)

      if (error) throw error

      await supabaseClient
        .from('signatures_audit')
        .insert({
          document_type: 'contrat',
          document_id: cd.id,
          user_id: user.id,
          user_email: email,
          user_nom_complet: nomComplet,
          role_signataire: role,
          ip_address: ipAddress,
          user_agent: userAgent,
          document_hash: documentHash,
          consentement_texte: consentement,
          metadata: {
            contrat_id: cd.id,
            candidature_id: matchId,
            loyer_mensuel: cd.loyer_mensuel,
            depot_garantie: cd.depot_garantie,
            date_debut: cd.date_debut,
            date_fin: cd.date_fin
          }
        })

      Object.assign(cd, updateData)
      contratDataRef.current = cd
      setContratData({ ...cd })

      if (newStatut === 'signe') {
        const annonceId = cd.annonce_id
        if (annonceId) {
          await supabaseClient
            .from('annonces')
            .update({ disponible: false })
            .eq('id', annonceId)

          await supabaseClient
            .from('candidatures')
            .update({ statut: 'refusee' })
            .eq('annonce_id', annonceId)
            .eq('statut', 'en_attente')
        }

        await supabaseClient
          .from('candidatures')
          .update({ statut: 'paiement_ok' })
          .eq('id', matchId)
          .eq('statut', 'acceptee')

        showMessage('success', 'Contrat sign\u00e9 par les deux parties ! Redirection...')
        setTimeout(() => {
          navigate(`/paiement?match_id=${matchId}`)
        }, 1500)
      } else {
        showMessage('success', 'Votre signature a \u00e9t\u00e9 enregistr\u00e9e !')
        // Refresh signature status display
        afficherStatutSignatures(cd, md, pd, isLoc)
      }
    } catch (error) {
      console.error('Erreur signature:', error)
      showMessage('error', 'Erreur lors de la signature : ' + error.message)
      setBtnSignerDisabled(false)
      setBtnSignerText('Signer et continuer')
    }
  }

  const afficherStatutSignatures = useCallback((cd, md, pd, isLoc) => {
    if (!cd) return

    setShowSignatureStatus(true)
    const locName = md.users.prenom + ' ' + md.users.nom
    const propName = pd.prenom + ' ' + pd.nom
    setLocataireStatusName(locName)
    setProprietaireStatusName(propName)

    if (cd.signature_locataire) {
      setLocataireSigned(true)
      const d = new Date(cd.date_signature_locataire)
      setLocataireSignDate(`Sign\u00e9 le ${d.toLocaleDateString('fr-FR')}`)
    }
    if (cd.signature_proprietaire) {
      setProprietaireSigned(true)
      const d = new Date(cd.date_signature_proprietaire)
      setProprietaireSignDate(`Sign\u00e9 le ${d.toLocaleDateString('fr-FR')}`)
    }

    const dejaSigneParMoi = (isLoc && cd.signature_locataire) || (!isLoc && cd.signature_proprietaire)

    if (dejaSigneParMoi) {
      setShowSignForm(false)
      setShowDejaSign(true)
      setShowBtnSigner(false)

      if (cd.signature_locataire && cd.signature_proprietaire) {
        setDejaSigneMsg('Les deux parties ont sign\u00e9. Le contrat est valid\u00e9 !')
        setShowBtnSigner(true)
        setBtnSignerDisabled(false)
        setBtnSignerText('\u2192 Continuer vers le paiement')
      } else {
        const autrePart = isLoc ? 'du propri\u00e9taire' : 'du locataire'
        setDejaSigneMsg(`En attente de la signature ${autrePart}.`)
      }
    } else {
      setShowSignForm(true)
      setShowDejaSign(false)
      setShowBtnSigner(true)
    }

    // Print proof
    setPrintNomLocataire(locName)
    setPrintNomProprietaire(propName)

    if (cd.signature_locataire) {
      setPrintLocataireSigned(true)
      const d = new Date(cd.date_signature_locataire)
      setPrintStatusLocataire(`Sign\u00e9 le ${d.toLocaleDateString('fr-FR')} \u00e0 ${d.toLocaleTimeString('fr-FR')}`)
    }
    if (cd.signature_proprietaire) {
      setPrintProprietaireSigned(true)
      const d = new Date(cd.date_signature_proprietaire)
      setPrintStatusProprietaire(`Sign\u00e9 le ${d.toLocaleDateString('fr-FR')} \u00e0 ${d.toLocaleTimeString('fr-FR')}`)
    }
  }, [])

  // Load data
  useEffect(() => {
    async function chargerContrat() {
      try {
        if (!user) {
          // Demo mode without login
          if (!matchId) {
            setNomProprietaire('Jean Dupont')
            setInfoProprietaire('jean.dupont@email.com')
            setNomLocataire('Marie Martin')
            setInfoLocataire('marie.martin@email.com')
            setLoyerDetail('95\u20ac/sem')
            setLoyerMensuel('412\u20ac/mois')
            setDepotDetail('824\u20ac')
            const demoDebut = new Date()
            demoDebut.setMonth(demoDebut.getMonth() + 1)
            demoDebut.setDate(1)
            const demoFin = new Date(demoDebut)
            demoFin.setMonth(demoFin.getMonth() + 6)
            demoFin.setDate(0)
            setDateDebut(formatDateLisible(demoDebut.toISOString()))
            setDateFin(formatDateLisible(demoFin.toISOString()))
            setSigNomComplet('Marie Martin')
            setSigEmail('marie.martin@email.com')
            signataireName.current = 'Marie Martin'
            isLocataireRef.current = true
            setIsLocataire(true)
            adapterConsentsParRole(true)

            const now = new Date()
            setPrintNomLocataire('Marie Martin')
            setPrintNomProprietaire('Jean Dupont')
            setPrintStatusLocataire(`Sign\u00e9 le ${now.toLocaleDateString('fr-FR')} \u00e0 ${now.toLocaleTimeString('fr-FR')}`)
            setPrintStatusProprietaire(`Sign\u00e9 le ${now.toLocaleDateString('fr-FR')} \u00e0 ${now.toLocaleTimeString('fr-FR')}`)
            setPrintLocataireSigned(true)
            setPrintProprietaireSigned(true)
          }
          return
        }

        // Check admin
        const { data: adminCheck } = await supabaseClient.from('users').select('is_admin').eq('id', user.id).single()
        const isAdmin = adminCheck?.is_admin === true
        setIsAdminGlobal(isAdmin)
        isAdminRef.current = isAdmin

        // Demo mode (logged in but no match_id)
        if (!matchId) {
          setNomProprietaire('Jean Dupont')
          setInfoProprietaire('jean.dupont@email.com')
          setNomLocataire('Marie Martin')
          setInfoLocataire('marie.martin@email.com')
          setLoyerDetail('95\u20ac/sem')
          setLoyerMensuel('412\u20ac/mois')
          setDepotDetail('824\u20ac')
          const demoDebut = new Date()
          demoDebut.setMonth(demoDebut.getMonth() + 1)
          demoDebut.setDate(1)
          const demoFin = new Date(demoDebut)
          demoFin.setMonth(demoFin.getMonth() + 6)
          demoFin.setDate(0)
          setDateDebut(formatDateLisible(demoDebut.toISOString()))
          setDateFin(formatDateLisible(demoFin.toISOString()))
          setSigNomComplet('Marie Martin')
          setSigEmail('marie.martin@email.com')
          signataireName.current = 'Marie Martin'
          isLocataireRef.current = true
          setIsLocataire(true)
          adapterConsentsParRole(true)

          const now = new Date()
          setPrintNomLocataire('Marie Martin')
          setPrintNomProprietaire('Jean Dupont')
          setPrintStatusLocataire(`Sign\u00e9 le ${now.toLocaleDateString('fr-FR')} \u00e0 ${now.toLocaleTimeString('fr-FR')}`)
          setPrintStatusProprietaire(`Sign\u00e9 le ${now.toLocaleDateString('fr-FR')} \u00e0 ${now.toLocaleTimeString('fr-FR')}`)
          setPrintLocataireSigned(true)
          setPrintProprietaireSigned(true)
          return
        }

        const { data: candidature, error } = await supabaseClient
          .from('candidatures')
          .select('*, annonces (*), users!candidatures_locataire_id_fkey (*)')
          .eq('id', matchId)
          .single()

        if (error) throw error
        setMatchData(candidature)
        matchDataRef.current = candidature
        const isLoc = (user.id === candidature.locataire_id)
        const isProp = (user.id === candidature.annonces?.user_id)
        setIsLocataire(isLoc)
        isLocataireRef.current = isLoc

        if (!isLoc && !isProp && !isAdmin) {
          alert('Acc\u00e8s non autoris\u00e9 \u00e0 ce contrat.')
          navigate('/')
          return
        }

        if (candidature.statut === 'paiement_ok') {
          navigate(`/etat-des-lieux?match_id=${matchId}`)
          return
        }
        if (candidature.statut === 'actif') {
          navigate(`/match-actif?match_id=${matchId}`)
          return
        }

        const { data: proprietaire } = await supabaseClient
          .from('users')
          .select('*')
          .eq('id', candidature.annonces.user_id)
          .single()
        setProprietaireData(proprietaire)
        proprietaireDataRef.current = proprietaire

        // Afficher contrat
        const annonce = candidature.annonces
        const locataire = candidature.users
        setNomProprietaire(`${proprietaire.prenom} ${proprietaire.nom}`)
        setInfoProprietaire(proprietaire.email || '')
        setNomLocataire(`${locataire.prenom} ${locataire.nom}`)
        setInfoLocataire(locataire.email || '')

        const prixSemaine = annonce.prix
        const loyerMensuelVal = Math.round(prixSemaine * 52 / 12)
        const depot = loyerMensuelVal * 2
        setLoyerDetail(`${prixSemaine}\u20ac/sem`)
        setLoyerMensuel(`${loyerMensuelVal}\u20ac/mois`)
        setDepotDetail(`${depot}\u20ac`)

        // Adapt for renewal
        if (candidature.est_renouvellement) {
          setProgressSteps([
            { num: 1, label: 'Renouvellement', status: 'completed' },
            { num: 2, label: 'Contrat', status: 'active' },
            { num: 3, label: 'Paiement', status: '' },
          ])
          setProgressWidth('50%')
          setRetourHref('/dashboard')
        } else {
          setRetourHref(matchId ? `/dossier-locataire?match_id=${matchId}` : '/dossier-locataire')
        }

        // Charger ou creer contrat
        const { data: contrat } = await supabaseClient
          .from('contrats')
          .select('*')
          .eq('candidature_id', matchId)
          .single()

        let cd
        if (contrat) {
          cd = contrat
        } else {
          const today = new Date()
          const debut = new Date(today)
          debut.setMonth(debut.getMonth() + 1)
          debut.setDate(1)
          const fin = new Date(debut)
          fin.setMonth(fin.getMonth() + 6)
          fin.setDate(0)

          const { data: newContrat, error: createError } = await supabaseClient
            .from('contrats')
            .insert({
              candidature_id: matchId,
              locataire_id: candidature.locataire_id,
              proprietaire_id: candidature.annonces.user_id,
              annonce_id: annonce.id,
              loyer_mensuel: Math.round(annonce.prix * 52 / 12),
              depot_garantie: Math.round(annonce.prix * 52 / 12) * 2,
              date_debut: debut.toISOString().split('T')[0],
              date_fin: fin.toISOString().split('T')[0],
              statut: 'en_attente'
            })
            .select()
            .single()

          if (createError) { console.error('Erreur cr\u00e9ation contrat:', createError); return }
          cd = newContrat
        }

        setContratData(cd)
        contratDataRef.current = cd

        if (cd.date_debut) setDateDebut(formatDateLisible(cd.date_debut))
        if (cd.date_fin) {
          setDateFin(formatDateLisible(cd.date_fin))
          const d1 = new Date(cd.date_debut)
          const d2 = new Date(cd.date_fin)
          const mois = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
          setDureeMois(`${mois} mois`)
        }

        // Show signatures
        afficherStatutSignatures(cd, candidature, proprietaire, isLoc)

        // Signatory identity
        let nom, emailVal
        if (isLoc) {
          nom = `${locataire.prenom} ${locataire.nom}`
          emailVal = locataire.email
        } else {
          nom = `${proprietaire.prenom} ${proprietaire.nom}`
          emailVal = proprietaire.email
        }
        signataireName.current = nom
        setSigNomComplet(nom)
        setSigEmail(emailVal)
        adapterConsentsParRole(isLoc)

      } catch (error) {
        console.error('Erreur:', error)
        alert('Erreur lors du chargement du contrat')
      }
    }

    chargerContrat()
  }, [user, matchId, navigate, adapterConsentsParRole, afficherStatutSignatures])

  // Handle signature name input
  const handleSigNameChange = (e) => {
    const val = autoCapitalize(e.target.value)
    setSigSaisieNom(val)
    verifierFormulaire(checkLu, checkAccepte, checkCgv, val)
  }

  const handleCheckChange = (setter, newVal, otherLu, otherAccepte, otherCgv) => {
    setter(newVal)
    // We need to pass the new values since state hasn't updated yet
    verifierFormulaire(otherLu, otherAccepte, otherCgv, sigSaisieNom)
  }

  const handleBtnClick = () => {
    // If both signed, redirect to payment
    const cd = contratDataRef.current
    if (cd && cd.signature_locataire && cd.signature_proprietaire) {
      navigate(`/paiement?match_id=${matchId}`)
      return
    }
    setShowModal(true)
  }

  const confirmerSignature = () => {
    setShowModal(false)
    signerContrat()
  }

  return (
    <div className="contrat-page-container">
      {messageBar && (
        <div className={`contrat-message-bar ${messageBar.type}`}>{messageBar.text}</div>
      )}

      {/* PAGE HEADER */}
      <div className="contrat-page-header">
        <h1>Contrat de location meubl&eacute;e</h1>
        <p>Lisez attentivement et signez &eacute;lectroniquement</p>
      </div>

      {/* PROGRESS */}
      <div className="card progress-card">
        <div className="progress-steps" style={{ gridTemplateColumns: `repeat(${progressSteps.length}, 1fr)` }}>
          {progressSteps.map((step) => (
            <div key={step.num} className={`progress-step ${step.status}`}>
              <div className="step-number">{step.num}</div>
              <div className="step-label">{step.label}</div>
            </div>
          ))}
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: progressWidth }} />
        </div>
      </div>

      {/* CONTRAT */}
      <div className="card contrat-card">

        {/* I. Designation des parties */}
        <div className="contrat-section">
          <div className="section-label">I. D&eacute;signation des parties</div>
          <div className="parties-grid">
            <div className="partie-box">
              <div className="partie-role">Propri&eacute;taire</div>
              <div className="partie-name">{nomProprietaire}</div>
              <div className="partie-info">{infoProprietaire}</div>
            </div>
            <div className="partie-box">
              <div className="partie-role">Locataire</div>
              <div className="partie-name">{nomLocataire}</div>
              <div className="partie-info">{infoLocataire}</div>
            </div>
          </div>
          <div className="contrat-text" style={{ marginTop: 12 }}>
            <p>Le pr&eacute;sent contrat est &eacute;tabli par l&rsquo;interm&eacute;diaire de la plateforme <strong>STERNY</strong>, auto-entreprise immatricul&eacute;e sous le n&deg; SIRET [&Agrave; COMPL&Eacute;TER], agissant en qualit&eacute; de mandataire pour la mise en relation entre le propri&eacute;taire et le locataire. STERNY n&rsquo;est pas partie au contrat de location.</p>
          </div>
        </div>

        {/* II. Objet du contrat */}
        <div className="contrat-section">
          <div className="section-label">II. Objet du contrat</div>
          <div className="contrat-text">
            <p>Le pr&eacute;sent contrat a pour objet la location d&rsquo;un <strong>logement meubl&eacute;</strong> &agrave; usage d&rsquo;habitation principale du locataire, conform&eacute;ment aux articles 25-3 &agrave; 25-11 de la loi n&deg; 89-462 du 6 juillet 1989 et au d&eacute;cret n&deg; 2015-587 du 29 mai 2015 (annexe 2).</p>
            <p>Le logement est situ&eacute; &agrave; l&rsquo;adresse indiqu&eacute;e dans l&rsquo;annonce STERNY correspondante. Il est &eacute;quip&eacute; d&rsquo;un mobilier en nombre et en qualit&eacute; suffisants pour permettre au locataire d&rsquo;y dormir, manger et vivre convenablement au sens du d&eacute;cret n&deg; 2015-981 du 31 juillet 2015. L&rsquo;inventaire d&eacute;taill&eacute; du mobilier est annex&eacute; au pr&eacute;sent contrat.</p>
            <p><span className="clause-ref">Loi n&deg; 89-462 du 6 juillet 1989, art. 25-4 &mdash; D&eacute;cret n&deg; 2015-981 du 31 juillet 2015</span></p>
          </div>
        </div>

        {/* III. Duree et conditions financieres */}
        <div className="contrat-section">
          <div className="section-label">III. Dur&eacute;e et conditions financi&egrave;res</div>
          <div className="info-grid-2">
            <div className="info-item-2">
              <div className="item-label">Loyer hebdomadaire CC</div>
              <div className="item-value accent">{loyerDetail}</div>
            </div>
            <div className="info-item-2">
              <div className="item-label">Loyer mensuel estim&eacute;</div>
              <div className="item-value">{loyerMensuel}</div>
            </div>
            <div className="info-item-2">
              <div className="item-label">Dur&eacute;e du bail</div>
              <div className="item-value">{dureeMois}</div>
            </div>
            <div className="info-item-2">
              <div className="item-label">D&eacute;but du bail</div>
              <div className="item-value">{dateDebut}</div>
            </div>
            <div className="info-item-2">
              <div className="item-label">Fin du bail</div>
              <div className="item-value">{dateFin}</div>
            </div>
            <div className="info-item-2">
              <div className="item-label">D&eacute;p&ocirc;t de garantie</div>
              <div className="item-value">{depotDetail}</div>
            </div>
            <div className="info-item-2">
              <div className="item-label">Pr&eacute;avis de d&eacute;part</div>
              <div className="item-value">1 mois</div>
            </div>
          </div>
          <div className="contrat-text" style={{ marginTop: 14 }}>
            <p>S&rsquo;agissant d&rsquo;un bail meubl&eacute; consenti &agrave; un &eacute;tudiant, la dur&eacute;e du bail est de <strong>{dureeMois}</strong> (9 mois maximum l&eacute;gaux). Le bail prend fin automatiquement &agrave; son terme, sans reconduction tacite (art. 25-7 de la loi du 6 juillet 1989).</p>
            <p>Le loyer est payable d&rsquo;avance au premier jour de chaque semaine. Les charges locatives sont comprises dans le loyer sous forme de forfait. Ce forfait est r&eacute;vis&eacute; dans les m&ecirc;mes conditions que le loyer principal.</p>
            <p>Le d&eacute;p&ocirc;t de garantie, plafonn&eacute; &agrave; <strong>deux mois de loyer hors charges</strong> (art. 25-6 de la loi du 6 juillet 1989), est exigible &agrave; la signature du contrat. Il sera restitu&eacute; dans un d&eacute;lai d&rsquo;un mois apr&egrave;s la restitution des cl&eacute;s si l&rsquo;&eacute;tat des lieux de sortie est conforme, ou de deux mois en cas de diff&eacute;rences, d&eacute;duction faite des sommes restant dues.</p>
            <p><span className="clause-ref">Loi n&deg; 89-462 du 6 juillet 1989, art. 25-6 et 25-7 &mdash; D&eacute;cret n&deg; 2015-587, annexe 2, &sect; III et IV</span></p>
          </div>
        </div>

        {/* IV. Obligations des parties */}
        <div className="contrat-section">
          <div className="section-label">IV. Obligations des parties</div>
          <div className="obligations-grid">
            <div>
              <div className="obligations-col-title"><span className="dot dot-orange" /> Locataire</div>
              <ul className="obligations-list">
                <li>Payer le loyer et les charges aux termes convenus</li>
                <li>Souscrire une assurance habitation couvrant les risques locatifs (responsabilit&eacute; civile)</li>
                <li>User paisiblement du logement et respecter la destination d&rsquo;habitation</li>
                <li>R&eacute;pondre des d&eacute;gradations survenues pendant la jouissance des lieux</li>
                <li>Prendre en charge l&rsquo;entretien courant et les menues r&eacute;parations</li>
                <li>Laisser ex&eacute;cuter les travaux d&rsquo;am&eacute;lioration ou d&rsquo;entretien n&eacute;cessaires</li>
                <li>Ne pas transformer les locaux sans accord &eacute;crit du propri&eacute;taire</li>
                <li>Informer le propri&eacute;taire de tout sinistre ou d&eacute;gradation dans les plus brefs d&eacute;lais</li>
              </ul>
            </div>
            <div>
              <div className="obligations-col-title"><span className="dot dot-slate" /> Propri&eacute;taire</div>
              <ul className="obligations-list">
                <li>D&eacute;livrer un logement d&eacute;cent, en bon &eacute;tat d&rsquo;usage et de r&eacute;parations</li>
                <li>Assurer la jouissance paisible du logement</li>
                <li>Entretenir le logement en &eacute;tat de servir &agrave; l&rsquo;usage pr&eacute;vu</li>
                <li>Effectuer les r&eacute;parations autres que locatives (gros &oelig;uvre, toiture, etc.)</li>
                <li>Ne pas s&rsquo;opposer aux am&eacute;nagements r&eacute;alis&eacute;s par le locataire ne modifiant pas la structure</li>
                <li>Fournir les diagnostics techniques obligatoires</li>
                <li>D&eacute;livrer les quittances de loyer gratuitement</li>
              </ul>
            </div>
          </div>
          <div className="contrat-text" style={{ marginTop: 12 }}>
            <p><span className="clause-ref">Loi n&deg; 89-462 du 6 juillet 1989, art. 6 et 7 &mdash; D&eacute;cret n&deg; 87-712 du 26 ao&ucirc;t 1987 (r&eacute;parations locatives)</span></p>
          </div>
        </div>

        {/* V. Resiliation */}
        <div className="contrat-section">
          <div className="section-label">V. R&eacute;siliation et clause r&eacute;solutoire</div>
          <div className="contrat-text">
            <p><strong>R&eacute;siliation par le locataire :</strong> Le locataire peut r&eacute;silier le bail &agrave; tout moment, sous r&eacute;serve de respecter un d&eacute;lai de pr&eacute;avis d&rsquo;un mois, d&eacute;livr&eacute; par lettre recommand&eacute;e avec accus&eacute; de r&eacute;ception, par acte d&rsquo;huissier, ou par remise en main propre contre r&eacute;c&eacute;piss&eacute;. Pendant le pr&eacute;avis, le loyer est d&ucirc; au prorata du nombre de jours d&rsquo;occupation.</p>
            <p><strong>Fin du bail &eacute;tudiant :</strong> Le bail prend fin automatiquement &agrave; son terme (dur&eacute;e indiqu&eacute;e &agrave; la section III). Aucun cong&eacute; n&rsquo;est n&eacute;cessaire de la part du locataire.</p>
            <p><strong>Possibilit&eacute; de renouvellement :</strong> &Agrave; l&rsquo;approche du terme du bail, le locataire peut formuler une demande de renouvellement via la plateforme STERNY. Le propri&eacute;taire dispose d&rsquo;un droit discr&eacute;tionnaire d&rsquo;accepter ou de refuser cette demande, sans avoir &agrave; motiver sa d&eacute;cision. En cas d&rsquo;accord, un <strong>nouveau contrat de location</strong> sera &eacute;tabli pour une dur&eacute;e n&rsquo;exc&eacute;dant pas neuf mois, conform&eacute;ment &agrave; l&rsquo;article 25-7 de la loi du 6 juillet 1989. Le d&eacute;p&ocirc;t de garantie du bail pr&eacute;c&eacute;dent sera conserv&eacute; sauf modification du loyer. Le renouvellement ne constitue pas une reconduction tacite au sens de la loi.</p>
            <p><strong>Clause r&eacute;solutoire :</strong> Le pr&eacute;sent bail sera r&eacute;sili&eacute; de plein droit, apr&egrave;s mise en demeure rest&eacute;e infructueuse pendant deux mois, en cas de :</p>
            <ul>
              <li>D&eacute;faut de paiement du loyer ou des charges aux termes convenus</li>
              <li>Non-versement du d&eacute;p&ocirc;t de garantie</li>
              <li>Non-souscription d&rsquo;une assurance habitation couvrant les risques locatifs</li>
              <li>Troubles de voisinage constat&eacute;s par d&eacute;cision de justice pass&eacute;e en force de chose jug&eacute;e</li>
            </ul>
            <p><span className="clause-ref">Loi n&deg; 89-462 du 6 juillet 1989, art. 15, 24 et 25-8 &mdash; Loi n&deg; 2023-668 du 27 juillet 2023</span></p>
          </div>
        </div>

        {/* VI. Etat des lieux */}
        <div className="contrat-section">
          <div className="section-label">VI. &Eacute;tat des lieux et inventaire</div>
          <div className="contrat-text">
            <p>Un <strong>&eacute;tat des lieux d&rsquo;entr&eacute;e</strong> contradictoire et un <strong>inventaire d&eacute;taill&eacute; du mobilier</strong> sont &eacute;tablis lors de la remise des cl&eacute;s, conform&eacute;ment &agrave; l&rsquo;article 3-2 de la loi du 6 juillet 1989. Ils sont annex&eacute;s au pr&eacute;sent contrat.</p>
            <p>Un &eacute;tat des lieux de sortie et un inventaire contradictoire sont &eacute;tablis lors de la restitution des cl&eacute;s. En cas de d&eacute;saccord, les parties peuvent faire appel &agrave; un huissier de justice, dont les frais seront partag&eacute;s par moiti&eacute;.</p>
            <p>Le locataire dispose d&rsquo;un d&eacute;lai de <strong>10 jours</strong> &agrave; compter de la r&eacute;alisation de l&rsquo;&eacute;tat des lieux d&rsquo;entr&eacute;e pour demander sa compl&eacute;tion.</p>
            <p><span className="clause-ref">Loi n&deg; 89-462 du 6 juillet 1989, art. 3-2 &mdash; D&eacute;cret n&deg; 2016-382 du 30 mars 2016</span></p>
          </div>
        </div>

        {/* VII. Annexes */}
        <div className="contrat-section">
          <div className="section-label">VII. Annexes obligatoires</div>
          <div className="contrat-text">
            <p>Le propri&eacute;taire s&rsquo;engage &agrave; fournir, conform&eacute;ment &agrave; la loi, l&rsquo;ensemble des annexes obligatoires au pr&eacute;sent contrat, notamment :</p>
            <ul>
              <li>Notice d&rsquo;information relative aux droits et obligations des locataires et propri&eacute;taires</li>
              <li>Diagnostic de performance &eacute;nerg&eacute;tique (DPE)</li>
              <li>&Eacute;tat des risques naturels, miniers et technologiques (ERNT)</li>
              <li>Constat de risque d&rsquo;exposition au plomb (logements avant 1949)</li>
              <li>Diagnostics amiante, gaz et &eacute;lectricit&eacute; (le cas &eacute;ch&eacute;ant)</li>
              <li>Inventaire d&eacute;taill&eacute; du mobilier</li>
              <li>&Eacute;tat des lieux d&rsquo;entr&eacute;e</li>
              <li>R&egrave;glement de copropri&eacute;t&eacute; (si immeuble collectif)</li>
            </ul>
            <p>L&rsquo;absence de fourniture du DPE interdit toute action en r&eacute;vision de loyer.</p>
            <p><span className="clause-ref">Loi n&deg; 89-462 du 6 juillet 1989, art. 3-3 &mdash; Code de la construction et de l&rsquo;habitation, art. L.126-26 et suivants</span></p>
          </div>
        </div>

        {/* VIII. Dispositions particulieres */}
        <div className="contrat-section">
          <div className="section-label">VIII. Dispositions particuli&egrave;res</div>
          <div className="contrat-text">
            <p><strong>Interm&eacute;diation STERNY :</strong> Le pr&eacute;sent contrat est conclu par l&rsquo;interm&eacute;diaire de la plateforme STERNY, qui assure la mise en relation, la gestion des paiements et le suivi administratif. Les honoraires de mise en relation sont int&eacute;gr&eacute;s au loyer affich&eacute; et &agrave; la charge exclusive du propri&eacute;taire. Aucun frais suppl&eacute;mentaire n&rsquo;est factur&eacute; au locataire au titre de l&rsquo;interm&eacute;diation.</p>
            <p><strong>Assurance :</strong> Le locataire est tenu de justifier de la souscription d&rsquo;une assurance habitation couvrant les risques locatifs &agrave; la signature du bail et, sur demande du propri&eacute;taire, &agrave; chaque renouvellement annuel de la police. Le propri&eacute;taire ne peut imposer le choix de l&rsquo;assureur.</p>
            <p><strong>Animaux :</strong> Aucune clause ne peut interdire la d&eacute;tention d&rsquo;un animal domestique, sous r&eacute;serve qu&rsquo;il ne cause ni d&eacute;g&acirc;t ni trouble de jouissance.</p>
            <p><strong>R&eacute;vision du loyer :</strong> Le loyer peut &ecirc;tre r&eacute;vis&eacute; annuellement sur la base de l&rsquo;Indice de R&eacute;f&eacute;rence des Loyers (IRL) publi&eacute; par l&rsquo;INSEE. En l&rsquo;absence de clause de r&eacute;vision, le loyer reste fixe pendant toute la dur&eacute;e du bail.</p>
            <p><strong>Loi applicable :</strong> Le pr&eacute;sent contrat est soumis aux dispositions de la loi n&deg; 89-462 du 6 juillet 1989, du d&eacute;cret n&deg; 2015-587 du 29 mai 2015 et de l&rsquo;ensemble des textes r&eacute;glementaires en vigueur. Tout litige relatif &agrave; l&rsquo;ex&eacute;cution du pr&eacute;sent contrat rel&egrave;ve de la comp&eacute;tence du tribunal judiciaire du lieu de situation de l&rsquo;immeuble.</p>
          </div>
        </div>

        {/* Signature section */}
        <div className="contrat-section">
          {/* Signature status grid */}
          {showSignatureStatus && (
            <div className="sig-status-grid">
              <div className={`sig-status-card${locataireSigned ? ' signed' : ''}`}>
                <div className="sig-status-role">{locataireStatusName}</div>
                <div className="sig-status-icon">
                  {locataireSigned ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  )}
                </div>
                <div className="sig-status-date">{locataireSignDate}</div>
              </div>
              <div className={`sig-status-card${proprietaireSigned ? ' signed' : ''}`}>
                <div className="sig-status-role">{proprietaireStatusName}</div>
                <div className="sig-status-icon">
                  {proprietaireSigned ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  )}
                </div>
                <div className="sig-status-date">{proprietaireSignDate}</div>
              </div>
            </div>
          )}

          {/* Already signed block */}
          {showDejaSign && (
            <div className="sig-done-block">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              <div className="sig-done-title">Vous avez sign&eacute; le contrat</div>
              <div className="sig-done-msg">{dejaSigneMsg}</div>
            </div>
          )}

          {/* Signature form */}
          {showSignForm && (
            <div className="sig-form">
              <div className="section-label" style={{ paddingTop: 14, marginBottom: 12 }}>{sigSectionTitle}</div>

              <div className="sig-identity">
                <div className="sig-identity-avatar">
                  <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
                <div className="sig-identity-info">
                  <div className="sig-identity-label">{sigIdentityLabel}</div>
                  <div className="sig-identity-name">{sigNomComplet}</div>
                  <div className="sig-identity-email">{sigEmail}</div>
                </div>
              </div>

              <div className="sig-consents">
                <label className="sig-check">
                  <input type="checkbox" checked={checkLu} onChange={(e) => handleCheckChange(setCheckLu, e.target.checked, e.target.checked, checkAccepte, checkCgv)} />
                  <span className="sig-check-label">{labelLuContrat}</span>
                </label>
                <label className="sig-check">
                  <input type="checkbox" checked={checkAccepte} onChange={(e) => handleCheckChange(setCheckAccepte, e.target.checked, checkLu, e.target.checked, checkCgv)} />
                  <span className="sig-check-label">{labelAccepteContrat}</span>
                </label>
                <label className="sig-check">
                  <input type="checkbox" checked={checkCgv} onChange={(e) => handleCheckChange(setCheckCgv, e.target.checked, checkLu, checkAccepte, e.target.checked)} />
                  <span className="sig-check-label">J&rsquo;accepte les <a href="/cgv" target="_blank" rel="noopener noreferrer">Conditions G&eacute;n&eacute;rales</a> de STERNY et j&rsquo;autorise la plateforme &agrave; conserver la preuve de ma signature.</span>
                </label>
              </div>

              <div className="sig-confirm-block">
                <label className="sig-type-label" htmlFor="sigSaisieNom">
                  <svg viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                  Pr&eacute;nom et nom
                </label>
                <input
                  type="text"
                  className={sigInputClass}
                  id="sigSaisieNom"
                  placeholder="Pr\u00e9nom Nom"
                  autoComplete="off"
                  value={sigSaisieNom}
                  onChange={handleSigNameChange}
                />
                <div className={sigHintClass}>{sigHintText}</div>
              </div>

              <div className="sig-legal-block">
                <p className="sig-legal"><strong>Signature &eacute;lectronique &agrave; valeur l&eacute;gale</strong></p>
                <p className="sig-legal">En cliquant sur &laquo; Signer &raquo;, vous apposez votre signature &eacute;lectronique au sens de l&rsquo;article 1367 du Code civil et du r&egrave;glement eIDAS (UE) n&deg; 910/2014.</p>
                <p className="sig-legal">Preuves enregistr&eacute;es : identit&eacute;, e-mail, horodatage, IP, empreinte SHA-256 et consentement.</p>
              </div>
            </div>
          )}

          {/* Print proof */}
          <div className="sig-print-proof">
            <div className="sig-print-title">IX. Signatures &eacute;lectroniques</div>
            <div className="sig-print-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className={`sig-print-card${printLocataireSigned ? ' signed' : ''}`} style={{ border: '1.5px solid', borderColor: printLocataireSigned ? '#22C55E' : '#E2E8F0', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B7280', marginBottom: 4 }}>Locataire</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>{printNomLocataire}</div>
                <div style={{ fontSize: '11.5px', color: printLocataireSigned ? '#059669' : '#9CA3AF' }}>{printStatusLocataire}</div>
              </div>
              <div className={`sig-print-card${printProprietaireSigned ? ' signed' : ''}`} style={{ border: '1.5px solid', borderColor: printProprietaireSigned ? '#22C55E' : '#E2E8F0', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B7280', marginBottom: 4 }}>Propri&eacute;taire</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>{printNomProprietaire}</div>
                <div style={{ fontSize: '11.5px', color: printProprietaireSigned ? '#059669' : '#9CA3AF' }}>{printStatusProprietaire}</div>
              </div>
            </div>
            <div style={{ fontSize: '9.5px', color: '#9CA3AF', lineHeight: 1.5, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
              Signature &eacute;lectronique au sens de l&rsquo;article 1367 du Code civil et du r&egrave;glement eIDAS (UE) n&deg; 910/2014.<br />
              Preuves enregistr&eacute;es : identit&eacute;, e-mail, horodatage, adresse IP, empreinte SHA-256 et consentement.
            </div>
          </div>

          <div className="sig-email-notice">
            <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,4 12,13 2,4" /></svg>
            Une copie du contrat sign&eacute; vous sera envoy&eacute;e par e-mail une fois les deux signatures valid&eacute;es.
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="actions-card">
        <Link to={retourHref} className="btn-back">Retour</Link>
        {showBtnSigner && (
          <button className="btn-primary" disabled={btnSignerDisabled} onClick={handleBtnClick}>
            {btnSignerText}
          </button>
        )}
      </div>

      {/* MODAL */}
      <div className={`modal-overlay${showModal ? ' active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
        <div className="modal-box">
          <div className="modal-icon">
            <svg viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          </div>
          <div className="modal-title">Confirmer la signature</div>
          <div className="modal-text">
            Vous &ecirc;tes sur le point de <strong>signer &eacute;lectroniquement</strong> ce contrat de location meubl&eacute;e.<br /><br />
            Cette action a <strong>valeur juridique</strong> et ne peut pas &ecirc;tre annul&eacute;e. &Ecirc;tes-vous s&ucirc;r(e) de vouloir continuer ?
          </div>
          <div className="modal-buttons">
            <button className="modal-btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="modal-btn-confirm" onClick={confirmerSignature}>Oui, je signe</button>
          </div>
        </div>
      </div>
    </div>
  )
}
