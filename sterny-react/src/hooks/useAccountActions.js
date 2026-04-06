import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth.jsx'
import { supabaseClient } from '../config/supabase'

export default function useAccountActions() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' })
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const openPasswordModal = () => {
    setPwdNew('')
    setPwdConfirm('')
    setPwdMsg({ text: '', type: '' })
    setShowPasswordModal(true)
  }

  const openDeleteModal = () => {
    setDeleteConfirm('')
    setShowDeleteModal(true)
  }

  const changerMotDePasse = async () => {
    if (pwdNew.length < 8) {
      setPwdMsg({ text: 'Le mot de passe doit contenir au moins 8 caracteres.', type: 'error' })
      return
    }
    if (pwdNew !== pwdConfirm) {
      setPwdMsg({ text: 'Les deux mots de passe ne correspondent pas.', type: 'error' })
      return
    }
    try {
      const result = await supabaseClient.auth.updateUser({ password: pwdNew })
      if (result.error) throw result.error
      setPwdMsg({ text: 'Mot de passe modifie avec succes !', type: 'success' })
      setTimeout(() => {
        setShowPasswordModal(false)
        setPwdMsg({ text: '', type: '' })
      }, 1500)
    } catch (e) {
      setPwdMsg({ text: e.message || 'Erreur lors du changement.', type: 'error' })
    }
  }

  const supprimerCompte = async () => {
    try {
      const session = await supabaseClient.auth.getSession()
      const token = session.data.session.access_token
      const res = await fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/delete-account', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      await signOut()
      navigate('/')
    } catch (e) {
      console.error('Erreur suppression compte:', e)
      alert('Erreur lors de la suppression.')
    }
  }

  const exporterDonnees = async () => {
    try {
      const session = await supabaseClient.auth.getSession()
      const token = session.data.session.access_token
      const res = await fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/export-data', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
      })
      if (!res.ok) throw new Error('Erreur export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sterny-mes-donnees-' + new Date().toISOString().split('T')[0] + '.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Erreur export:', e)
      alert("Erreur lors de l'export.")
    }
  }

  return {
    // Password modal
    showPasswordModal, setShowPasswordModal,
    pwdNew, setPwdNew,
    pwdConfirm, setPwdConfirm,
    pwdMsg,
    openPasswordModal,
    changerMotDePasse,
    // Delete modal
    showDeleteModal, setShowDeleteModal,
    deleteConfirm, setDeleteConfirm,
    openDeleteModal,
    supprimerCompte,
    // Export
    exporterDonnees
  }
}
