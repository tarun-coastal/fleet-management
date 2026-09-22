import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Play, Pause, Sun, Moon, Camera, Gauge, Truck, Navigation, ShieldCheck, MapPin } from 'lucide-react';

interface FleetHighway3DProps {
  onVehicleClick?: (vehicleName: string) => void;
}

export function FleetHighway3D({ onVehicleClick }: FleetHighway3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState<number>(65);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timeMode, setTimeMode] = useState<'night' | 'day'>('night');
  const [cameraMode, setCameraMode] = useState<'chase' | 'top' | 'side'>('chase');

  // Interactive state references for Three.js render loop
  const speedRef = useRef(65);
  const isPausedRef = useRef(false);
  const timeModeRef = useRef<'night' | 'day'>('night');
  const cameraModeRef = useRef<'chase' | 'top' | 'side'>('chase');
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { timeModeRef.current = timeMode; }, [timeMode]);
  useEffect(() => { cameraModeRef.current = cameraMode; }, [cameraMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // ─── SCENE & CAMERA SETUP ──────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913); // Midnight dark blue/black
    scene.fog = new THREE.FogExp2(0x060913, 0.015);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 7, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    // ─── LIGHTING ─────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x1a2640, 1.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x60a5fa, 2.5);
    sunLight.position.set(20, 40, -30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const blueRimLight = new THREE.PointLight(0x3b82f6, 4, 80);
    blueRimLight.position.set(-15, 10, -20);
    scene.add(blueRimLight);

    const cyanRimLight = new THREE.PointLight(0x06b6d4, 4, 80);
    cyanRimLight.position.set(15, 10, -20);
    scene.add(cyanRimLight);

    // ─── HIGHWAY ROAD ─────────────────────────────────────────────────────────
    const roadWidth = 22;
    const roadLength = 300;

    // Asphalt surface
    const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -50;
    road.receiveShadow = true;
    scene.add(road);

    // Shoulders / Sidewalks
    const shoulderGeo = new THREE.BoxGeometry(2, 0.4, roadLength);
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    
    const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    leftShoulder.position.set(-roadWidth / 2 - 1, 0.2, -50);
    scene.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    rightShoulder.position.set(roadWidth / 2 + 1, 0.2, -50);
    scene.add(rightShoulder);

    // Animated Lane Dashes (White & Yellow)
    const dashGroup = new THREE.Group();
    const dashGeo = new THREE.PlaneGeometry(0.3, 3);
    const dashWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, side: THREE.DoubleSide });
    const dashYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });

    const lanePositions = [-5.5, 0, 5.5];
    const numDashes = 40;

    for (let l of lanePositions) {
      for (let i = 0; i < numDashes; i++) {
        const isCenter = l === 0;
        const dash = new THREE.Mesh(dashGeo, isCenter ? dashYellowMat : dashWhiteMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(l, 0.02, -150 + i * 8);
        dashGroup.add(dash);
      }
    }
    scene.add(dashGroup);

    // Roadside LED Light Posts
    const lightPostsGroup = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.1, 0.15, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const bulbGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    for (let i = 0; i < 15; i++) {
      const zPos = -180 + i * 20;

      // Left post
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(-13, 4, zPos);
      const leftBulb = new THREE.Mesh(bulbGeo, bulbMat);
      leftBulb.position.set(-12.5, 7.8, zPos);
      lightPostsGroup.add(leftPost);
      lightPostsGroup.add(leftBulb);

      // Right post
      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(13, 4, zPos);
      const rightBulb = new THREE.Mesh(bulbGeo, bulbMat);
      rightBulb.position.set(12.5, 7.8, zPos);
      lightPostsGroup.add(rightPost);
      lightPostsGroup.add(rightBulb);
    }
    scene.add(lightPostsGroup);

    // ─── 3D VEHICLE CREATORS ──────────────────────────────────────────────────
    const wheelsList: THREE.Mesh[] = [];

    // Helper: Create 3D Wheel
    const createWheel = (x: number, y: number, z: number, radius = 0.5, width = 0.4) => {
      const wheelGroup = new THREE.Group();
      const wheelGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
      const rimGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.02, 12);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });

      const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      wheelMesh.rotation.z = Math.PI / 2;
      rimMesh.rotation.z = Math.PI / 2;

      wheelGroup.add(wheelMesh);
      wheelGroup.add(rimMesh);
      wheelGroup.position.set(x, y, z);
      wheelGroup.castShadow = true;

      wheelsList.push(wheelMesh);
      return wheelGroup;
    };

    // 1. SEMI TRUCK (Heavy Freight Logistics)
    const createSemiTruck = (colorHex: number, trailerHex: number) => {
      const truck = new THREE.Group();

      // Truck Cab Body
      const cabGeo = new THREE.BoxGeometry(2.4, 2.2, 3.2);
      const cabMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.4, roughness: 0.3 });
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.set(0, 1.6, 2.5);
      cab.castShadow = true;
      truck.add(cab);

      // Windshield & Side Windows
      const windowGeo = new THREE.BoxGeometry(2.2, 0.9, 1.2);
      const windowMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.85 });
      const windshield = new THREE.Mesh(windowGeo, windowMat);
      windshield.position.set(0, 2.1, 3.2);
      truck.add(windshield);

      // Cargo Container Trailer
      const trailerGeo = new THREE.BoxGeometry(2.6, 3.0, 8.5);
      const trailerMat = new THREE.MeshStandardMaterial({ color: trailerHex, metalness: 0.6, roughness: 0.4 });
      const trailer = new THREE.Mesh(trailerGeo, trailerMat);
      trailer.position.set(0, 2.2, -3.2);
      trailer.castShadow = true;
      truck.add(trailer);

      // Chrome Grill & Front Bumper
      const grillGeo = new THREE.BoxGeometry(2.0, 0.8, 0.2);
      const grillMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.05 });
      const grill = new THREE.Mesh(grillGeo, grillMat);
      grill.position.set(0, 1.0, 4.15);
      truck.add(grill);

      // Dual LED Headlights
      const headlightGeo = new THREE.BoxGeometry(0.5, 0.3, 0.1);
      const headlightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      
      const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
      leftHeadlight.position.set(-0.9, 1.1, 4.18);
      truck.add(leftHeadlight);

      const rightHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
      rightHeadlight.position.set(0.9, 1.1, 4.18);
      truck.add(rightHeadlight);

      // Headlight Beams
      const beamLight = new THREE.SpotLight(0x38bdf8, 8, 25, Math.PI / 6, 0.4);
      beamLight.position.set(0, 1.2, 4.2);
      beamLight.target.position.set(0, 0, 25);
      truck.add(beamLight);
      truck.add(beamLight.target);

      // Red Tail Lights
      const taillightGeo = new THREE.BoxGeometry(0.5, 0.3, 0.1);
      const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const leftTaillight = new THREE.Mesh(taillightGeo, taillightMat);
      leftTaillight.position.set(-1.0, 1.2, -7.5);
      const rightTaillight = new THREE.Mesh(taillightGeo, taillightMat);
      rightTaillight.position.set(1.0, 1.2, -7.5);
      truck.add(leftTaillight);
      truck.add(rightTaillight);

      // Wheels (6 axles for heavy semi)
      truck.add(createWheel(-1.3, 0.5, 3.2));
      truck.add(createWheel(1.3, 0.5, 3.2));
      truck.add(createWheel(-1.3, 0.5, 0.8));
      truck.add(createWheel(1.3, 0.5, 0.8));
      truck.add(createWheel(-1.3, 0.5, -4.5));
      truck.add(createWheel(1.3, 0.5, -4.5));
      truck.add(createWheel(-1.3, 0.5, -6.5));
      truck.add(createWheel(1.3, 0.5, -6.5));

      return truck;
    };

    // 2. CARGO DELIVERY VAN
    const createCargoVan = (colorHex: number) => {
      const van = new THREE.Group();

      const bodyGeo = new THREE.BoxGeometry(2.1, 2.0, 5.0);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.3, roughness: 0.4 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.set(0, 1.4, 0);
      body.castShadow = true;
      van.add(body);

      // Windshield
      const windowGeo = new THREE.BoxGeometry(1.9, 0.8, 1.0);
      const windowMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.85 });
      const windshield = new THREE.Mesh(windowGeo, windowMat);
      windshield.position.set(0, 1.8, 1.9);
      van.add(windshield);

      // Headlights & Taillights
      const headlightGeo = new THREE.BoxGeometry(0.4, 0.25, 0.1);
      const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const leftHL = new THREE.Mesh(headlightGeo, headlightMat);
      leftHL.position.set(-0.7, 1.1, 2.52);
      const rightHL = new THREE.Mesh(headlightGeo, headlightMat);
      rightHL.position.set(0.7, 1.1, 2.52);
      van.add(leftHL);
      van.add(rightHL);

      const taillightGeo = new THREE.BoxGeometry(0.4, 0.25, 0.1);
      const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const leftTL = new THREE.Mesh(taillightGeo, taillightMat);
      leftTL.position.set(-0.8, 1.1, -2.52);
      const rightTL = new THREE.Mesh(taillightGeo, taillightMat);
      rightTL.position.set(0.8, 1.1, -2.52);
      van.add(leftTL);
      van.add(rightTL);

      // Wheels
      van.add(createWheel(-1.1, 0.45, 1.8, 0.4, 0.35));
      van.add(createWheel(1.1, 0.45, 1.8, 0.4, 0.35));
      van.add(createWheel(-1.1, 0.45, -1.8, 0.4, 0.35));
      van.add(createWheel(1.1, 0.45, -1.8, 0.4, 0.35));

      return van;
    };

    // Instantiate Fleet Units
    const fleetGroup = new THREE.Group();

    // Unit #1: Blue Heavy Semi (Center Lane)
    const truck1 = createSemiTruck(0x2563eb, 0xe2e8f0);
    truck1.position.set(-2.8, 0, 5);
    fleetGroup.add(truck1);

    // Unit #2: Emerald Cargo Van (Right Lane)
    const van1 = createCargoVan(0x059669);
    van1.position.set(3.2, 0, -18);
    fleetGroup.add(van1);

    // Unit #3: Amber Logistics Hauler (Left Lane)
    const truck2 = createSemiTruck(0xd97706, 0x1e293b);
    truck2.position.set(-8.0, 0, -42);
    fleetGroup.add(truck2);

    // Unit #4: Crimson Fast Courier Van (Center-Right Lane)
    const van2 = createCargoVan(0xd97706);
    van2.position.set(8.2, 0, -70);
    fleetGroup.add(van2);

    scene.add(fleetGroup);

    // ─── AMBIENT STARS & PARTICLES ───────────────────────────────────────────
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 150;
      particlePos[i + 1] = Math.random() * 40 + 5;
      particlePos[i + 2] = (Math.random() - 0.5) * 200;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({ size: 0.6, color: 0x38bdf8, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ─── MOUSE INTERACTION ────────────────────────────────────────────────────
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / width) * 2 - 1;
      const y = -((e.clientY - rect.top) / height) * 2 + 1;
      mouseRef.current = { x, y };
    };

    container.addEventListener('mousemove', handleMouseMove);

    // ─── RENDER LOOP & ANIMATION ──────────────────────────────────────────────
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const currentSpeed = isPausedRef.current ? 0 : speedRef.current;
      const moveFactor = (currentSpeed / 60) * delta * 25;

      // Move Lane Dashes backward to create continuous forward speed motion
      dashGroup.children.forEach((dash) => {
        dash.position.z += moveFactor;
        if (dash.position.z > 30) {
          dash.position.z -= 320;
        }
      });

      // Move Light Posts backward
      lightPostsGroup.children.forEach((post) => {
        post.position.z += moveFactor;
        if (post.position.z > 30) {
          post.position.z -= 300;
        }
      });

      // Rotate Vehicle Wheels
      wheelsList.forEach((w) => {
        w.rotation.x += moveFactor * 0.4;
      });

      // Gentle floating vehicle sway & relative speeds
      if (!isPausedRef.current) {
        truck1.position.z += Math.sin(clock.getElapsedTime() * 1.5) * 0.02;
        van1.position.z += Math.cos(clock.getElapsedTime() * 1.8) * 0.03 + moveFactor * 0.05;
        truck2.position.z += Math.sin(clock.getElapsedTime() * 1.2) * 0.02;

        if (van1.position.z > 25) van1.position.z = -120;
      }

      // Camera Positioning & Smooth Interpolation
      const targetCam = cameraModeRef.current;
      const mouse = mouseRef.current;

      if (targetCam === 'chase') {
        camera.position.x += (mouse.x * 3 - camera.position.x) * 0.05;
        camera.position.y += (7 + mouse.y * 1.5 - camera.position.y) * 0.05;
        camera.position.z += (24 - camera.position.z) * 0.05;
        camera.lookAt(0, 2, -20);
      } else if (targetCam === 'top') {
        camera.position.x += (0 - camera.position.x) * 0.05;
        camera.position.y += (35 - camera.position.y) * 0.05;
        camera.position.z += (-10 - camera.position.z) * 0.05;
        camera.lookAt(0, 0, -15);
      } else if (targetCam === 'side') {
        camera.position.x += (22 - camera.position.x) * 0.05;
        camera.position.y += (5 - camera.position.y) * 0.05;
        camera.position.z += (0 - camera.position.z) * 0.05;
        camera.lookAt(-2, 2, -10);
      }

      // Day / Night Theme Interpolation
      if (timeModeRef.current === 'day') {
        scene.background = new THREE.Color(0x0f172a); // Sunrise slate
        scene.fog?.color.setHex(0x0f172a);
        ambientLight.intensity = 2.5;
        sunLight.intensity = 3.5;
      } else {
        scene.background = new THREE.Color(0x060913); // Midnight neon
        scene.fog?.color.setHex(0x060913);
        ambientLight.intensity = 1.2;
        sunLight.intensity = 1.8;
      }

      renderer.render(scene, camera);
    };

    animate();

    // ─── RESIZE HANDLER ──────────────────────────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[480px] lg:min-h-[580px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Three.js WebGL Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Telemetry Badges (Overlaid on canvas) */}
      <div className="absolute top-6 left-6 pointer-events-none flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-blue-500/30 px-3.5 py-2 rounded-lg text-white shadow-lg flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-slate-200">LIVE TELEMETRY FEED</span>
          <span className="text-[10px] text-blue-400 font-mono bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/50">
            GPS 60 Hz
          </span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-md text-[11px] text-slate-300 flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 text-blue-400" />
          <span>Active Units: <strong className="text-white">4 Commercial Haulers</strong></span>
        </div>
      </div>

      {/* Interactive Floating HUD Telemetry Labels for Trucks */}
      <div className="absolute top-1/3 left-[20%] pointer-events-none hidden md:flex items-center gap-2 bg-blue-950/90 backdrop-blur-md border border-blue-500/40 text-blue-100 text-[10px] font-mono px-2.5 py-1 rounded shadow-lg animate-bounce">
        <MapPin className="w-3 h-3 text-blue-400" />
        <span>UNIT #101 • {speed} KM/H • HIGHWAY W-104</span>
      </div>

      <div className="absolute top-1/2 right-[22%] pointer-events-none hidden md:flex items-center gap-2 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 text-emerald-100 text-[10px] font-mono px-2.5 py-1 rounded shadow-lg">
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span>VAN #204 • ON ROUTE • COMPLIANT</span>
      </div>

      {/* Interactive 3D Viewport Controls Bar */}
      <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-3 rounded-xl shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        
        {/* Play/Pause & Speed Control */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPaused(!isPaused)}
            className="h-8 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 mr-1 text-amber-400" />}
            {isPaused ? 'Resume Fleet' : 'Pause Simulation'}
          </Button>

          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-medium text-slate-400">Cruise Speed:</span>
            <span className="font-mono font-bold text-white w-12">{speed} km/h</span>
            <input
              type="range"
              min="0"
              max="120"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-24 accent-blue-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Camera Perspective Presets */}
        <div className="flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-slate-400 mr-1" />
          <button
            onClick={() => setCameraMode('chase')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              cameraMode === 'chase' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Chase Cam
          </button>
          <button
            onClick={() => setCameraMode('top')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              cameraMode === 'top' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Radar Top-Down
          </button>
          <button
            onClick={() => setCameraMode('side')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              cameraMode === 'side' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Side Parallel
          </button>
        </div>

        {/* Day / Night Theme Toggle */}
        <button
          onClick={() => setTimeMode(timeMode === 'night' ? 'day' : 'night')}
          className="flex items-center gap-1.5 px-3 py-1 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-[11px]"
        >
          {timeMode === 'night' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />}
          <span>{timeMode === 'night' ? 'Golden Hour' : 'Midnight Neon'}</span>
        </button>
      </div>
    </div>
  );
}
