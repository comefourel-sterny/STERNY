import ChatComponent from '../../components/chat/ChatComponent'
import { useAuth } from '../../hooks/useAuth'
import './MessagesPage.css'

export default function MessagesPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
      <ChatComponent
        mode="page"
        currentUserId={user.id}
        currentUserType={null}
      />
    </div>
  )
}
