import { useEffect } from 'react'
import ChatComponent from '../../components/chat/ChatComponent'
import { useAuth } from '../../hooks/useAuth'
import './MessagesPage.css'

export default function MessagesPage() {
  const { user } = useAuth()

  // Body scroll is allowed — sidebar scrolls with page to reveal footer
  // Right column (thread) stays fixed via CSS sticky

  if (!user) return null

  return (
    <div className="messages-page-container">
      <ChatComponent
        mode="page"
        currentUserId={user.id}
        currentUserType={null}
      />
    </div>
  )
}
