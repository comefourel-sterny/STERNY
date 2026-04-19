import { useState, useEffect, useCallback } from 'react'
import './Stepper.css'

export default function Stepper({ steps, prefix = 'stp' }) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setActive(prev => (prev + 1) % steps.length)
  }, [steps.length])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [paused, next])

  return (
    <div
      className="stepper"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Timeline */}
      <div className="stepper-track">
        {steps.map((step, i) => (
          <button
            key={i}
            className={`stepper-dot${i === active ? ' active' : ''}${i < active ? ' done' : ''}`}
            onClick={() => setActive(i)}
          >
            <span className="stepper-num">{i + 1}</span>
            <span className="stepper-label">{step.title}</span>
          </button>
        ))}
        {/* Progress bar */}
        <div className="stepper-bar">
          <div
            className="stepper-bar-fill"
            style={{ width: `${(active / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="stepper-content" key={active}>
        <h3 className="stepper-content-title">{steps[active].title}</h3>
        <p>{steps[active].desc}</p>
      </div>
    </div>
  )
}
