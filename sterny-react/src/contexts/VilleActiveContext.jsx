import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { getVillesUtilisateur } from '../utils/deriveVilleColonnes'
import { supabaseClient } from '../config/supabase'

const VilleActiveContext = createContext(null)

export function VilleActiveProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [profil, setProfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [natureActive, setNatureActive] = useState(null)

  // Charge le profil (ville_ecole/ville_entreprise/statut_*) séparément de
  // l'identité de connexion (useAuth ne contient pas ces colonnes).
  // DETTE #145 : ce fetch est fait aussi par 3 autres pages, à factoriser
  // plus tard, pas dans ce chantier.
  useEffect(() => {
    let annule = false

    async function chargerProfil() {
      if (authLoading) return
      if (!user) {
        setProfil(null)
        setNatureActive(null)
        setLoading(false)
        return
      }
      setLoading(true)
      const { data, error } = await supabaseClient
        .from('users')
        .select('ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise')
        .eq('id', user.id)
        .single()

      if (annule) return
      if (error) {
        console.error('VilleActiveContext: erreur chargement profil', error)
        setProfil(null)
      } else {
        setProfil(data)
      }
      setLoading(false)
    }

    chargerProfil()
    return () => { annule = true }
  }, [user, authLoading])

  const villesDisponibles = profil ? getVillesUtilisateur(profil) : []

  // Résout la ville active depuis le stockage local navigateur. Clé scopée
  // par userId pour éviter qu'un compte hérite du choix d'un autre compte
  // sur le même navigateur (décision VISION-ARCHITECTURE.md 20/07/2026).
  useEffect(() => {
    if (!user || villesDisponibles.length === 0) return

    const cle = `sterny_ville_active_${user.id}`
    const stockee = localStorage.getItem(cle)
    const valide = villesDisponibles.some(v => v.nature === stockee)

    setNatureActive(valide ? stockee : villesDisponibles[0].nature)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, villesDisponibles.length])

  const setVilleActive = useCallback((nature) => {
    if (!user) return
    setNatureActive(nature)
    localStorage.setItem(`sterny_ville_active_${user.id}`, nature)
  }, [user])

  const villeActive = villesDisponibles.find(v => v.nature === natureActive) || villesDisponibles[0] || null

  const value = { villeActive, villesDisponibles, setVilleActive, loading }

  return (
    <VilleActiveContext.Provider value={value}>
      {children}
    </VilleActiveContext.Provider>
  )
}

export function useVilleActive() {
  const ctx = useContext(VilleActiveContext)
  if (!ctx) {
    throw new Error("useVilleActive doit être utilisé à l'intérieur de VilleActiveProvider")
  }
  return ctx
}
