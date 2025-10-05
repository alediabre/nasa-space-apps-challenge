import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { createSun } from './bodies/Sun'
import { createAsteroidBeltPoints } from './bodies/Asteroidbelt'
import { createBeltAura } from './bodies/AsteroidAura'
import { createOrbit } from './orbits/orbitUtils'
import { makeAddAsteroid } from './orbits/asteroidOrbit'
import { animateOrbit } from './animate/orbitAnimation'
import { rotate } from './animate/rotation'
import { adjustCamera } from './animate/cameraAnimation'
import { createLabelRenderer, addLabel, disposeLabelRenderer, onResize, updateLabel } from './bodies/Labels'
import { getUpdateTiles, getUpdateControls, addLabelsClickEvents, getRendererClickEvents } from '../utils/events/eventFunctions'
import { EARTH_INCLINATION, EARTH_A } from '../constants'
import '../styles/mainCanvas.css'
import { createSunBloom } from './postprocess/bloom'
import { loadHDRBackground} from './postprocess/loadHDRBackground'
import { getHorizonsData, getAsteroidsData } from './orbits/Consumers'
import { BODIES_CONFIG } from './orbits/orbitConfig'
import galaxyBackground from '../assets/background/hiptyc_2020_8k_gal.exr'
import { makeBelts } from './orbits/spaceBelts'

export default function MergedMainCanvas({ timeMultiplier, setDate, date, isPaused, onMountApi, selectedNEO, 
    selectedApproachNEO, hiddenBodies, travelState, remainingMs, cameraRef, surfaceRef }) {
    // states
    const mountRef = useRef(null)
    const timeMultiplierRef = useRef(timeMultiplier)
    const dateRef = useRef(date)
    const isPausedRef = useRef(false)

    // Selection refs (main selected and approach-only selection)
    const selectedNEORef = useRef(selectedNEO)
    const selectedApproachNEORef = useRef(selectedApproachNEO)

    // Scene objects
    const cameraAnchorRef = useRef(null)
    const distToAnchoredBody = useRef(4)
    const labelsRef = useRef([])

    // Animation objects
    const lastDateUpdate = useRef(0)
    const orbitsAnomaliesRef = useRef(new Map())
    const earthRotationAngleRef = useRef(0)

    // Orbit/mesh registries
    const orbitsRef = useRef(new Map())
    const asteroidsRef = useRef(new Map())
    const meshesRef = useRef(new Map())

    const setOrbitalData = (id, data) => { orbitsRef.current.set(id, data) }
    const getOrbitalData = (id) => orbitsRef.current.get(id)
    const setOrbitAnomaly = (id, anomaly) => { orbitsAnomaliesRef.current.set(id, anomaly) }
    const getOrbitAnomaly = (id) => orbitsAnomaliesRef.current.get(id)

    useEffect(() => { timeMultiplierRef.current = timeMultiplier }, [timeMultiplier])
    useEffect(() => { isPausedRef.current = isPaused }, [isPaused])
    useEffect(() => { selectedNEORef.current = selectedNEO }, [selectedNEO])
    useEffect(() => { selectedApproachNEORef.current = selectedApproachNEO }, [selectedApproachNEO])

    useEffect(() => {
        if (!meshesRef.current) return;

        if (travelState.isActive) {
            console.log('Travel to Approach triggered');
            console.log(travelState)
            recalcAllAnomalies(remainingMs);
        } else {
            console.log('Return to Present triggered');
            recalcAllAnomalies(0);
        }

    }, [travelState]);

    // Función para recalcular M y posicionar todos los cuerpos
    function recalcAllAnomalies(remainingMs) {
        console.log('remainingMs', remainingMs)
        const targetDate = new Date(Date.now() + remainingMs);
        console.log(targetDate)

          function wrap2pi(angle) {
                const twoPi = 2 * Math.PI;
                return ((angle % twoPi) + twoPi) % twoPi;
            }

        // Planetas / cuerpos configurados
        for (const cfg of BODIES_CONFIG) {
            const data = getOrbitalData(cfg.id)
            if (!data) continue
            const mesh = meshesRef.current.get(cfg.id)
            if (!mesh) continue

            // Epoch: fecha de referencia (puede ser la actual)
            const JD_TO_MS = jd => (jd - 2440587.5) * 86400000;
            const epoch = data.epoch_jd ? new Date(JD_TO_MS(data.epoch_jd)) 
                                        : new Date(data.epoch || Date.now());

            const deltaDays = (targetDate.getTime() - epoch.getTime()) / (1000*60*60*24)
            const M0 = -data.mean_anomaly
            const n = data.getRadPerDay()
            const M_new = wrap2pi(M0 + -1*n * deltaDays) 

            const updatedM = animateOrbit(M_new, 0, mesh, data, false)
            setOrbitAnomaly(cfg.id, updatedM)
        }

        // Asteroides
        for (const [id, { mesh, data }] of asteroidsRef.current.entries()) {
            const JD_TO_MS = jd => (jd - 2440587.5) * 86400000;
            const epoch = data.epoch_jd ? new Date(JD_TO_MS(data.epoch_jd)) 
                                        : new Date(data.epoch || Date.now());

            const deltaDays = (targetDate.getTime() - epoch.getTime()) / (1000*60*60*24)
            const M0 = -data.mean_anomaly 
            const n = data.getRadPerDay()
            const M_new = wrap2pi(M0 + -1*n * deltaDays)

            const updatedM = animateOrbit(M_new, 0, mesh, data, false)
            setOrbitAnomaly(id, updatedM)
        }

        // Actualizamos la fecha del estado
        dateRef.current = new Date(targetDate)
        setDate(new Date(targetDate))
    }



    // Update visibility when hiddenBodies changes
    useEffect(() => {
        if (!meshesRef.current) return
        
        for (const [id, mesh] of meshesRef.current.entries()) {
            const isHidden = hiddenBodies && hiddenBodies.has(id)
            mesh.visible = !isHidden
            
            // Update label visibility
            const label = labelsRef.current.find(l => l.userData?.labeledBody === mesh)
            if (label) {
                label.element.style.display = isHidden ? 'none' : ''
            }
            
            // Find the orbit group (eclipticPlane) that contains this planet
            // The eclipticPlane contains both the planet mesh and the orbit line
            const findOrbitGroup = (object, planetMesh) => {
                let found = null
                object.traverse((child) => {
                    if (child.name === `${id}-orbit` || 
                        (child.type === 'Group' && child.children.includes(planetMesh))) {
                        found = child
                    }
                })
                return found
            }
            
            // Search for the orbit group in the scene
            let orbitGroup = null
            if (mesh.parent) {
                orbitGroup = findOrbitGroup(mesh.parent, mesh)
            }
            
            if (orbitGroup) {
                // Find the orbit line within the group
                const orbitLine = orbitGroup.children.find(child => 
                    child.type === 'Line' || child.material?.type === 'LineBasicMaterial'
                )
                
                if (orbitLine) {
                    orbitLine.visible = !isHidden
                    console.log(`${isHidden ? 'Hiding' : 'Showing'} orbit line for ${id}:`, orbitLine)
                } else {
                    console.warn(`Orbit line not found for ${id} in group:`, orbitGroup)
                }
            } else {
                console.warn(`Orbit group not found for ${id}`)
            }
        }
    }, [hiddenBodies])

    useEffect(() => {
        const currentMount = mountRef.current
        if (!currentMount) return

        const width = currentMount.clientWidth
        const height = currentMount.clientHeight

        // Scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x000000)

        // Camera
        const newCamera = new THREE.PerspectiveCamera(40, width / height, 0.0001, 10000000000)
        newCamera.position.set(0, 0, 4)
        cameraRef.current = newCamera

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        currentMount.appendChild(renderer.domElement)

        // Background
        /*
        loadHDRBackground(galaxyBackground, renderer, scene)
            .then(({ hdr, enzvMap }) => {
                console.log('HDR background y envMap listos');
            })
        .catch((e) => console.error('Error cargando HDR:', e));
        */

        // Postprocess
        const composer = createSunBloom(renderer, scene, cameraRef.current, width, height)

        // Labels
        const container = currentMount
        container.style.position = 'relative'
        const labelRenderer = createLabelRenderer(container, width, height)

        // Safe resize handler
        const handleResize = () => {
            if (container && cameraRef.current && renderer && labelRenderer) {
                onResize(container, cameraRef.current, renderer, labelRenderer)
            }
        }
        window.addEventListener('resize', handleResize)
        handleResize()

        // Controls
        const controls = new OrbitControls(cameraRef.current, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.enablePan = true
        controls.enableZoom = true
        controls.minDistance = 1.1
        controls.maxDistance = 2000000000
        controls.rotateSpeed = 1
        controls.zoomSpeed = 1

        // Update helpers
        const onControlsChangeUpdateTiles = getUpdateTiles(meshesRef, cameraRef.current)
        const onControlsChangeUpdateControls = getUpdateControls(cameraAnchorRef, distToAnchoredBody, controls, cameraRef.current)
        controls.addEventListener('change', onControlsChangeUpdateTiles)
        controls.addEventListener('end', onControlsChangeUpdateTiles)
        controls.addEventListener('change', onControlsChangeUpdateControls)

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.25)
        scene.add(ambientLight)

        // Sun
        const sun = createSun()
        sun.position.set(0, 0, 0)
        scene.add(sun)
        const sunLabel = addLabel(sun, 'Sun')
        labelsRef.current.push(sunLabel)

        // Build bodies from config
        const meshes = new Map()
        for (const cfg of BODIES_CONFIG) {
            const mesh = cfg.factory()
            meshes.set(cfg.id, mesh)
            
            // Check if body should be hidden
            const isHidden = hiddenBodies && hiddenBodies.has(cfg.id)
            mesh.visible = !isHidden
            console.log(`Created body ${cfg.id}, visible: ${mesh.visible}, isHidden: ${isHidden}`)
            
            if (cfg.parent) {
                const pm = meshes.get(cfg.parent)
                if (pm) {
                    pm.add(mesh)
                } else {
                    scene.add(mesh)
                }
            } else {
                scene.add(mesh)
            }
            const label = addLabel(mesh, cfg.label)
            if (isHidden) {
                label.element.style.display = 'none'
            }
            labelsRef.current.push(label)
            cfg.onCreate?.(mesh, { cameraAnchorRef, surfaceRef })
        }
        meshesRef.current = meshes

        // Belts (asteroid/kuiper/oort)
        const { updates: beltUpdates, updateAll: updateBelts, dispose: disposeBelts } = makeBelts({
            scene,
            addLabel,
            createAsteroidBeltPoints,
            createBeltAura,
            EARTH_A,
            labelsRef
        })

        // Renderer click events
        const renderClickEvents = getRendererClickEvents(cameraRef.current, surfaceRef.current)
        renderer.domElement.addEventListener('dblclick', renderClickEvents)

        // Events for label clicks
        addLabelsClickEvents(cameraAnchorRef, labelsRef, controls, cameraRef.current)

        // Fetch Horizons data for configured bodies
        let disposed = false
        ;(async () => {
            try {
                const ids = BODIES_CONFIG.map(b => b.id)
                const results = await Promise.all(ids.map(id => getHorizonsData(id)))
                if (disposed) return
                results.forEach((orbitData, idx) => {
                    const id = ids[idx]
                    setOrbitalData(id, orbitData)
                    setOrbitAnomaly(id, -orbitData.mean_anomaly)
                })

                // Create orbit planes
                for (const cfg of BODIES_CONFIG) {
                    const data = getOrbitalData(cfg.id)
                    if (!data) continue
                    const mesh = meshes.get(cfg.id)
                    const [orbitPlane] = createOrbit(data, mesh, cfg.orbitColor, cfg.segs)
                    
                    // Hide orbit if body is hidden
                    const isHidden = hiddenBodies && hiddenBodies.has(cfg.id)
                    orbitPlane.name = `${cfg.id}-orbit`
                    
                    // Find and hide the orbit line within the group if needed
                    const orbitLine = orbitPlane.children.find(child => 
                        child.type === 'Line' || child.material?.type === 'LineBasicMaterial'
                    )
                    if (orbitLine) {
                        orbitLine.visible = !isHidden
                    }
                    
                    console.log(`Created orbit for ${cfg.id}, orbitLine visible: ${orbitLine?.visible}, name: ${orbitPlane.name}`)
                    
                    if (cfg.parent) {
                        const pm = meshes.get(cfg.parent)
                        if (pm) {
                            pm.add(orbitPlane)
                        } else {
                            scene.add(orbitPlane)
                        }
                    } else {
                        scene.add(orbitPlane)
                    }
                }
                meshesRef.current = meshes
            } catch (e) {
                console.error('Error loading Horizons data:', e)
            }
        })()

        // =========
        // ASTEROIDS
        // =========
        const { addAsteroid, removeAsteroid, clearAsteroids } = makeAddAsteroid({
            scene,
            labelsRef,
            asteroidsRef,
            setOrbitalData,
            setOrbitAnomaly,
            getAsteroidsData,
            createOrbit,
            addLabel,
            isDisposed: () => disposed
        })

        // Exponer API hacia fuera
        onMountApi?.({ addAsteroid, removeAsteroid, clearAsteroids })
        const clock = new THREE.Clock(true)
        let animationId
        const animate = () => {
            animationId = requestAnimationFrame(animate)
            if (isPausedRef.current === false) {
                const deltaTime = clock.getDelta()
                const simulatedDeltaTime = deltaTime * timeMultiplierRef.current

                updateBelts(simulatedDeltaTime)

                // Update configured bodies orbits
                for (const cfg of BODIES_CONFIG) {
                    const data = getOrbitalData(cfg.id)
                    if (!data) continue
                    const mesh = meshes.get(cfg.id)
                    const newAn = animateOrbit(getOrbitAnomaly(cfg.id), simulatedDeltaTime, mesh, data, false)
                    setOrbitAnomaly(cfg.id, newAn)
                }

                // ASTEROIDS
                for (const [id, { mesh, data }] of asteroidsRef.current.entries()) {
                    const newAn = animateOrbit(getOrbitAnomaly(id), simulatedDeltaTime, mesh, data, false)
                    setOrbitAnomaly(id, newAn)
                }

                // Earth rotation (if surface available)
                const earthData = getOrbitalData('earth')
                if (earthData) {
                    const earthTilt = THREE.MathUtils.degToRad(EARTH_INCLINATION)
                    earthRotationAngleRef.current = rotate(surfaceRef.current, earthTilt, simulatedDeltaTime, earthRotationAngleRef.current)
                }

                // Update date
                dateRef.current = new Date(dateRef.current.getTime() + (simulatedDeltaTime * 1000))
                lastDateUpdate.current += deltaTime
                if (lastDateUpdate.current > 0.25) {
                    setDate(dateRef.current)
                    lastDateUpdate.current = 0
                }
            }

            adjustCamera(cameraAnchorRef.current, controls, cameraRef.current, false)
            try { updateLabel(labelsRef, cameraAnchorRef.current, distToAnchoredBody.current) } catch (e) {}
            composer.render()
            labelRenderer.render(scene, cameraRef.current)
        }
        animate()

        // Poll para cambios de selección (usar addAsteroid/removeAsteroid en lugar de crear orbit groups manuales)
        let lastSelectedId = selectedNEORef.current ? (selectedNEORef.current.id || selectedNEORef.current.neo_reference_id || selectedNEORef.current.name) : null
        let lastApproachSelectedId = selectedApproachNEORef.current ? (selectedApproachNEORef.current.id || selectedApproachNEORef.current.neo_reference_id || selectedApproachNEORef.current.name) : null

         const selectionPoll = setInterval(() => {
        // Selección principal
        const currentNeo = selectedNEORef.current
        const currentId = currentNeo ? (currentNeo.id || currentNeo.neo_reference_id || currentNeo.name) : null
        if (currentId !== lastSelectedId) {
            // Elimina el asteroide del "slot" selected
            removeAsteroid('selected')
            if (currentNeo) {
            const sstr = currentNeo.neo_reference_id || currentNeo.id || currentNeo.name
            // Rojo (0xff0000), más segmentos
            addAsteroid(sstr, { key: 'selected', color: 0xff0000, segs: 4096, labelPrefix: 'NEO' })
            }
            lastSelectedId = currentId
        }

        // Selección "approach-only"
        const currentApproach = selectedApproachNEORef.current
        const currentApproachId = currentApproach ? (currentApproach.id || currentApproach.neo_reference_id || currentApproach.name) : null
        if (currentApproachId !== lastApproachSelectedId) {
            removeAsteroid('approach')
            if (currentApproach) {
            const sstrA = currentApproach.neo_reference_id || currentApproach.id || currentApproach.name
            // Amarillo (0xFFFF00)
            addAsteroid(sstrA, { key: 'approach', color: 0xFFFF00, segs: 4096, labelPrefix: 'APP' })
            }
            lastApproachSelectedId = currentApproachId
        }
        }, 500)

        return () => {
            disposed = true
            clearInterval(selectionPoll)
            cancelAnimationFrame(animationId)
            window.removeEventListener('resize', handleResize)
            controls.removeEventListener('change', onControlsChangeUpdateTiles)
            controls.removeEventListener('change', onControlsChangeUpdateControls)
            controls.removeEventListener('end', onControlsChangeUpdateTiles)
            if (renderer.domElement?.parentElement === currentMount) currentMount.removeChild(renderer.domElement)
            disposeBelts()
            disposeLabelRenderer()
            renderer.dispose()
        }
    }, [])

    return <div ref={mountRef} className="main-canvas" />
}
