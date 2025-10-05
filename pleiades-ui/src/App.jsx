// pleiades-protocol-main/pleiades-ui/src/App.jsx

import React, { useState, useEffect, useRef } from 'react';
import MainCanvas from './components/MergedMainCanvas.jsx';
import Sidebar from './components/control/Sidebar.jsx'; // left sidebar
import RightSidebar from './components/control/RightSidebar.jsx'; // right sidebar (new)
import { SpeedControl } from './components/control/SpeedControl.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import { launchToPlace } from './components/animate/cameraAnimation.js';
import './styles/app.css';

export default function App() {
  const [timeMultiplier, setTimeMultiplier] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [date, setDate] = useState(new Date(Date.now()));

  // Lifted state to share between left and right sidebars
  const [selectedNEO, setSelectedNEO] = useState(null);
  // Separate selection used for 'approach' clicks (shows yellow orbit) so it doesn't
  // override the main NEO selector state
  const [selectedApproachNEO, setSelectedApproachNEO] = useState(null);
  const [impactAngle, setImpactAngle] = useState(45);
  const [impactVelocity, setImpactVelocity] = useState(20000);
  const [velocityRange, setVelocityRange] = useState({ min: 10000, max: 30000 });
  const [impactLocation, setImpactLocation] = useState({ lat: 40.7128, lon: -74.0060 });
  const [activePanel, setActivePanel] = useState(null); // 'calculations' | 'simulation' | 'comparator' | 'mitigation' - null shows Hide planets panel
  const [showWelcome, setShowWelcome] = useState(true);

  // Time travel
  const [travelState, setTravelState] = useState({ isActive: false });
  const [remainingMs, setRemainingMs] = useState(0);

  // Scene
  const cameraRef = useRef(null)
  const surfaceRef = useRef(null)


  const handleTravelToggle = () => {
    setTravelState(prev => ({ isActive: !prev.isActive }));
  };

  const handleTravelToPlace = (placeData) => {
    launchToPlace(placeData, cameraRef.current, surfaceRef.current) 
  };


  // Hidden planets state
  const [hiddenBodies, setHiddenBodies] = useState(new Set());

  const toggleHiddenBody = (id) => {
    setHiddenBodies(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  // Add window resize listener to ensure responsive updates
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ResizeObserver to detect layout size changes (useful when moving window between monitors with different DPI)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const root = document.documentElement;
    // initialize CSS var
    root.style.setProperty('--app-width', `${window.innerWidth}px`);

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        setWindowSize({ width: w, height: h });
        root.style.setProperty('--app-width', `${w}px`);
      }
    });

    // Observe the body (covers the whole app window)
    ro.observe(document.body);

    return () => {
      try { ro.disconnect(); } catch (e) { /* ignore */ }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {showWelcome && (
        <WelcomeScreen onEnter={() => setShowWelcome(false)} />
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <MainCanvas
          timeMultiplier={timeMultiplier}
          setDate={setDate}
          date={date}
          isPaused={isPaused}
          selectedNEO={selectedNEO}
          selectedApproachNEO={selectedApproachNEO}
          hiddenBodies={hiddenBodies}
          travelState={travelState}
          remainingMs={remainingMs}
          cameraRef={cameraRef}
          surfaceRef={surfaceRef}
        />
      </div>
      
      {/* Left app sidebar (selection, parameters, threat) */}
      <Sidebar
        selectedNEO={selectedNEO}
        setSelectedNEO={setSelectedNEO}
        impactAngle={impactAngle}
        setImpactAngle={setImpactAngle}
        impactVelocity={impactVelocity}
        setImpactVelocity={setImpactVelocity}
        velocityRange={velocityRange}
        setVelocityRange={setVelocityRange}
        impactLocation={impactLocation}
        setImpactLocation={setImpactLocation}
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        windowSize={windowSize}
      />

      {/* Right sidebar showing energy & computed metrics (NASA-only) */}
      <RightSidebar
        selectedNEO={selectedNEO}
        selectedApproachNEO={selectedApproachNEO}
        setSelectedApproachNEO={setSelectedApproachNEO}
        impactAngle={impactAngle}
        impactVelocity={impactVelocity}
        impactLocation={impactLocation}
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        setImpactAngle={setImpactAngle}
        setImpactVelocity={setImpactVelocity}
        setVelocityRange={setVelocityRange}
        setImpactLocation={setImpactLocation}
        windowSize={windowSize}
        hiddenBodies={hiddenBodies}
        toggleHiddenBody={toggleHiddenBody}
        setDate={setDate}
        setIsPaused={setIsPaused}
        travelState={travelState}
        handleTravelToggle={handleTravelToggle}
        handleTravelToPlace={handleTravelToPlace}
        remainingMs={remainingMs}
        setRemainingMs={setRemainingMs}
        date={date}
        isPaused={isPaused}
      />
      
      <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
        <SpeedControl
          timeMultiplier={timeMultiplier}
          setTimeMultiplier={setTimeMultiplier}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          date={date}
        />
      </div>
    </div>
  );
}