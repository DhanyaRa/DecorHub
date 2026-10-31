import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Project, PlacedItem, RoomDimensions, CatalogItem, ValidationIssue } from '../../types';
import { getCatalogItemById } from '../../data/furnitureCatalog';
import { validateRoomLayout } from '../../utils/collision';
import { formatINR } from '../../utils/currency';
import {
  RotateCw,
  Trash2,
  Eye,
  Sun,
  Moon,
  Layers,
  Compass,
  Maximize2,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface RoomPlanner3DProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onSwitchTo2D: () => void;
}

export const RoomPlanner3D: React.FC<RoomPlanner3DProps> = ({
  project,
  onUpdateProject,
  onSwitchTo2D,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const items = project.currentPlacedItems;
  const room = project.questionnaire.dimensions;

  // 3D Controls state
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [isCutawayWalls, setIsCutawayWalls] = useState<boolean>(true);
  const [viewPreset, setViewPreset] = useState<'isometric' | 'top_down' | 'eye_level' | 'front'>('isometric');

  // References for Three.js instance
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const furnitureMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const wallsGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);

  // Layout validation
  const validationIssues = validateRoomLayout(items, room);
  const hasErrors = validationIssues.some((i) => i.severity === 'error');

  // Find currently selected item
  const selectedPlacedItem = items.find((it) => it.instanceId === selectedInstanceId);
  const selectedCatalogItem = selectedPlacedItem ? getCatalogItemById(selectedPlacedItem.itemId) : null;

  // Scale factor: 100 cm = 1.0 Three.js unit
  const SCALE = 0.01;
  const roomLength = room.lengthCm * SCALE; // X dimension
  const roomWidth = room.widthCm * SCALE;   // Z dimension
  const ceilingHeight = (room.ceilingHeightCm || 280) * SCALE; // Y dimension

  // Rotate selected item
  const handleRotateSelected = () => {
    if (!selectedPlacedItem) return;
    const newRot = (selectedPlacedItem.rotationDeg + 90) % 360;
    const updated = items.map((it) =>
      it.instanceId === selectedPlacedItem.instanceId ? { ...it, rotationDeg: newRot } : it
    );
    onUpdateProject({
      ...project,
      currentPlacedItems: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Delete selected item
  const handleDeleteSelected = () => {
    if (!selectedPlacedItem) return;
    const updated = items.filter((it) => it.instanceId !== selectedPlacedItem.instanceId);
    setSelectedInstanceId(null);
    onUpdateProject({
      ...project,
      currentPlacedItems: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Helper to create procedural composite 3D models (3-10 parts)
  const createFurniture3DGroup = (
    placed: PlacedItem,
    catalog: CatalogItem,
    isSelected: boolean
  ): THREE.Group => {
    const group = new THREE.Group();
    group.name = placed.instanceId;

    const w = catalog.dimensions.widthCm * SCALE;
    const d = catalog.dimensions.depthCm * SCALE;
    const h = (catalog.dimensions.heightCm || 75) * SCALE;

    const hexColor = parseInt(catalog.hexColor.replace('#', ''), 16) || 0xd8c3a5;
    const baseMat = new THREE.MeshStandardMaterial({
      color: hexColor,
      roughness: 0.6,
      metalness: 0.1,
    });

    const highlightMat = new THREE.MeshStandardMaterial({
      color: isSelected ? 0xe07a5f : hexColor,
      roughness: 0.4,
      metalness: 0.2,
      emissive: isSelected ? 0x86113c : 0x000000,
      emissiveIntensity: isSelected ? 0.25 : 0,
    });

    const fabricMat = new THREE.MeshStandardMaterial({
      color: 0xf3ede2,
      roughness: 0.85,
      metalness: 0.02,
    });

    const woodDarkMat = new THREE.MeshStandardMaterial({
      color: 0x4a3525,
      roughness: 0.5,
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.8,
      roughness: 0.2,
    });

    // 1. BEDS
    if (catalog.category === 'beds') {
      // Platform base
      const baseGeo = new THREE.BoxGeometry(w, h * 0.35, d);
      const baseMesh = new THREE.Mesh(baseGeo, highlightMat);
      baseMesh.position.y = (h * 0.35) / 2;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      group.add(baseMesh);

      // Mattress
      const matGeo = new THREE.BoxGeometry(w * 0.92, h * 0.35, d * 0.9);
      const matMesh = new THREE.Mesh(matGeo, fabricMat);
      matMesh.position.y = h * 0.35 + (h * 0.35) / 2;
      matMesh.castShadow = true;
      group.add(matMesh);

      // Headboard (at back, z = -d/2)
      const headGeo = new THREE.BoxGeometry(w, h * 0.9, d * 0.08);
      const headMesh = new THREE.Mesh(headGeo, baseMat);
      headMesh.position.set(0, (h * 0.9) / 2, -d / 2 + (d * 0.08) / 2);
      headMesh.castShadow = true;
      group.add(headMesh);

      // Pillows
      const pillowGeo = new THREE.BoxGeometry(w * 0.38, h * 0.15, d * 0.2);
      const p1 = new THREE.Mesh(pillowGeo, fabricMat);
      p1.position.set(-w * 0.22, h * 0.72, -d * 0.28);
      p1.rotation.x = 0.1;
      const p2 = new THREE.Mesh(pillowGeo, fabricMat);
      p2.position.set(w * 0.22, h * 0.72, -d * 0.28);
      p2.rotation.x = 0.1;
      group.add(p1, p2);

      // Runner/Throw blanket
      const throwGeo = new THREE.BoxGeometry(w * 0.93, 0.02, d * 0.3);
      const throwMat = new THREE.MeshStandardMaterial({ color: 0x86113c, roughness: 0.8 });
      const throwMesh = new THREE.Mesh(throwGeo, throwMat);
      throwMesh.position.set(0, h * 0.71, d * 0.25);
      group.add(throwMesh);
    }
    // 2. SOFAS
    else if (catalog.category === 'sofas') {
      // Main seat base
      const seatBaseGeo = new THREE.BoxGeometry(w, h * 0.45, d * 0.9);
      const seatMesh = new THREE.Mesh(seatBaseGeo, highlightMat);
      seatMesh.position.y = (h * 0.45) / 2;
      seatMesh.castShadow = true;
      group.add(seatMesh);

      // Backrest
      const backGeo = new THREE.BoxGeometry(w, h * 0.55, d * 0.22);
      const backMesh = new THREE.Mesh(backGeo, highlightMat);
      backMesh.position.set(0, h * 0.45 + (h * 0.55) / 2, -d / 2 + (d * 0.22) / 2);
      backMesh.castShadow = true;
      group.add(backMesh);

      // Armrests (left and right)
      const armGeo = new THREE.BoxGeometry(w * 0.12, h * 0.35, d * 0.85);
      const armL = new THREE.Mesh(armGeo, highlightMat);
      armL.position.set(-w / 2 + (w * 0.12) / 2, h * 0.45 + (h * 0.35) / 2, 0);
      const armR = new THREE.Mesh(armGeo, highlightMat);
      armR.position.set(w / 2 - (w * 0.12) / 2, h * 0.45 + (h * 0.35) / 2, 0);
      group.add(armL, armR);

      // Placed cushions
      const cushionGeo = new THREE.BoxGeometry(w * 0.35, h * 0.12, d * 0.65);
      const c1 = new THREE.Mesh(cushionGeo, fabricMat);
      c1.position.set(-w * 0.22, h * 0.45 + 0.02, 0);
      const c2 = new THREE.Mesh(cushionGeo, fabricMat);
      c2.position.set(w * 0.22, h * 0.45 + 0.02, 0);
      group.add(c1, c2);
    }
    // 3. DESKS
    else if (catalog.category === 'desks') {
      // Desktop
      const topGeo = new THREE.BoxGeometry(w, 0.04, d);
      const topMesh = new THREE.Mesh(topGeo, highlightMat);
      topMesh.position.y = h - 0.02;
      topMesh.castShadow = true;
      group.add(topMesh);

      // Legs / Side frames
      const legGeo = new THREE.CylinderGeometry(0.025, 0.02, h - 0.04, 8);
      const positions = [
        [-w / 2 + 0.05, (h - 0.04) / 2, -d / 2 + 0.05],
        [w / 2 - 0.05, (h - 0.04) / 2, -d / 2 + 0.05],
        [-w / 2 + 0.05, (h - 0.04) / 2, d / 2 - 0.05],
        [w / 2 - 0.05, (h - 0.04) / 2, d / 2 - 0.05],
      ];
      positions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legGeo, metalMat);
        leg.position.set(lx, ly, lz);
        leg.castShadow = true;
        group.add(leg);
      });

      // Side drawer cabinet
      const drawerGeo = new THREE.BoxGeometry(w * 0.3, h * 0.7, d * 0.85);
      const drawer = new THREE.Mesh(drawerGeo, woodDarkMat);
      drawer.position.set(w / 2 - (w * 0.3) / 2 - 0.05, (h * 0.7) / 2, 0);
      drawer.castShadow = true;
      group.add(drawer);

      // Laptop / Notebook on desk
      const laptopGeo = new THREE.BoxGeometry(0.32, 0.015, 0.22);
      const laptop = new THREE.Mesh(laptopGeo, metalMat);
      laptop.position.set(0, h + 0.01, 0);
      group.add(laptop);
    }
    // 4. CHAIRS
    else if (catalog.category === 'chairs') {
      // Seat cushion
      const seatGeo = new THREE.BoxGeometry(w, 0.06, d * 0.9);
      const seat = new THREE.Mesh(seatGeo, highlightMat);
      seat.position.y = h * 0.55;
      seat.castShadow = true;
      group.add(seat);

      // Backrest
      const backGeo = new THREE.BoxGeometry(w * 0.9, h * 0.45, 0.04);
      const back = new THREE.Mesh(backGeo, highlightMat);
      back.position.set(0, h * 0.55 + (h * 0.45) / 2, -d / 2 + 0.03);
      group.add(back);

      // 4 Legs
      const legGeo = new THREE.CylinderGeometry(0.018, 0.012, h * 0.55, 8);
      const lpos = [
        [-w / 2 + 0.04, (h * 0.55) / 2, -d / 2 + 0.04],
        [w / 2 - 0.04, (h * 0.55) / 2, -d / 2 + 0.04],
        [-w / 2 + 0.04, (h * 0.55) / 2, d / 2 - 0.04],
        [w / 2 - 0.04, (h * 0.55) / 2, d / 2 - 0.04],
      ];
      lpos.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legGeo, woodDarkMat);
        leg.position.set(lx, ly, lz);
        leg.castShadow = true;
        group.add(leg);
      });
    }
    // 5. WARDROBES / STORAGE
    else if (catalog.category === 'wardrobes' || catalog.category === 'storage') {
      const bodyGeo = new THREE.BoxGeometry(w, h, d);
      const body = new THREE.Mesh(bodyGeo, highlightMat);
      body.position.y = h / 2;
      body.castShadow = true;
      group.add(body);

      // Vertical door seam line
      const seamGeo = new THREE.BoxGeometry(0.01, h * 0.92, 0.01);
      const seam = new THREE.Mesh(seamGeo, woodDarkMat);
      seam.position.set(0, h / 2, d / 2 + 0.005);
      group.add(seam);

      // Modern vertical bar handles
      const handleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.25);
      const hL = new THREE.Mesh(handleGeo, metalMat);
      hL.position.set(-0.04, h * 0.55, d / 2 + 0.02);
      const hR = new THREE.Mesh(handleGeo, metalMat);
      hR.position.set(0.04, h * 0.55, d / 2 + 0.02);
      group.add(hL, hR);
    }
    // 6. BOOKSHELVES
    else if (catalog.category === 'bookshelves') {
      // Outer frame
      const frameGeo = new THREE.BoxGeometry(w, h, d);
      const frame = new THREE.Mesh(frameGeo, highlightMat);
      frame.position.y = h / 2;
      frame.castShadow = true;
      group.add(frame);

      // Books rows
      const bookColors = [0x86113c, 0xd8c3a5, 0x4a3525, 0x819878, 0x3d405b];
      for (let shelf = 0; shelf < 3; shelf++) {
        const shelfY = 0.2 + shelf * (h * 0.28);
        for (let b = 0; b < 4; b++) {
          const bg = new THREE.BoxGeometry(0.04, 0.18, d * 0.65);
          const bm = new THREE.MeshStandardMaterial({ color: bookColors[(shelf + b) % bookColors.length] });
          const book = new THREE.Mesh(bg, bm);
          book.position.set(-w * 0.35 + b * 0.06, shelfY, 0);
          group.add(book);
        }
      }
    }
    // 7. LIGHTING / FLOOR LAMPS
    else if (catalog.category === 'lighting') {
      // Heavy circular base
      const baseGeo = new THREE.CylinderGeometry(w * 0.45, w * 0.45, 0.03, 16);
      const base = new THREE.Mesh(baseGeo, metalMat);
      base.position.y = 0.015;
      group.add(base);

      // Slender vertical pole
      const poleGeo = new THREE.CylinderGeometry(0.015, 0.015, h * 0.85, 12);
      const pole = new THREE.Mesh(poleGeo, metalMat);
      pole.position.y = (h * 0.85) / 2;
      group.add(pole);

      // Glowing conical shade
      const shadeGeo = new THREE.CylinderGeometry(w * 0.28, w * 0.42, h * 0.22, 16);
      const shadeMat = new THREE.MeshStandardMaterial({
        color: 0xfff6ea,
        roughness: 0.3,
        emissive: 0xffe2b8,
        emissiveIntensity: 0.6,
      });
      const shade = new THREE.Mesh(shadeGeo, shadeMat);
      shade.position.y = h * 0.85;
      group.add(shade);

      // Real Three.js interior point light casting warm illumination
      const light = new THREE.PointLight(0xffdfba, 1.2, 5);
      light.position.y = h * 0.85;
      light.castShadow = true;
      light.shadow.bias = -0.002;
      group.add(light);
    }
    // 8. RUGS
    else if (catalog.category === 'rugs') {
      const rugGeo = new THREE.BoxGeometry(w, 0.012, d);
      const rugMat = new THREE.MeshStandardMaterial({
        color: hexColor,
        roughness: 0.95,
      });
      const rug = new THREE.Mesh(rugGeo, rugMat);
      rug.position.y = 0.006;
      rug.receiveShadow = true;
      group.add(rug);
    }
    // 9. PLANTS
    else if (catalog.category === 'decor_plants') {
      // Terracotta pot
      const potGeo = new THREE.CylinderGeometry(w * 0.35, w * 0.25, h * 0.4, 16);
      const potMat = new THREE.MeshStandardMaterial({ color: 0xba6848, roughness: 0.7 });
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.y = (h * 0.4) / 2;
      group.add(pot);

      // Foliage cluster
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x3e6545, roughness: 0.6 });
      for (let i = 0; i < 5; i++) {
        const leafGeo = new THREE.SphereGeometry(w * 0.28, 8, 8);
        leafGeo.scale(1, 1.6, 0.3);
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        const angle = (i / 5) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * (w * 0.15), h * 0.55 + (i % 2) * 0.08, Math.sin(angle) * (w * 0.15));
        leaf.rotation.set(0.3 * Math.sin(angle), angle, 0.3 * Math.cos(angle));
        leaf.castShadow = true;
        group.add(leaf);
      }
    }
    // 10. TABLES & GENERIC
    else {
      // Table surface
      const topGeo = new THREE.BoxGeometry(w, 0.04, d);
      const top = new THREE.Mesh(topGeo, highlightMat);
      top.position.y = h - 0.02;
      top.castShadow = true;
      group.add(top);

      // Legs
      const legGeo = new THREE.CylinderGeometry(0.02, 0.015, h - 0.04, 8);
      const tpos = [
        [-w / 2 + 0.04, (h - 0.04) / 2, -d / 2 + 0.04],
        [w / 2 - 0.04, (h - 0.04) / 2, -d / 2 + 0.04],
        [-w / 2 + 0.04, (h - 0.04) / 2, d / 2 - 0.04],
        [w / 2 - 0.04, (h - 0.04) / 2, d / 2 - 0.04],
      ];
      tpos.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legGeo, woodDarkMat);
        leg.position.set(lx, ly, lz);
        leg.castShadow = true;
        group.add(leg);
      });
    }

    // Coordinate conversion:
    // PlacedItem has top-left (xCm, yCm) in room coordinates [0..lengthCm, 0..widthCm]
    // In Three.js: scene center is (0, 0, 0).
    // Room bounds in 3D: X ranges from -roomLength/2 to +roomLength/2
    //                    Z ranges from -roomWidth/2 to +roomWidth/2
    const centerX = (placed.xCm + catalog.dimensions.widthCm / 2) * SCALE - roomLength / 2;
    const centerZ = (placed.yCm + catalog.dimensions.depthCm / 2) * SCALE - roomWidth / 2;

    group.position.set(centerX, 0, centerZ);
    group.rotation.y = (-placed.rotationDeg * Math.PI) / 180;

    return group;
  };

  // Build walls with door & window cutouts
  const buildRoomWalls = (isCutaway: boolean) => {
    const group = new THREE.Group();
    const wallThickness = 0.15;
    const wallHeight = ceilingHeight;

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f2eb,
      roughness: 0.9,
    });

    const skirtingMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0dacf,
      roughness: 0.6,
    });

    // North wall (Z = -roomWidth / 2)
    const northWallGeo = new THREE.BoxGeometry(roomLength + wallThickness * 2, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northWallGeo, wallMaterial);
    northWall.position.set(0, wallHeight / 2, -roomWidth / 2 - wallThickness / 2);
    northWall.receiveShadow = true;
    group.add(northWall);

    // East wall (X = roomLength / 2)
    const eastWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, roomWidth);
    const eastWall = new THREE.Mesh(eastWallGeo, wallMaterial);
    eastWall.position.set(roomLength / 2 + wallThickness / 2, wallHeight / 2, 0);
    eastWall.receiveShadow = true;
    group.add(eastWall);

    // West wall (X = -roomLength / 2)
    const westWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, roomWidth);
    const westWall = new THREE.Mesh(westWallGeo, wallMaterial);
    westWall.position.set(-roomLength / 2 - wallThickness / 2, wallHeight / 2, 0);
    westWall.receiveShadow = true;
    group.add(westWall);

    // South wall (camera facing in isometric view)
    // If cutaway mode is enabled, reduce south wall height so interior is visible
    const southHeight = isCutaway ? 0.35 : wallHeight;
    const southWallGeo = new THREE.BoxGeometry(roomLength + wallThickness * 2, southHeight, wallThickness);
    const southWall = new THREE.Mesh(southWallGeo, wallMaterial);
    southWall.position.set(0, southHeight / 2, roomWidth / 2 + wallThickness / 2);
    southWall.receiveShadow = true;
    group.add(southWall);

    // Perimeter skirting baseboard
    const skirtGeo = new THREE.BoxGeometry(roomLength, 0.08, 0.02);
    const skirtN = new THREE.Mesh(skirtGeo, skirtingMaterial);
    skirtN.position.set(0, 0.04, -roomWidth / 2 + 0.01);
    group.add(skirtN);

    // Window marker frame on North wall (daylight portal)
    const winGeo = new THREE.BoxGeometry(1.6, 1.2, 0.06);
    const winGlassMat = new THREE.MeshStandardMaterial({
      color: 0xbedde8,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
    });
    const winMesh = new THREE.Mesh(winGeo, winGlassMat);
    winMesh.position.set(0, wallHeight * 0.55, -roomWidth / 2 - 0.05);
    group.add(winMesh);

    return group;
  };

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isNightMode ? 0x1f1d1b : 0xf7f5f0);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(roomLength * 1.4, ceilingHeight * 1.7, roomWidth * 1.8);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent diving below floor
    controls.minDistance = 1.5;
    controls.maxDistance = 25;
    controls.target.set(0, ceilingHeight * 0.35, 0);
    controlsRef.current = controls;

    // 5. Flooring (Oak hardwood parquet texture feel)
    const floorGeo = new THREE.PlaneGeometry(roomLength, roomWidth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xdec6a5, // warm blonde Scandinavian ash/oak
      roughness: 0.5,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid helper on floor
    const gridHelper = new THREE.GridHelper(Math.max(roomLength, roomWidth) * 1.1, 20, 0xd0c4b2, 0xe4dbcf);
    gridHelper.position.y = 0.001;
    scene.add(gridHelper);

    // 6. Walls
    const wallsGroup = buildRoomWalls(isCutawayWalls);
    wallsGroupRef.current = wallsGroup;
    scene.add(wallsGroup);

    // 7. Lighting
    const lightsGroup = new THREE.Group();
    lightsGroupRef.current = lightsGroup;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(
      isNightMode ? 0x554433 : 0xfff8ee,
      isNightMode ? 0.7 : 1.1
    );
    lightsGroup.add(ambientLight);

    // Main directional sunlight (streaming through window from north-east)
    const sunLight = new THREE.DirectionalLight(isNightMode ? 0x4a6984 : 0xfff1dc, isNightMode ? 0.4 : 1.6);
    sunLight.position.set(roomLength * 0.8, ceilingHeight * 2, -roomWidth * 1.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 25;
    sunLight.shadow.bias = -0.001;
    const d = Math.max(roomLength, roomWidth);
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    lightsGroup.add(sunLight);

    // Soft bounce fill light from opposite corner
    const fillLight = new THREE.DirectionalLight(0xffeedd, isNightMode ? 0.2 : 0.6);
    fillLight.position.set(-roomLength, ceilingHeight * 1.2, roomWidth);
    lightsGroup.add(fillLight);

    scene.add(lightsGroup);

    // 8. Add Furniture 3D Groups
    furnitureMeshesRef.current.clear();
    items.forEach((item) => {
      const catalog = getCatalogItemById(item.itemId);
      if (!catalog) return;
      const isSelected = item.instanceId === selectedInstanceId;
      const meshGroup = createFurniture3DGroup(item, catalog, isSelected);
      scene.add(meshGroup);
      furnitureMeshesRef.current.set(item.instanceId, meshGroup);
    });

    // 9. Raycasting for Click Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Collect all furniture groups
      const allFurnitureMeshes: THREE.Object3D[] = [];
      furnitureMeshesRef.current.forEach((grp) => {
        allFurnitureMeshes.push(...grp.children);
      });

      const intersects = raycaster.intersectObjects(allFurnitureMeshes, true);
      if (intersects.length > 0) {
        // Trace up to top group with instanceId
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && obj.parent && !furnitureMeshesRef.current.has(obj.name)) {
          obj = obj.parent;
        }
        if (obj && furnitureMeshesRef.current.has(obj.name)) {
          setSelectedInstanceId(obj.name);
          return;
        }
      }
      setSelectedInstanceId(null);
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // 10. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.dispose();
      controls.dispose();
    };
  }, [items, room, isNightMode, isCutawayWalls, selectedInstanceId]);

  // Handle Preset Camera Changes
  const applyViewPreset = (preset: 'isometric' | 'top_down' | 'eye_level' | 'front') => {
    setViewPreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (preset === 'isometric') {
      camera.position.set(roomLength * 1.3, ceilingHeight * 1.6, roomWidth * 1.6);
      controls.target.set(0, ceilingHeight * 0.35, 0);
    } else if (preset === 'top_down') {
      camera.position.set(0, Math.max(roomLength, roomWidth) * 1.8, 0.001);
      controls.target.set(0, 0, 0);
    } else if (preset === 'eye_level') {
      camera.position.set(0, 1.4, roomWidth * 0.45);
      controls.target.set(0, 1.2, -roomWidth * 0.3);
    } else if (preset === 'front') {
      camera.position.set(0, ceilingHeight * 0.5, roomWidth * 1.8);
      controls.target.set(0, ceilingHeight * 0.5, 0);
    }
    controls.update();
  };

  return (
    <div className="relative w-full h-[620px] lg:h-[720px] rounded-3xl overflow-hidden bg-stone-900 border border-stone-200/80 shadow-xl flex flex-col">
      {/* Top 3D Viewport Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: View Mode Pills & Room Dimensions Info */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-stone-200/80">
          <button
            onClick={onSwitchTo2D}
            className="px-3 py-1 text-xs font-semibold rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            2D Floor Plan
          </button>
          <span className="text-stone-300">|</span>
          <span className="px-3 py-1 text-xs font-bold rounded-lg bg-[#86113C] text-white shadow-xs flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            3D Realistic Room
          </span>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-stone-500 pl-2 border-l border-stone-200">
            <span>{room.lengthCm}×{room.widthCm}cm</span>
            <span>({room.lengthCm * room.widthCm / 10000 >= 1 ? `${(room.lengthCm * room.widthCm / 10000).toFixed(1)}m²` : ''})</span>
          </div>
        </div>

        {/* Right: Camera Presets & Environmental Toggles */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-md border border-stone-200/80">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 pr-2 border-r border-stone-200">
            {[
              { id: 'isometric' as const, label: 'Isometric' },
              { id: 'top_down' as const, label: 'Top-Down' },
              { id: 'eye_level' as const, label: 'Eye-Level' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyViewPreset(p.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  viewPreset === p.id
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Wall Cutaway Toggle */}
          <button
            onClick={() => setIsCutawayWalls(!isCutawayWalls)}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              isCutawayWalls
                ? 'bg-[#E07A5F]/15 text-[#B24C31]'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
            title="Toggle Open Cutaway Walls for easy interior visibility"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isCutawayWalls ? 'Cutaway Walls' : 'Full Walls'}</span>
          </button>

          {/* Day / Night Lighting */}
          <button
            onClick={() => setIsNightMode(!isNightMode)}
            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            title="Toggle Day / Night ambiance"
          >
            {isNightMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* Reset Camera */}
          <button
            onClick={() => applyViewPreset('isometric')}
            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            title="Reset 3D Camera view"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Floating Selected Furniture Inspector */}
      {selectedPlacedItem && selectedCatalogItem && (
        <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-stone-200/90 max-w-sm w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-[#86113C] uppercase tracking-wider">
                {selectedCatalogItem.category} • 3D Inspected
              </span>
              <h4 className="font-serif-display text-base font-bold text-stone-900 mt-0.5">
                {selectedCatalogItem.name}
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                {selectedCatalogItem.dimensions.widthCm}W × {selectedCatalogItem.dimensions.depthCm}D ×{' '}
                {selectedCatalogItem.dimensions.heightCm || 75}H cm
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-stone-900">
                {formatINR(selectedCatalogItem.priceINR)}
              </span>
              {selectedPlacedItem.isOwned && (
                <span className="block text-[10px] text-emerald-600 font-medium">Owned Item</span>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
            <span className="text-xs text-stone-500">
              Rotated: <strong className="text-stone-800">{selectedPlacedItem.rotationDeg}°</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRotateSelected}
                className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate 90°</span>
              </button>
              <button
                onClick={handleDeleteSelected}
                className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove item from room"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Right: Quick Interaction Guide & Status */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2 pointer-events-none">
        {hasErrors && (
          <div className="bg-amber-500/90 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overlap or tight clearance detected in 2D plan</span>
          </div>
        )}
        <div className="bg-black/60 text-white/90 text-[11px] px-3 py-1.5 rounded-xl backdrop-blur-xs flex items-center gap-2 shadow-sm">
          <span>Click furniture to select</span>
          <span>•</span>
          <span>Drag mouse to orbit</span>
          <span>•</span>
          <span>Scroll to zoom</span>
        </div>
      </div>
    </div>
  );
};
