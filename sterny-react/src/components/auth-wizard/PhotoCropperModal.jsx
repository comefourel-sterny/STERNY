import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './PhotoCropperModal.css'

const AREA_SIZE = 220
const OUTPUT_SIZE = 400

export default function PhotoCropperModal({ open, onClose, onConfirm, imageFile }) {
  const [imageSrc, setImageSrc] = useState(null)
  const [zoom, setZoom] = useState(100)
  const [zoomMin, setZoomMin] = useState(50)
  const [zoomMax, setZoomMax] = useState(300)
  const imgRef = useRef(null)
  const stateRef = useRef({ scale: 1, imgX: 0, imgY: 0, dragging: false, startX: 0, startY: 0, imgStartX: 0, imgStartY: 0 })

  useEffect(() => {
    if (!open || !imageFile) {
      setImageSrc(null)
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setImageSrc(ev.target.result)
    reader.readAsDataURL(imageFile)
  }, [open, imageFile])

  const applyTransform = () => {
    const img = imgRef.current
    const s = stateRef.current
    if (!img) return
    const w = img.naturalWidth * s.scale
    const h = img.naturalHeight * s.scale
    img.style.width = w + 'px'
    img.style.height = h + 'px'
    img.style.left = s.imgX + 'px'
    img.style.top = s.imgY + 'px'
  }

  const clampPosition = () => {
    const img = imgRef.current
    const s = stateRef.current
    if (!img) return
    const w = img.naturalWidth * s.scale
    const h = img.naturalHeight * s.scale
    if (s.imgX > 0) s.imgX = 0
    if (s.imgY > 0) s.imgY = 0
    if (s.imgX < AREA_SIZE - w) s.imgX = AREA_SIZE - w
    if (s.imgY < AREA_SIZE - h) s.imgY = AREA_SIZE - h
    applyTransform()
  }

  const handleImageLoad = () => {
    const img = imgRef.current
    if (!img) return
    const ratio = Math.max(AREA_SIZE / img.naturalWidth, AREA_SIZE / img.naturalHeight)
    stateRef.current.scale = ratio
    const min = Math.round(ratio * 100)
    setZoomMin(min)
    setZoomMax(min * 3)
    setZoom(min)
    const w = img.naturalWidth * ratio
    const h = img.naturalHeight * ratio
    stateRef.current.imgX = (AREA_SIZE - w) / 2
    stateRef.current.imgY = (AREA_SIZE - h) / 2
    applyTransform()
  }

  const handleZoom = (e) => {
    const newZoom = parseInt(e.target.value, 10)
    setZoom(newZoom)
    const s = stateRef.current
    const img = imgRef.current
    if (!img) return
    const oldScale = s.scale
    s.scale = newZoom / 100
    const cx = AREA_SIZE / 2
    const cy = AREA_SIZE / 2
    const relX = (cx - s.imgX) / (img.naturalWidth * oldScale)
    const relY = (cy - s.imgY) / (img.naturalHeight * oldScale)
    s.imgX = cx - relX * img.naturalWidth * s.scale
    s.imgY = cy - relY * img.naturalHeight * s.scale
    clampPosition()
  }

  const handleMouseDown = (e) => {
    e.preventDefault()
    const s = stateRef.current
    s.dragging = true
    s.startX = e.clientX
    s.startY = e.clientY
    s.imgStartX = s.imgX
    s.imgStartY = s.imgY
  }

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const s = stateRef.current
      s.dragging = true
      s.startX = e.touches[0].clientX
      s.startY = e.touches[0].clientY
      s.imgStartX = s.imgX
      s.imgStartY = s.imgY
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      const s = stateRef.current
      if (!s.dragging) return
      s.imgX = s.imgStartX + (e.clientX - s.startX)
      s.imgY = s.imgStartY + (e.clientY - s.startY)
      clampPosition()
    }
    const handleMouseUp = () => { stateRef.current.dragging = false }
    const handleTouchMove = (e) => {
      const s = stateRef.current
      if (!s.dragging || e.touches.length !== 1) return
      s.imgX = s.imgStartX + (e.touches[0].clientX - s.startX)
      s.imgY = s.imgStartY + (e.touches[0].clientY - s.startY)
      clampPosition()
    }
    const handleTouchEnd = () => { stateRef.current.dragging = false }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const confirm = () => {
    const img = imgRef.current
    const s = stateRef.current
    if (!img) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    const sourceX = -s.imgX / s.scale
    const sourceY = -s.imgY / s.scale
    const sourceSize = AREA_SIZE / s.scale
    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    canvas.toBlob((blob) => {
      onConfirm?.(blob)
      onClose?.()
    }, 'image/jpeg', 0.9)
  }

  if (!open || !imageSrc) return null

  return createPortal(
    <div className="aw-cropper-overlay" role="dialog" aria-modal="true" aria-label="Recadrer la photo">
      <div className="aw-cropper-modal">
        <div className="aw-cropper-header">
          <span className="aw-cropper-title">RECADRER</span>
          <button type="button" className="aw-cropper-close" onClick={onClose} aria-label="Annuler">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="aw-cropper-area" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}>
          <img ref={imgRef} src={imageSrc} onLoad={handleImageLoad} alt="" draggable="false" />
        </div>
        <div className="aw-cropper-zoom">
          <input type="range" min={zoomMin} max={zoomMax} value={zoom} onChange={handleZoom} />
        </div>
        <button type="button" className="aw-cropper-confirm" onClick={confirm}>Appliquer</button>
      </div>
    </div>,
    document.body
  )
}
