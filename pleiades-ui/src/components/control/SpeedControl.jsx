import { useMemo } from 'react'
import '../../styles/control/speedControl.css'

export function SpeedControl({ timeMultiplier, setTimeMultiplier, isPaused, setIsPaused, date}) {
  const formatted = useMemo(() => {
    if (!(date instanceof Date) || isNaN(date)) return '—';
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  }, [date]);


  // Presets requested: Real, 1d, 1w, 1m, 6m (seconds)
  const presets = [
    { label: 'Real', value: 1 },
    { label: '1d', value: 86400 },
    { label: '1w', value: 604800 },
    { label: '1m', value: 2592000 },
    { label: '6m', value: 15552000 },
  ]

  const handleTimeSpeedChange = (val) => {
    setTimeMultiplier(Number(val))
  }

  return (
  <div className="telemetry-hud transparent" role="region" aria-label="Speed control">
      <div className="hud-column date-telemetry">
  <div className="hud-label">Simulation</div>
        <div className="hud-value">{formatted}</div>
      </div>

      <div className="controls-center enhanced overlay-presets">
        <button
          aria-label={isPaused ? 'Play simulation' : 'Pause simulation'}
          className={`hud-button play-pause ${isPaused ? 'paused' : 'running'}`}
          onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume (Play)' : 'Pause'}
        >
          {isPaused ? '▶' : '⏸'}
        </button>

        <div className="slider-column slider-with-presets">
          <div className="presets-row">
            {presets.map(p => (
              <button
                key={p.value}
                className={`preset-btn overlay ${Number(timeMultiplier) === p.value ? 'active' : ''}`}
                onClick={() => handleTimeSpeedChange(p.value)}
                  title={`Set speed ${p.label}`}
                aria-pressed={Number(timeMultiplier) === p.value}
              >
                {p.label}
                {/* small dot indicator when active - styled via CSS */}
                {Number(timeMultiplier) === p.value && <span className="preset-dot" aria-hidden />}
              </button>
            ))}
          </div>

          <input
            className="time-slider"
            type="range"
            min="1"
            max="31536000"
            step="1"
            value={timeMultiplier}
            onChange={(e) => handleTimeSpeedChange(e.target.value)}
            aria-label="Fine time speed control"
          />
        </div>
      </div>

      <div className="hud-column speed-telemetry">
          <div className="hud-label">Speed</div>
        <div className="hud-value">{timeMultiplier.toLocaleString()}x</div>
      </div>
    </div>
  )
}
