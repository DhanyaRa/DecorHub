import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  CatalogItem,
  PlacedItem,
  Project,
  RoomDimensions,
  ValidationIssue,
} from '../../types';
import { getCatalogItemById } from '../../data/furnitureCatalog';
import { validateRoomLayout } from '../../utils/collision';
import { getItemBoundingBox } from '../../utils/geometry';
import { formatINR } from '../../utils/currency';
import { FurnitureImage } from '../catalog/FurnitureImage';
import { ReplaceItemModal } from './ReplaceItemModal';
import { FurnitureDrawer } from './FurnitureDrawer';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  Trash2,
  Copy,
  ArrowRightLeft,
  Plus,
  Undo2,
  Redo2,
  Grid,
  Download,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';

interface RoomPlanner2DProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onOpenShoppingList: () => void;
}

export const RoomPlanner2D: React.FC<RoomPlanner2DProps> = ({
  project,
  onUpdateProject,
  onOpenShoppingList,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Layout items & history
  const [items, setItems] = useState<PlacedItem[]>(project.currentPlacedItems);
  const [history, setHistory] = useState<PlacedItem[][]>([project.currentPlacedItems]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Selection state
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  // Canvas Viewport transformation
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Dragging states
  const [isDraggingItem, setIsDraggingItem] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragItemInitialPos, setDragItemInitialPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanningCanvas, setIsPanningCanvas] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Modals & Drawers
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const room = project.questionnaire.dimensions;

  // Track internal drag/item updates to avoid redundant re-renders during interactions
  const isInternalChangeRef = useRef(false);

  // Sync items whenever the project changes or active layout is switched externally
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    const targetAlt = project.layoutAlternatives[project.activeLayoutId];
    const targetItems = targetAlt?.items || project.currentPlacedItems;
    setItems([...targetItems]);
    setHistory([[...targetItems]]);
    setHistoryIndex(0);
    setSelectedInstanceId(null);
  }, [project.id, project.activeLayoutId, project.currentPlacedItems]);

  // Validation issues
  const validationIssues = validateRoomLayout(items, room);
  const hasErrors = validationIssues.some((i) => i.severity === 'error');
  const hasWarnings = validationIssues.length > 0;

  // Sync back to project when items change
  const commitItemsChange = useCallback(
    (newItems: PlacedItem[], recordHistory = true) => {
      isInternalChangeRef.current = true;
      setItems(newItems);
      onUpdateProject({
        ...project,
        currentPlacedItems: newItems,
        updatedAt: new Date().toISOString(),
      });

      if (recordHistory) {
        setHistory((prev) => {
          const sliced = prev.slice(0, historyIndex + 1);
          return [...sliced, newItems];
        });
        setHistoryIndex((prev) => prev + 1);
      }
    },
    [project, onUpdateProject, historyIndex]
  );

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetItems = history[targetIndex];
      setHistoryIndex(targetIndex);
      commitItemsChange(targetItems, false);
      showToast('Undo previous action');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const targetItems = history[targetIndex];
      setHistoryIndex(targetIndex);
      commitItemsChange(targetItems, false);
      showToast('Redo action');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Switch layout alternative (A, B, C)
  const handleSwitchAlternative = (layoutKey: string) => {
    const alt = project.layoutAlternatives[layoutKey];
    if (alt) {
      const newItems = [...alt.items];
      isInternalChangeRef.current = true;
      setItems(newItems);
      setHistory([newItems]);
      setHistoryIndex(0);
      setSelectedInstanceId(null);
      onUpdateProject({
        ...project,
        activeLayoutId: layoutKey,
        currentPlacedItems: newItems,
        updatedAt: new Date().toISOString(),
      });
      showToast(`Switched to ${alt.name}`);
    }
  };

  // Reset to original layout
  const handleResetLayout = () => {
    const activeAlt = project.layoutAlternatives[project.activeLayoutId] || project.layoutAlternatives.space_efficient;
    if (activeAlt) {
      commitItemsChange([...activeAlt.items]);
      showToast('Reset layout to initial design recommendations');
    }
  };

  // Center & Fit room to canvas
  const fitRoomToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const padding = 80;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;

    const scaleX = availableWidth / room.lengthCm;
    const scaleY = availableHeight / room.widthCm;
    const baseScale = Math.min(scaleX, scaleY);

    setZoom(baseScale);
    setPanOffset({
      x: (canvas.width - room.lengthCm * baseScale) / 2,
      y: (canvas.height - room.widthCm * baseScale) / 2,
    });
  }, [room.lengthCm, room.widthCm]);

  // Initial fit on mount & resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);

      fitRoomToCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitRoomToCanvas]);

  // Transform coordinates: Room CM -> Screen Canvas Pixels
  const roomToScreen = useCallback(
    (xCm: number, yCm: number) => {
      return {
        x: panOffset.x + xCm * zoom,
        y: panOffset.y + yCm * zoom,
      };
    },
    [panOffset, zoom]
  );

  // Transform coordinates: Screen Canvas Pixels -> Room CM
  const screenToRoom = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX - panOffset.x) / zoom,
        y: (screenY - panOffset.y) / zoom,
      };
    },
    [panOffset, zoom]
  );

  // ================= CANVAS DRAWING =================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.width / dpr;
    const displayHeight = canvas.height / dpr;

    // Clear background
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    const roomScreenOrigin = roomToScreen(0, 0);
    const roomScreenWidth = room.lengthCm * zoom;
    const roomScreenHeight = room.widthCm * zoom;

    // Draw Grid (50cm major grid)
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = '#ECE8E1';
      ctx.lineWidth = 1;

      // Vertical grid lines
      for (let x = 0; x <= room.lengthCm; x += 50) {
        const ptTop = roomToScreen(x, 0);
        const ptBottom = roomToScreen(x, room.widthCm);
        ctx.beginPath();
        ctx.moveTo(ptTop.x, ptTop.y);
        ctx.lineTo(ptBottom.x, ptBottom.y);
        ctx.stroke();
      }

      // Horizontal grid lines
      for (let y = 0; y <= room.widthCm; y += 50) {
        const ptLeft = roomToScreen(0, y);
        const ptRight = roomToScreen(room.lengthCm, y);
        ctx.beginPath();
        ctx.moveTo(ptLeft.x, ptLeft.y);
        ctx.lineTo(ptRight.x, ptRight.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Room Floor fill
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
    ctx.shadowBlur = 12;
    ctx.fillRect(roomScreenOrigin.x, roomScreenOrigin.y, roomScreenWidth, roomScreenHeight);
    ctx.restore();

    // Draw Rugs first (Layer 0: Floor rugs stay under furniture)
    const sortedItems = [...items].sort((a, b) => {
      const catA = getCatalogItemById(a.itemId)?.category;
      const catB = getCatalogItemById(b.itemId)?.category;
      if (catA === 'rugs' && catB !== 'rugs') return -1;
      if (catA !== 'rugs' && catB === 'rugs') return 1;
      return 0;
    });

    // Draw Furniture Pieces
    for (const item of sortedItems) {
      const catalog = getCatalogItemById(item.itemId);
      if (!catalog) continue;

      const isSelected = item.instanceId === selectedInstanceId;
      const isOffending = validationIssues.some(
        (iss) => iss.involvedInstanceIds.includes(item.instanceId)
      );

      ctx.save();

      const itemScreenPos = roomToScreen(item.xCm, item.yCm);
      const widthCm = item.customDimensions?.widthCm || catalog.dimensions.widthCm;
      const depthCm = item.customDimensions?.depthCm || catalog.dimensions.depthCm;
      const itemW = widthCm * zoom;
      const itemD = depthCm * zoom;

      // Move to center of object and rotate
      const centerX = itemScreenPos.x + itemW / 2;
      const centerY = itemScreenPos.y + itemD / 2;

      ctx.translate(centerX, centerY);
      ctx.rotate((item.rotationDeg * Math.PI) / 180);

      // Draw Top-Down Architectural Vector
      drawTopDownFurniture(
        ctx,
        -itemW / 2,
        -itemD / 2,
        itemW,
        itemD,
        catalog,
        isSelected,
        isOffending,
        item.isSuggested,
        item.isOwned
      );

      ctx.restore();
    }

    // Draw Room Walls
    ctx.save();
    const wallThick = 8 * zoom;
    ctx.lineWidth = wallThick;
    ctx.strokeStyle = '#3C3B3D'; // Solid charcoal architectural wall core
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    ctx.strokeRect(
      roomScreenOrigin.x - wallThick / 2,
      roomScreenOrigin.y - wallThick / 2,
      roomScreenWidth + wallThick,
      roomScreenHeight + wallThick
    );
    ctx.restore();

    // Draw Doors & Swing Arcs
    const door = room.door;
    if (door) {
      drawDoor(ctx, door, room, zoom, panOffset);
    }

    // Draw Windows
    if (room.windows) {
      for (const win of room.windows) {
        drawWindow(ctx, win, room, zoom, panOffset);
      }
    }

    // Draw Wall Dimension Labels (Exterior dimension stringers)
    drawDimensionLabels(ctx, room, zoom, panOffset);

    // Draw Scale Indicator
    drawScaleRuler(ctx, zoom, displayWidth, displayHeight);
  }, [
    items,
    room,
    zoom,
    panOffset,
    showGrid,
    selectedInstanceId,
    validationIssues,
    roomToScreen,
  ]);

  // ================= TOP-DOWN ARCHITECTURAL FURNITURE RENDERER =================
  const drawTopDownFurniture = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    cat: CatalogItem,
    isSelected: boolean,
    isOffending: boolean,
    isSuggested: boolean = false,
    isOwned: boolean = false
  ) => {
    ctx.save();

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    const baseColor = cat.hexColor || '#E8D8C8';

    switch (cat.topDownType) {
      case 'bed_double': {
        // Bed base
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, w, h);

        // Headboard top strip
        ctx.fillStyle = '#6B4423';
        ctx.fillRect(x, y, w, h * 0.12);

        // Pillows
        const pillowW = w * 0.38;
        const pillowH = h * 0.2;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#D1CBC2';
        ctx.lineWidth = 1;

        // Left Pillow
        ctx.beginPath();
        ctx.roundRect(x + w * 0.08, y + h * 0.15, pillowW, pillowH, 4);
        ctx.fill();
        ctx.stroke();

        // Right Pillow
        ctx.beginPath();
        ctx.roundRect(x + w * 0.54, y + h * 0.15, pillowW, pillowH, 4);
        ctx.fill();
        ctx.stroke();

        // Folded Duvet Accent Line
        ctx.strokeStyle = '#A89F91';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + h * 0.42);
        ctx.lineTo(x + w - 2, y + h * 0.42);
        ctx.stroke();
        break;
      }

      case 'bed_single': {
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#4A4D52';
        ctx.fillRect(x, y, w, h * 0.12);

        // Single Center Pillow
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#D1CBC2';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x + w * 0.15, y + h * 0.15, w * 0.7, h * 0.2, 4);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'sofa_3seater':
      case 'sofa_2seater': {
        // Main sofa body
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, w, h);

        // Backrest bar (top edge)
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(x, y, w, h * 0.24);

        // Armrests (left and right)
        ctx.fillRect(x, y, w * 0.12, h);
        ctx.fillRect(x + w * 0.88, y, w * 0.12, h);

        // Seat cushions dividers
        const numCushions = cat.topDownType === 'sofa_3seater' ? 3 : 2;
        const innerW = w * 0.76;
        const cushionW = innerW / numCushions;
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1.5;

        for (let i = 1; i < numCushions; i++) {
          ctx.beginPath();
          ctx.moveTo(x + w * 0.12 + cushionW * i, y + h * 0.24);
          ctx.lineTo(x + w * 0.12 + cushionW * i, y + h);
          ctx.stroke();
        }
        break;
      }

      case 'armchair': {
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();

        // Curved wrap backrest
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Seat cushion
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2 + 3, Math.min(w, h) * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'desk_study':
      case 'desk_executive': {
        // Desktop Slab
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, w, h);

        // Chamfer border
        ctx.strokeStyle = '#B3A899';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

        // Laptop / Work area indicator
        ctx.fillStyle = '#262322';
        ctx.fillRect(x + w * 0.35, y + h * 0.3, w * 0.3, h * 0.35);

        // Cable grommet
        ctx.fillStyle = '#6E6B68';
        ctx.beginPath();
        ctx.arc(x + w * 0.85, y + h * 0.2, Math.max(3, w * 0.03), 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'chair_office': {
        // Circular base swivel & seat
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Ergonomic backrest bar
        ctx.fillStyle = '#262322';
        ctx.fillRect(x + w * 0.15, y + h * 0.1, w * 0.7, h * 0.18);
        break;
      }

      case 'wardrobe_large':
      case 'wardrobe_compact': {
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, w, h);

        // Sliding door overlapping lines & arrows
        ctx.strokeStyle = '#6E675F';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);

        // Door divider
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w / 2, y + h);
        ctx.stroke();

        // Inner dashed clothes rail
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.moveTo(x + 8, y + h / 2);
        ctx.lineTo(x + w - 8, y + h / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }

      case 'table_coffee':
      case 'table_dining': {
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 6);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      case 'tv_unit': {
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, w, h);

        // Center mounted TV screen line
        ctx.fillStyle = '#1C1917';
        ctx.fillRect(x + w * 0.15, y + h * 0.35, w * 0.7, h * 0.2);
        break;
      }

      case 'rug_rectangular': {
        // Textured patterned rug with dashed border
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = '#A89985';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
        ctx.setLineDash([]);
        break;
      }

      case 'lamp_floor': {
        // Circular base with warm radiating halo
        ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#D4AF37';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'plant_potted': {
        // Organic leaf clusters
        ctx.fillStyle = '#4A6B44';
        const numLeaves = 6;
        for (let i = 0; i < numLeaves; i++) {
          const angle = (i * Math.PI * 2) / numLeaves;
          const lx = x + w / 2 + Math.cos(angle) * (w * 0.3);
          const ly = y + h / 2 + Math.sin(angle) * (h * 0.3);
          ctx.beginPath();
          ctx.arc(lx, ly, Math.min(w, h) * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }

        // Center soil terracotta pot
        ctx.fillStyle = '#C86D51';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      default: {
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#B3A899';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
      }
    }

    // Border outline & Label
    ctx.strokeStyle = '#7D7365';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Label if there's enough canvas space
    if (w >= 45 && h >= 25 && cat.category !== 'rugs') {
      ctx.fillStyle = '#262322';
      ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const shortLabel = cat.name.split(' ').slice(0, 2).join(' ');
      ctx.fillText(shortLabel, x + w / 2, y + h / 2);
    }

    // Selection Halo & Rotation Peg
    if (isSelected) {
      ctx.strokeStyle = '#86113C';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);

      // Top Rotation Handle Peg
      ctx.fillStyle = '#86113C';
      ctx.beginPath();
      ctx.arc(x + w / 2, y - 18, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x + w / 2, y - 3);
      ctx.lineTo(x + w / 2, y - 18);
      ctx.strokeStyle = '#86113C';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Offending / Collision Warning Outline
    if (isOffending) {
      ctx.strokeStyle = '#E11D48'; // Rose red warning
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
      ctx.setLineDash([]);
    } else if (isSuggested && !isSelected) {
      // Suggestion outline in warm amber dash
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
      ctx.setLineDash([]);
    } else if (isOwned && !isSelected) {
      // Owned outline in emerald dash
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
      ctx.setLineDash([]);
    }

    ctx.restore();
  };

  // ================= DOOR DRAWING =================
  const drawDoor = (
    ctx: CanvasRenderingContext2D,
    door: RoomDimensions['door'],
    room: RoomDimensions,
    scale: number,
    offset: { x: number; y: number }
  ) => {
    ctx.save();
    const dw = door.widthCm * scale;
    const dp = door.positionCm * scale;

    let doorBaseX = 0;
    let doorBaseY = 0;
    let angleStart = 0;
    let angleEnd = 0;

    switch (door.wall) {
      case 'south':
        doorBaseX = offset.x + dp;
        doorBaseY = offset.y + room.widthCm * scale;
        angleStart = Math.PI;
        angleEnd = 1.5 * Math.PI;
        break;
      case 'north':
        doorBaseX = offset.x + dp;
        doorBaseY = offset.y;
        angleStart = 0;
        angleEnd = 0.5 * Math.PI;
        break;
      case 'west':
        doorBaseX = offset.x;
        doorBaseY = offset.y + dp;
        angleStart = 1.5 * Math.PI;
        angleEnd = 2 * Math.PI;
        break;
      case 'east':
        doorBaseX = offset.x + room.lengthCm * scale;
        doorBaseY = offset.y + dp;
        angleStart = 0.5 * Math.PI;
        angleEnd = Math.PI;
        break;
    }

    // Doorway opening line (white gap in wall)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 10 * scale;
    ctx.beginPath();
    if (door.wall === 'south' || door.wall === 'north') {
      ctx.moveTo(doorBaseX, doorBaseY);
      ctx.lineTo(doorBaseX + dw, doorBaseY);
    } else {
      ctx.moveTo(doorBaseX, doorBaseY);
      ctx.lineTo(doorBaseX, doorBaseY + dw);
    }
    ctx.stroke();

    // Swing Arc (dashed 90-degree quadrant)
    ctx.strokeStyle = '#86113C';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(doorBaseX, doorBaseY, dw, angleStart, angleEnd);
    ctx.stroke();
    ctx.setLineDash([]);

    // Door Leaf line
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(doorBaseX, doorBaseY);
    ctx.lineTo(
      doorBaseX + Math.cos(angleEnd) * dw,
      doorBaseY + Math.sin(angleEnd) * dw
    );
    ctx.stroke();

    ctx.restore();
  };

  // ================= WINDOW DRAWING =================
  const drawWindow = (
    ctx: CanvasRenderingContext2D,
    win: RoomDimensions['windows'][0],
    room: RoomDimensions,
    scale: number,
    offset: { x: number; y: number }
  ) => {
    ctx.save();
    const ww = win.widthCm * scale;
    const wp = win.positionCm * scale;

    let wx = 0;
    let wy = 0;
    let isHorizontal = true;

    if (win.wall === 'north') {
      wx = offset.x + wp;
      wy = offset.y;
    } else if (win.wall === 'south') {
      wx = offset.x + wp;
      wy = offset.y + room.widthCm * scale;
    } else if (win.wall === 'west') {
      wx = offset.x;
      wy = offset.y + wp;
      isHorizontal = false;
    } else if (win.wall === 'east') {
      wx = offset.x + room.lengthCm * scale;
      wy = offset.y + wp;
      isHorizontal = false;
    }

    // Window Glass Double Pane
    ctx.strokeStyle = '#38BDF8'; // Sky blue glass
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (isHorizontal) {
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + ww, wy);
    } else {
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx, wy + ww);
    }
    ctx.stroke();

    ctx.restore();
  };

  // ================= WALL DIMENSION LABELS =================
  const drawDimensionLabels = (
    ctx: CanvasRenderingContext2D,
    room: RoomDimensions,
    scale: number,
    offset: { x: number; y: number }
  ) => {
    ctx.save();
    ctx.fillStyle = '#78716C';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Top Width (cm / m)
    const topX = offset.x + (room.lengthCm * scale) / 2;
    const topY = offset.y - 12;
    ctx.fillText(`${room.lengthCm} cm (${(room.lengthCm / 100).toFixed(2)} m)`, topX, topY);

    // Left Height
    ctx.save();
    ctx.translate(offset.x - 16, offset.y + (room.widthCm * scale) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${room.widthCm} cm (${(room.widthCm / 100).toFixed(2)} m)`, 0, 0);
    ctx.restore();

    ctx.restore();
  };

  // ================= SCALE RULER =================
  const drawScaleRuler = (
    ctx: CanvasRenderingContext2D,
    scale: number,
    width: number,
    height: number
  ) => {
    ctx.save();
    const rulerLengthCm = 100; // 1 Meter
    const rulerPixelLen = rulerLengthCm * scale;
    const rx = width - rulerPixelLen - 24;
    const ry = height - 20;

    ctx.strokeStyle = '#57534E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + rulerPixelLen, ry);
    ctx.moveTo(rx, ry - 4);
    ctx.lineTo(rx, ry + 4);
    ctx.moveTo(rx + rulerPixelLen, ry - 4);
    ctx.lineTo(rx + rulerPixelLen, ry + 4);
    ctx.stroke();

    ctx.fillStyle = '#57534E';
    ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1 Meter (100 cm)', rx + rulerPixelLen / 2, ry - 6);
    ctx.restore();
  };

  // ================= POINTER / TOUCH HANDLERS =================
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const roomCoords = screenToRoom(clickX, clickY);

    // Check if clicked inside any furniture item (search in reverse order: top-most first)
    const clickedItem = [...items].reverse().find((item) => {
      const box = getItemBoundingBox(item);
      return (
        roomCoords.x >= box.minX &&
        roomCoords.x <= box.maxX &&
        roomCoords.y >= box.minY &&
        roomCoords.y <= box.maxY
      );
    });

    if (clickedItem) {
      setSelectedInstanceId(clickedItem.instanceId);
      setIsDraggingItem(true);
      setDragStartPos({ x: clickX, y: clickY });
      setDragItemInitialPos({ x: clickedItem.xCm, y: clickedItem.yCm });
      canvas.setPointerCapture(e.pointerId);
    } else {
      // Pan canvas
      setSelectedInstanceId(null);
      setIsPanningCanvas(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDraggingItem && selectedInstanceId) {
      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const deltaXScreen = currentX - dragStartPos.x;
      const deltaYScreen = currentY - dragStartPos.y;

      const deltaXCm = deltaXScreen / zoom;
      const deltaYCm = deltaYScreen / zoom;

      // Snap to 5cm increments
      const rawX = dragItemInitialPos.x + deltaXCm;
      const rawY = dragItemInitialPos.y + deltaYCm;
      const snappedX = Math.round(rawX / 5) * 5;
      const snappedY = Math.round(rawY / 5) * 5;

      setItems((prev) =>
        prev.map((it) =>
          it.instanceId === selectedInstanceId
            ? { ...it, xCm: snappedX, yCm: snappedY }
            : it
        )
      );
    } else if (isPanningCanvas) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (isDraggingItem) {
      setIsDraggingItem(false);
      // Record new layout state in history
      commitItemsChange(items);
    }
    setIsPanningCanvas(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(Math.max(0.3, z * factor), 4));
  };

  // Rotate selected item
  const handleRotateSelected = (angleStep = 90) => {
    if (!selectedInstanceId) return;
    const updated = items.map((it) => {
      if (it.instanceId === selectedInstanceId) {
        return {
          ...it,
          rotationDeg: (it.rotationDeg + angleStep) % 360,
        };
      }
      return it;
    });
    commitItemsChange(updated);
    showToast(`Rotated by ${angleStep}°`);
  };

  // Duplicate selected item
  const handleDuplicateSelected = () => {
    if (!selectedInstanceId) return;
    const target = items.find((i) => i.instanceId === selectedInstanceId);
    if (!target) return;

    const dup: PlacedItem = {
      ...target,
      instanceId: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      xCm: Math.min(room.lengthCm - 100, target.xCm + 25),
      yCm: Math.min(room.widthCm - 100, target.yCm + 25),
    };

    const next = [...items, dup];
    commitItemsChange(next);
    setSelectedInstanceId(dup.instanceId);
    showToast('Duplicated item');
  };

  // Delete selected item
  const handleDeleteSelected = () => {
    if (!selectedInstanceId) return;
    const next = items.filter((i) => i.instanceId !== selectedInstanceId);
    commitItemsChange(next);
    setSelectedInstanceId(null);
    showToast('Removed item from room');
  };

  // Add Item from Drawer
  const handleAddItemFromDrawer = (catalogItem: CatalogItem) => {
    const newItem: PlacedItem = {
      instanceId: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      itemId: catalogItem.id,
      xCm: Math.max(30, Math.floor((room.lengthCm - catalogItem.dimensions.widthCm) / 2)),
      yCm: Math.max(30, Math.floor((room.widthCm - catalogItem.dimensions.depthCm) / 2)),
      rotationDeg: 0,
    };
    const next = [...items, newItem];
    commitItemsChange(next);
    setSelectedInstanceId(newItem.instanceId);
    showToast(`Added ${catalogItem.name} to canvas`);
  };

  // Replace item
  const handleConfirmReplace = (oldInstanceId: string, newItem: CatalogItem) => {
    const updated = items.map((it) => {
      if (it.instanceId === oldInstanceId) {
        return {
          ...it,
          itemId: newItem.id,
        };
      }
      return it;
    });
    commitItemsChange(updated);
    showToast(`Replaced with ${newItem.name}`);
  };

  // Convert optional AI suggestion to selected purchase
  const handleConvertSuggestionToPurchase = () => {
    if (!selectedInstanceId) return;
    const next = items.map((it) => {
      if (it.instanceId === selectedInstanceId) {
        return {
          ...it,
          isSuggested: false,
          isOwned: false,
          status: 'selected' as const,
        };
      }
      return it;
    });
    commitItemsChange(next);
    showToast('Added item to selected purchase Bill of Materials');
  };

  // Toggle owned asset status (₹0 purchase cost)
  const handleToggleOwned = () => {
    if (!selectedInstanceId) return;
    const target = items.find((i) => i.instanceId === selectedInstanceId);
    if (!target) return;
    const newOwned = !target.isOwned;
    const next = items.map((it) => {
      if (it.instanceId === selectedInstanceId) {
        return {
          ...it,
          isOwned: newOwned,
          isSuggested: false,
          status: newOwned ? ('owned' as const) : ('selected' as const),
        };
      }
      return it;
    });
    commitItemsChange(next);
    showToast(newOwned ? 'Marked as existing owned furniture (₹0)' : 'Marked as selected purchase');
  };

  // Cycle disposition action for owned furniture: keep -> reposition -> rotate -> remove
  const handleCycleOwnedAction = () => {
    if (!selectedInstanceId) return;
    const target = items.find((i) => i.instanceId === selectedInstanceId);
    if (!target) return;
    const actions: Array<'keep' | 'reposition' | 'rotate' | 'remove'> = ['keep', 'reposition', 'rotate', 'remove'];
    const currentAction = (target.ownedAction as any) || 'keep';
    const nextIdx = (actions.indexOf(currentAction) + 1) % actions.length;
    const nextAction = actions[nextIdx];

    if (nextAction === 'remove') {
      handleDeleteSelected();
      showToast('Removed item from room layout');
      return;
    }

    const next = items.map((it) => {
      if (it.instanceId === selectedInstanceId) {
        return {
          ...it,
          ownedAction: nextAction,
          rotationDeg: nextAction === 'rotate' ? (it.rotationDeg + 90) % 360 : it.rotationDeg,
        };
      }
      return it;
    });
    commitItemsChange(next);
    showToast(`Disposition set to: ${nextAction.toUpperCase()}`);
  };

  // Export 2D Floor Plan PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a high quality export image
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `DecorHub-FloorPlan-${project.name.replace(/\s+/g, '-')}.png`;
    link.href = dataURL;
    link.click();
    showToast('Floor plan PNG exported successfully!');
  };

  const selectedItem = items.find((i) => i.instanceId === selectedInstanceId);
  const selectedCatalog = selectedItem ? getCatalogItemById(selectedItem.itemId) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] bg-[#FAF8F5]">
      {/* Top Planner Toolbar */}
      <div className="px-4 py-2.5 bg-white border-b border-stone-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[11px] font-semibold text-[#86113C] tracking-wider uppercase">
              2D Room Planner
            </span>
            <h2 className="font-serif-display text-base font-bold text-stone-900 leading-tight">
              {project.name}
            </h2>
          </div>

          {/* Layout Alternative Selector Tabs */}
          <div className="flex flex-wrap items-center bg-stone-100 p-1 rounded-xl gap-1">
            {Object.values(project.layoutAlternatives).map((alt) => (
              <button
                key={alt.id}
                onClick={() => handleSwitchAlternative(alt.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  project.activeLayoutId === alt.id
                    ? 'bg-[#86113C] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                {alt.id === 'space_efficient'
                  ? 'Layout A (Space)'
                  : alt.id === 'comfort_focused'
                  ? 'Layout B (Comfort)'
                  : 'Layout C (Storage)'}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* History Undo / Redo */}
          <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
              className="p-1.5 text-stone-600 hover:bg-stone-50 disabled:text-stone-300 disabled:hover:bg-transparent"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-stone-200" />
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
              className="p-1.5 text-stone-600 hover:bg-stone-50 disabled:text-stone-300 disabled:hover:bg-transparent"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid((g) => !g)}
            title="Toggle Measurement Grid"
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
              showGrid
                ? 'bg-stone-100 border-stone-300 text-stone-800'
                : 'border-stone-200 text-stone-500 hover:text-stone-700'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Reset button */}
          <button
            onClick={handleResetLayout}
            className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            Reset
          </button>

          {/* Add item button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#86113C] hover:bg-[#700E32] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Furniture</span>
          </button>

          {/* Export PNG */}
          <button
            onClick={handleExportPNG}
            className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PNG</span>
          </button>
        </div>
      </div>

      {/* Validation Banner if collision or door blockage occurs */}
      {hasWarnings && (
        <div className="bg-amber-50/95 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900 transition-all">
          <div className="flex items-center gap-2 overflow-hidden">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-semibold">Layout Check:</span>
            <span className="truncate">{validationIssues[0].message}</span>
            {validationIssues.length > 1 && (
              <span className="text-[11px] font-medium text-amber-700 shrink-0">
                (+{validationIssues.length - 1} more issue{validationIssues.length > 2 ? 's' : ''})
              </span>
            )}
          </div>
          <span className="text-[11px] text-amber-700 font-medium shrink-0">
            Drag to adjust clearance
          </span>
        </div>
      )}

      {/* Main Interactive Canvas Area */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden select-none touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
        />

        {/* Zoom Controls & Fit Overlay */}
        <div className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-xs rounded-xl shadow-md border border-stone-200 p-1 flex items-center gap-1 text-stone-700 z-10">
          <button
            onClick={() => setZoom((z) => Math.min(4, z * 1.15))}
            className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono px-1 font-semibold text-stone-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z * 0.85))}
            className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-stone-200" />
          <button
            onClick={fitRoomToCanvas}
            className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
            title="Fit Room to Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Item Floating Inspector & Action Bar */}
        {selectedItem && selectedCatalog && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200 px-4 py-2.5 flex items-center gap-3 z-20 animate-fade-in text-xs max-w-2xl">
            <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-stone-200 bg-stone-50">
              <FurnitureImage
                src={selectedCatalog.imageUrl}
                alt={selectedCatalog.name}
                category={selectedCatalog.category}
                hexColor={selectedCatalog.hexColor}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-stone-900 truncate">
                  {selectedItem.customLabel || selectedCatalog.name}
                </span>
                {selectedItem.isSuggested ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                    AI Suggestion
                  </span>
                ) : selectedItem.isOwned ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
                    Owned (₹0)
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-800 shrink-0">
                    Selected
                  </span>
                )}
                {selectedItem.isOwned && selectedItem.ownedAction && (
                  <button
                    onClick={handleCycleOwnedAction}
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 capitalize shrink-0 transition-colors cursor-pointer"
                    title="Click to cycle disposition: Keep -> Reposition -> Rotate -> Remove"
                  >
                    Action: {selectedItem.ownedAction}
                  </button>
                )}
              </div>
              <div className="text-stone-500 flex items-center gap-2 mt-0.5">
                <span>
                  {selectedItem.customDimensions?.widthCm || selectedCatalog.dimensions.widthCm} ×{' '}
                  {selectedItem.customDimensions?.depthCm || selectedCatalog.dimensions.depthCm} cm
                </span>
                <span>·</span>
                <span className="font-semibold text-stone-900">
                  {selectedItem.isOwned ? '₹0 (Owned Asset)' : formatINR(selectedCatalog.priceINR)}
                </span>
                {selectedItem.actionRationale && (
                  <>
                    <span>·</span>
                    <span className="text-[11px] text-stone-500 italic max-w-xs truncate" title={selectedItem.actionRationale}>
                      {selectedItem.actionRationale}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Selection / Ownership controls */}
            <div className="flex items-center gap-1 border-l border-stone-200 pl-2 shrink-0">
              {selectedItem.isSuggested && (
                <button
                  onClick={handleConvertSuggestionToPurchase}
                  className="px-2.5 py-1.5 rounded-lg bg-[#C86D51] hover:bg-[#B45A3E] text-white font-semibold text-[11px] shadow-xs flex items-center gap-1 transition-colors"
                  title="Add this item to the Bill of Materials purchase total"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Select for Purchase</span>
                </button>
              )}
              <button
                onClick={handleToggleOwned}
                className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                  selectedItem.isOwned
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
                title={selectedItem.isOwned ? 'Change to new purchase item' : 'Mark as already owned (₹0 purchase cost)'}
              >
                {selectedItem.isOwned ? 'Owned (₹0)' : 'Mark Owned'}
              </button>
            </div>

            {/* Geometric / Transformation Actions */}
            <div className="flex items-center gap-1 border-l border-stone-200 pl-2 shrink-0">
              <button
                onClick={() => handleRotateSelected(90)}
                className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-700 transition-colors"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleDuplicateSelected}
                className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-700 transition-colors"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsReplaceModalOpen(true)}
                className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-700 transition-colors"
                title="Replace with alternative"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeleteSelected}
                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Toast alert */}
        {toastMessage && (
          <div className="absolute bottom-5 right-5 bg-stone-900/90 backdrop-blur-xs text-white text-xs px-4 py-2.5 rounded-xl shadow-lg z-30">
            {toastMessage}
          </div>
        )}
      </div>

      {/* Furniture Catalog Slide-over Drawer */}
      <FurnitureDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onAddItem={handleAddItemFromDrawer}
      />

      {/* Replace Item Modal */}
      {isReplaceModalOpen && selectedItem && (
        <ReplaceItemModal
          itemToReplace={selectedItem}
          onConfirmReplace={handleConfirmReplace}
          onClose={() => setIsReplaceModalOpen(false)}
        />
      )}
    </div>
  );
};
