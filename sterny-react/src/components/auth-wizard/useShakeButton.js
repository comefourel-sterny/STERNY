import { useRef, useCallback } from 'react'

export function useShakeButton() {
  const ref = useRef(null)
  const shake = useCallback(() => {
    const btn = ref.current
    if (!btn) return
    btn.style.transition = 'translate 0.06s ease'
    btn.style.translate = '-1.5px 0'
    setTimeout(() => { btn.style.translate = '1.5px 0' }, 60)
    setTimeout(() => { btn.style.translate = '-0.5px 0' }, 120)
    setTimeout(() => { btn.style.translate = '0' }, 180)
  }, [])
  return { ref, shake }
}
