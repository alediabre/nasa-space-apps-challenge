import React, { useState, useEffect, useRef } from 'react'
import './welcome.css'
import asteroidImage from '../assets/asteroid.png'
import asteroidBurn from '../assets/asteroid-burning.png'

export default function WelcomeScreen({ onEnter }) {
  const [exiting, setExiting] = useState(false)
  const AST_COUNT = 8
  // burnStates control whether the burn image is visible for each asteroid
  const [burnStates, setBurnStates] = useState(new Array(AST_COUNT).fill(false))
  const timersRef = useRef({ intervals: [], timeouts: [] })

  useEffect(() => {
    // Set up randomized loops: each asteroid fades to burn briefly at random intervals up to 5s
    const timeouts = []
    const burnVisibleMs = 600 // how long the burn image stays visible each pulse
    const maxDelay = 5000 // maximum delay between pulses

    const schedulePulse = (index) => {
      const delay = Math.floor(Math.random() * maxDelay)
      const t = setTimeout(() => {
        // show burn
        setBurnStates(prev => { const c = [...prev]; c[index] = true; return c })
        // hide after burnVisibleMs
        const hide = setTimeout(() => {
          setBurnStates(prev => { const c = [...prev]; c[index] = false; return c })
          // schedule next pulse recursively
          schedulePulse(index)
        }, burnVisibleMs)
        timeouts.push(hide)
      }, delay)
      timeouts.push(t)
    }

    for (let i = 0; i < AST_COUNT; i++) {
      // start each asteroid's random cycle with a small random initial offset
      schedulePulse(i)
    }

    timersRef.current.timeouts = timeouts

    return () => {
      // cleanup all timeouts
      for (const t of timersRef.current.timeouts || []) clearTimeout(t)
      timersRef.current.timeouts = []
    }
  }, [])
  // Render several absolutely-positioned asteroid images that float slowly using CSS animations
  const asteroids = new Array(AST_COUNT).fill(0).map((_, i) => {
    // Slight rotation variance per asteroid
    const rot = (i * 17) % 360
    const innerStyle = {
      backgroundImage: `url(${asteroidImage})`,
      transform: `rotate(${rot}deg)`
    }
    return (
      <div key={i} className={`asteroid a-${i+1}`} aria-hidden="true">
        <div className="asteroid-inner" style={innerStyle} />
        <div
          className="asteroid-burn"
          style={{
            backgroundImage: `url(${asteroidBurn})`,
            transform: innerStyle.transform,
            opacity: burnStates[i] ? 1 : 0
          }}
        />
      </div>
    )
  })

  const handleEnter = () => {
    // trigger smooth slow zoom/illumination exit
    setExiting(true)
    // wait for the CSS animation to finish (match ~1200ms)
    setTimeout(() => onEnter && onEnter(), 1250)
  }

  return (
  <div className={`welcome-root ${exiting ? 'exiting' : ''}`}>
      <div className="welcome-asteroids">{asteroids}</div>
      <div className="welcome-center">
        <h1 className="welcome-title">Earth in danger?</h1>
        <button className="welcome-cta" onClick={handleEnter}>Let's see</button>
      </div>
      <div className="burn-overlay" aria-hidden="true" />
    </div>
  )
}
