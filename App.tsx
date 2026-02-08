import React, { useState, useEffect, useCallback, useRef, MouseEvent, TouchEvent } from 'react';
import { Sidebar } from './components/Sidebar';
import { RoadGraph, RoadNode, findPath, findNearestNode } from './utils/graph';
import { MAP_DATA, MAP_THEMES, MAP_IMAGES, MAP_IMAGES_HIGH_RES, COLORS, SPECIAL_LOCATIONS, MAX_GLIDE_DISTANCE, ThemeMode, getFlyDistance } from './constants';
import { calculateDropParams, DropStrategy } from './utils/math';
import { Point, AppMode, CalculationResult } from './types';

// Helper for max glide range


import img_roads_Erangel from './data/roads_Erangel.json';
import img_roads_Miramar from './data/roads_Miramar.json';
import img_roads_Deston from './data/roads_Deston.json';
import img_roads_Rondo from './data/roads_Rondo.json';
import img_roads_Taego from './data/roads_Taego.json';
import img_roads_Vikendi from './data/roads_Vikendi.json';

// ...

const App: React.FC = () => {
  // ...

  // State
  const [selectedMap, setSelectedMap] = useState<string>('Erangel');
  const [planeStart, setPlaneStart] = useState<Point | null>(null);
  const [planeEnd, setPlaneEnd] = useState<Point | null>(null);
  const [destination, setDestination] = useState<Point | null>(null);
  const [stats, setStats] = useState<{
    distance: number | null;
    perpDist: number | null;
    jumpDistanceRule: number | null;
    isReachable: boolean | null;
    strategy: DropStrategy | null;
  }>({
    distance: null,
    perpDist: null,
    jumpDistanceRule: null,
    isReachable: null,
    strategy: null
  });
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [highResImage, setHighResImage] = useState<HTMLImageElement | null>(null);
  const [isHighResLoaded, setIsHighResLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<boolean>(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef<Point | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ruler State
  const [appMode, setAppMode] = useState<'drop' | 'ruler' | 'editor'>('drop');
  const [rulerStart, setRulerStart] = useState<Point | null>(null);
  const [rulerEnd, setRulerEnd] = useState<Point | null>(null);

  // Editor State
  const [roadGraph, setRoadGraph] = useState<RoadGraph>({ nodes: {} });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editorPath, setEditorPath] = useState<string[] | null>(null); // For visualizing path
  const [brushMode, setBrushMode] = useState(false); // Brush mode toggle
  const [lastBrushPos, setLastBrushPos] = useState<Point | null>(null); // Last position in brush mode
  const [lastBrushNodeId, setLastBrushNodeId] = useState<string | null>(null); // Last created node in brush

  // Navigator State
  const [navStart, setNavStart] = useState<Point | null>(null);
  const [navEnd, setNavEnd] = useState<Point | null>(null);
  const [navPath, setNavPath] = useState<Point[] | null>(null);
  const [navDistance, setNavDistance] = useState<number | null>(null);

  // Path animation state
  const [pathAnimProgress, setPathAnimProgress] = useState<number>(0); // 0 to 1
  const [glowProgress, setGlowProgress] = useState<number>(0); // 0 to 1
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const animationStartTime = useRef<number>(0);
  const lastAnimatedPath = useRef<Point[] | null>(null);

  // Undo stack for editor mode
  const [undoStack, setUndoStack] = useState<RoadGraph[]>([]);

  // Load initial road data (temporary for testing)
  useEffect(() => {
    if (selectedMap === 'Erangel') {
      // Type assertion needed as JSON import might be loose
      setRoadGraph(img_roads_Erangel as unknown as RoadGraph);
    } else if (selectedMap === 'Miramar') {
      setRoadGraph(img_roads_Miramar as unknown as RoadGraph);
    } else if (selectedMap === 'Deston') {
      setRoadGraph(img_roads_Deston as unknown as RoadGraph);
    } else if (selectedMap === 'Rondo') {
      setRoadGraph(img_roads_Rondo as unknown as RoadGraph);
    } else if (selectedMap === 'Taego') {
      setRoadGraph(img_roads_Taego as unknown as RoadGraph);
    } else if (selectedMap === 'Vikendi') {
      setRoadGraph(img_roads_Vikendi as unknown as RoadGraph);
    } else {
      setRoadGraph({ nodes: {} });
    }

    // Clear navigator state when map changes
    setNavStart(null);
    setNavEnd(null);
    setNavPath(null);
    setNavDistance(null);
    setPathAnimProgress(0);
    setGlowProgress(0);
    setIsAnimating(false);
    lastAnimatedPath.current = null;
  }, [selectedMap]);

  // Clear Navigator state when switching away from navigator mode
  useEffect(() => {
    if (appMode !== 'navigator') {
      setNavStart(null);
      setNavEnd(null);
      setNavPath(null);
      setNavDistance(null);
      setPathAnimProgress(0);
      setGlowProgress(0);
      setIsAnimating(false);
    }
    if (appMode !== 'editor') {
      setEditorPath(null);
      setSelectedNodeId(null);
    }
  }, [appMode]);

  // Trigger animation when navPath is set
  useEffect(() => {
    if (navPath && navPath.length > 0 && navPath !== lastAnimatedPath.current) {
      lastAnimatedPath.current = navPath;
      setPathAnimProgress(0);
      setGlowProgress(0);
      setIsAnimating(true);
      animationStartTime.current = Date.now();
    }
  }, [navPath]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const DRAW_DURATION = 500; // 500ms for path to draw
    const GLOW_DURATION = 300; // 300ms for glow to travel
    const GLOW_DELAY = 450; // Start glow near end of draw

    let animationFrameId: number;

    const animate = () => {
      const elapsed = Date.now() - animationStartTime.current;

      // Path drawing phase (0-500ms)
      if (elapsed < DRAW_DURATION) {
        setPathAnimProgress(Math.min(elapsed / DRAW_DURATION, 1));
      } else {
        setPathAnimProgress(1);
      }

      // Glow phase (starts at 450ms, lasts 300ms)
      if (elapsed >= GLOW_DELAY) {
        const glowElapsed = elapsed - GLOW_DELAY;
        if (glowElapsed < GLOW_DURATION) {
          setGlowProgress(glowElapsed / GLOW_DURATION);
        } else {
          setGlowProgress(1);
          setIsAnimating(false);
          return;
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isAnimating]);

  // Keyboard shortcuts for editor mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (appMode === 'editor') {
        // ESC to deselect node
        if (e.key === 'Escape') {
          setSelectedNodeId(null);
          setEditorPath(null);
        }

        // Ctrl+Z to undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          if (undoStack.length > 0) {
            const previousState = undoStack[undoStack.length - 1];
            setRoadGraph(previousState);
            setUndoStack(prev => prev.slice(0, -1));
            setSelectedNodeId(null);
            setEditorPath(null);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appMode, undoStack]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    if (theme === 'map') {
      const mapTheme = MAP_THEMES[selectedMap];
      if (mapTheme) {
        document.documentElement.style.setProperty('--map-primary', mapTheme.primary);
        document.documentElement.style.setProperty('--map-secondary', mapTheme.secondary);
        document.documentElement.style.setProperty('--map-accent', mapTheme.accent);
        document.documentElement.style.setProperty('--map-text', mapTheme.text);
      }
    }
  }, [theme, selectedMap]);

  // Derived state for instruction step
  const getStep = () => {
    if (!planeStart) return 0;
    if (!planeEnd) return 1;
    if (!destination) return 2;
    return 3;
  };

  // Resize handler
  // handleResize moved below draw() to fix hoisting issue

  // useEffect for resize moved below handleResize definition

  // Low Res Image Loading
  useEffect(() => {
    setMapError(false);
    setMapImage(null);
    setHighResImage(null);
    setIsHighResLoaded(false);
    setTransform({ x: 0, y: 0, k: 1 }); // Reset zoom on map change

    const src = MAP_IMAGES[selectedMap];
    if (src) {
      const img = new Image();
      img.onload = () => {
        setMapImage(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load low-res map image for ${selectedMap}`);
        setMapError(true);
        setMapImage(null);
      };
      img.src = src;
    }
  }, [selectedMap]);

  // High Res LOD Loading
  useEffect(() => {
    // Only load high res if we are zoomed in sufficiently and haven't loaded it yet
    if (transform.k >= 1.0 && !highResImage && !isHighResLoaded) {
      console.log(`Loading High Res Map for ${selectedMap}...`);
      const src = MAP_IMAGES_HIGH_RES[selectedMap];
      if (src) {
        const img = new Image();
        img.onload = () => {
          console.log(`High Res Map loaded for ${selectedMap}`);
          setHighResImage(img);
          setIsHighResLoaded(true);
        };
        img.src = src;
      }
    }
  }, [transform.k, selectedMap, highResImage, isHighResLoaded]);


  // Coordinate Helper: Screen (Canvas Pixel) -> World (0-1)
  const screenToWorld = (screenX: number, screenY: number, size: number): Point => {
    // Apply inverse transform
    // screenX = worldX * size * k + x
    // worldX = (screenX - x) / (size * k)
    const worldX = (screenX - transform.x) / (size * transform.k);
    const worldY = (screenY - transform.y) / (size * transform.k);
    return { x: worldX, y: worldY };
  };

  // Main Drawing Logic
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const { x, y, k } = transform;

    // Clear entire canvas
    ctx.clearRect(0, 0, size, size);

    // Background fill
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, size, size);

    // Save context for transform
    ctx.save();

    // Apply Zoom/Pan Transform
    ctx.translate(x, y);
    ctx.scale(k, k);

    // 1. Draw Map Background
    const currentMapImage = (isHighResLoaded && k > 1.0) ? highResImage : mapImage;

    if (currentMapImage) {
      // Enable high-quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw image to fill "virtual" world space (0,0) to (size, size)
      ctx.drawImage(currentMapImage, 0, 0, size, size);

      // Contrast overlay (only needed for low-res or consistent style)
      // Reducing effect for high-res to keep details crisp
      if (!isHighResLoaded) {
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.15;
        ctx.drawImage(currentMapImage, 0, 0, size, size);
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      }

      // Dark overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(0, 0, size, size);
    } else {
      if (mapError) {
        // ... Error drawing code (drawn in screen space or untransformed?)
        // Actually better to draw error text *ignoring* transform so it's readable
        // We'll handle this after restore()
      }
    }

    // SCALING FACTOR FOR UI ELEMENTS
    // We want lines and text to stay relatively consistent in screen size,
    // or slightly scale but not become huge. 
    // Dividing by k keeps them absolute screen size. 
    // Dividing by Math.sqrt(k) makes them grow slightly but not as fast as the map.
    // Let's keep them mostly screen-constant for readability.
    const uiScale = 1 / k;

    // Draw Grid Lines
    const mapMeters = MAP_DATA[selectedMap];

    // 100m grid
    const smallGridMeters = 100;
    const smallGridCount = mapMeters / smallGridMeters;
    const smallStep = size / smallGridCount;

    // Only draw small grid if zoomed in enough to see it
    if (k * smallStep > 3) { // Only draw if grid cells are > 3px wide
      ctx.strokeStyle = COLORS.GRID_MINOR;
      ctx.lineWidth = 0.5 * uiScale;

      ctx.beginPath();
      for (let i = 0; i <= smallGridCount; i++) {
        const pos = i * smallStep;
        ctx.moveTo(pos, 0); ctx.lineTo(pos, size);
        ctx.moveTo(0, pos); ctx.lineTo(size, pos);
      }
      ctx.stroke();
    }

    // 1km grid
    const gridSizeMeters = 1000;
    const gridCount = mapMeters / gridSizeMeters;
    const step = size / gridCount;

    ctx.strokeStyle = COLORS.GRID_MAJOR;
    ctx.lineWidth = 1 * uiScale;

    ctx.beginPath();
    for (let i = 0; i <= gridCount; i++) {
      const pos = i * step;
      ctx.moveTo(pos, 0); ctx.lineTo(pos, size);
      ctx.moveTo(0, pos); ctx.lineTo(size, pos);
    }
    ctx.stroke();

    // Labels (A-H, 1-8)
    const letters = 'ABCDEFGHIJKLMNOP'.slice(0, gridCount);
    const labelOffset = 12 * uiScale;
    ctx.font = `bold ${10 * uiScale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < gridCount; i++) {
      const cellCenter = (i + 0.5) * step;
      // Top letters
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText(letters[i], cellCenter, labelOffset);
      // Left numbers
      ctx.fillText((i + 1).toString(), labelOffset, cellCenter);
    }

    // Special Locations
    const specialLocs = SPECIAL_LOCATIONS[selectedMap];
    if (specialLocs) {
      for (const loc of specialLocs) {
        const locX = loc.x * size;
        const locY = loc.y * size;
        const locRadiusX = loc.radius * size;
        const locRadiusY = (loc.radiusY || loc.radius) * size;

        ctx.beginPath();
        if (loc.radiusY) {
          ctx.ellipse(locX, locY, locRadiusX, locRadiusY, 0, 0, Math.PI * 2);
        } else {
          ctx.arc(locX, locY, locRadiusX, 0, Math.PI * 2);
        }

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.lineWidth = 2 * uiScale;
        ctx.setLineDash([5 * uiScale, 5 * uiScale]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(251, 191, 36, 0.06)';
        ctx.fill();

        // Label
        ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
        ctx.font = `bold ${9 * uiScale}px sans-serif`;
        // Position label above the top edge of the ellipse
        ctx.fillText(loc.name, locX, locY - locRadiusY - (8 * uiScale));
        ctx.fillText('(600m)', locX, locY + locRadiusY + (10 * uiScale));
      }
    }

    // RULER MODE DRAWING
    if (appMode === 'ruler') {
      if (rulerStart) {
        const startX = rulerStart.x * size;
        const startY = rulerStart.y * size;

        // Draw Start Point
        ctx.beginPath();
        ctx.arc(startX, startY, 4 * uiScale, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b'; // Amber
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1 * uiScale;
        ctx.stroke();

        if (rulerEnd) {
          const endX = rulerEnd.x * size;
          const endY = rulerEnd.y * size;

          // Draw Line
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2 * uiScale;
          ctx.setLineDash([5 * uiScale, 5 * uiScale]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw End Point
          ctx.beginPath();
          ctx.arc(endX, endY, 4 * uiScale, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1 * uiScale;
          ctx.stroke();

          // Draw Distance Label (Midpoint)
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          const dx = endX - startX;
          const dy = endY - startY;
          // World distance calculation
          const worldDx = rulerEnd.x - rulerStart.x;
          const worldDy = rulerEnd.y - rulerStart.y;
          const distWorld = Math.sqrt(worldDx * worldDx + worldDy * worldDy);
          const distMeters = distWorld * mapMeters;

          ctx.fillStyle = 'white';
          ctx.font = `bold ${12 * uiScale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label = `${Math.round(distMeters)}m`;
          // Add simple background for text
          const textMetrics = ctx.measureText(label);
          const pad = 4 * uiScale;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(midX - textMetrics.width / 2 - pad, midY - 8 * uiScale - pad, textMetrics.width + pad * 2, 16 * uiScale + pad * 2);

          ctx.fillStyle = '#f59e0b';
          ctx.fillText(label, midX, midY);

        }
      }
    }
    if (appMode === 'editor') {
      const nodeSize = 3 * uiScale;

      // Draw Edges
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6'; // Blue-500
      ctx.lineWidth = 2 * uiScale;
      Object.values(roadGraph.nodes).forEach((node: RoadNode) => {
        node.connections.forEach(connId => {
          const target = roadGraph.nodes[connId];
          if (target) {
            ctx.moveTo(node.x * size, node.y * size);
            ctx.lineTo(target.x * size, target.y * size);
          }
        });
      });
      ctx.stroke();

      // Draw Nodes
      Object.values(roadGraph.nodes).forEach((node: RoadNode) => {
        ctx.beginPath();
        ctx.arc(node.x * size, node.y * size, nodeSize, 0, Math.PI * 2);
        ctx.fillStyle = selectedNodeId === node.id ? '#f59e0b' : '#ef4444'; // Amber (Selected) vs Red
        ctx.fill();
      });
    }

    // DRAWER: Navigation    // Draw Road Graph (Editor Mode or if needed)
    // ... existing road drawing code ...

    // Draw Navigator Path with Animation
    if (navPath && navPath.length > 1) {
      // Calculate total path length for animation
      let totalPathLength = 0;
      const segmentLengths: number[] = [];
      for (let i = 0; i < navPath.length - 1; i++) {
        const dx = (navPath[i + 1].x - navPath[i].x) * size;
        const dy = (navPath[i + 1].y - navPath[i].y) * size;
        const segLen = Math.sqrt(dx * dx + dy * dy);
        segmentLengths.push(segLen);
        totalPathLength += segLen;
      }

      // Calculate how much of the path to draw based on animation progress
      const drawLength = totalPathLength * pathAnimProgress;
      let drawnLength = 0;

      ctx.strokeStyle = '#a855f7'; // Purple-500
      ctx.lineWidth = 3 * uiScale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const start = navPath[0];
      const roadStart = navPath[1];
      const roadEnd = navPath[navPath.length - 2];
      const end = navPath[navPath.length - 1];

      // Helper function to draw a segment up to a certain length
      const drawSegment = (p1: Point, p2: Point, maxLength: number, isDashed: boolean) => {
        const dx = (p2.x - p1.x) * size;
        const dy = (p2.y - p1.y) * size;
        const segLen = Math.sqrt(dx * dx + dy * dy);

        if (maxLength <= 0) return 0;

        const drawRatio = Math.min(maxLength / segLen, 1);
        const endX = p1.x * size + dx * drawRatio;
        const endY = p1.y * size + dy * drawRatio;

        // Add glow effect to the line
        ctx.shadowBlur = 10 * uiScale;
        ctx.shadowColor = 'rgba(168, 85, 247, 0.6)'; // Purple glow

        ctx.beginPath();
        if (isDashed) {
          ctx.setLineDash([8 * uiScale, 8 * uiScale]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.moveTo(p1.x * size, p1.y * size);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        return segLen * drawRatio;
      };

      if (navPath.length > 2) {
        // Off-road start
        const seg0Len = segmentLengths[0];
        const drawn0 = drawSegment(start, roadStart, drawLength - drawnLength, true);
        drawnLength += drawn0;

        // On-road segments
        if (drawnLength < drawLength) {
          ctx.setLineDash([]);
          ctx.shadowBlur = 10 * uiScale;
          ctx.shadowColor = 'rgba(168, 85, 247, 0.6)'; // Purple glow

          ctx.beginPath();
          ctx.moveTo(roadStart.x * size, roadStart.y * size);

          for (let i = 1; i < navPath.length - 2; i++) {
            const segLen = segmentLengths[i];
            if (drawnLength + segLen <= drawLength) {
              ctx.lineTo(navPath[i + 1].x * size, navPath[i + 1].y * size);
              drawnLength += segLen;
            } else {
              // Partial segment
              const remaining = drawLength - drawnLength;
              const ratio = remaining / segLen;
              const dx = (navPath[i + 1].x - navPath[i].x) * size;
              const dy = (navPath[i + 1].y - navPath[i].y) * size;
              const endX = navPath[i].x * size + dx * ratio;
              const endY = navPath[i].y * size + dy * ratio;
              ctx.lineTo(endX, endY);
              drawnLength += remaining;
              break;
            }
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // Reset shadow
        }

        // Off-road end
        if (drawnLength < drawLength) {
          const lastSegIdx = navPath.length - 2;
          drawSegment(roadEnd, end, drawLength - drawnLength, true);
        }
      } else {
        // Direct straight line (Start -> End)
        drawSegment(start, end, drawLength, true);
      }

      // Draw glow effect
      if (glowProgress > 0 && pathAnimProgress > 0) {
        const glowPosition = totalPathLength * glowProgress;
        let currentLength = 0;

        // Find which segment the glow is on
        for (let i = 0; i < navPath.length - 1; i++) {
          const segLen = segmentLengths[i];
          if (currentLength + segLen >= glowPosition) {
            // Glow is on this segment
            const segProgress = (glowPosition - currentLength) / segLen;
            const p1 = navPath[i];
            const p2 = navPath[i + 1];
            const glowX = (p1.x + (p2.x - p1.x) * segProgress) * size;
            const glowY = (p1.y + (p2.y - p1.y) * segProgress) * size;

            // Draw glow circle
            const glowRadius = 15 * uiScale; // Increased from 8
            const gradient = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowRadius);

            // Brighter glow with white core, dimmer after animation completes
            const glowAlpha = glowProgress >= 1 ? 0.6 : 1.0; // Increased from 0.4/0.8
            gradient.addColorStop(0, `rgba(255, 255, 255, ${glowAlpha})`); // White core
            gradient.addColorStop(0.3, `rgba(200, 150, 255, ${glowAlpha})`); // Light purple
            gradient.addColorStop(0.6, `rgba(168, 85, 247, ${glowAlpha * 0.7})`); // Purple
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(glowX, glowY, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            break;
          }
          currentLength += segLen;
        }
      }

      ctx.setLineDash([]); // Reset
    }

    // Draw Start/End Markers for Navigator
    if (navStart) {
      const sx = navStart.x * size;
      const sy = navStart.y * size;
      ctx.fillStyle = '#22c55e'; // Green-500
      ctx.beginPath();
      ctx.arc(sx, sy, 6 * uiScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 * uiScale;
      ctx.stroke();
    }
    if (navEnd) {
      const ex = navEnd.x * size;
      const ey = navEnd.y * size;
      ctx.fillStyle = '#ef4444'; // Red-500
      ctx.beginPath();
      ctx.arc(ex, ey, 6 * uiScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 * uiScale;
      ctx.stroke();

      // Display distance if available
      if (navDistance !== null) {
        ctx.fillStyle = 'white';
        ctx.font = `bold ${14 * uiScale}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 3 * uiScale;
        const distText = `${Math.round(navDistance)}m`;
        ctx.strokeText(distText, ex + (10 * uiScale), ey);
        ctx.fillText(distText, ex + (10 * uiScale), ey);
      }
    }
    // DRAWER: Editor Path (Editor Mode only)
    if (appMode === 'editor' && editorPath && editorPath.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#8b5cf6'; // Violet-500
      ctx.lineWidth = 4 * uiScale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < editorPath.length - 1; i++) {
        const n1 = roadGraph.nodes[editorPath[i]] as RoadNode;
        const n2 = roadGraph.nodes[editorPath[i + 1]] as RoadNode;
        if (n1 && n2) {
          if (i === 0) ctx.moveTo(n1.x * size, n1.y * size);
          ctx.lineTo(n2.x * size, n2.y * size);
        }
      }
      ctx.stroke();
    }

    // DROP MODE DRAWING
    if (appMode === 'drop') {
      // 2. Draw Plane Path
      if (planeStart) {
        const startX = planeStart.x * size;
        const startY = planeStart.y * size;

        if (planeEnd) {
          const endX = planeEnd.x * size;
          const endY = planeEnd.y * size;

          // Draw Fly Range Gradient (Green Zone)
          const rangeMeters = getFlyDistance(selectedMap);
          const rangeUnits = rangeMeters / mapMeters; // Convert meters to 0-1 coords
          const rangePx = rangeUnits * size; // Convert to pixels

          const dx = endX - startX;
          const dy = endY - startY;
          const pathLen = Math.sqrt(dx * dx + dy * dy);

          if (pathLen > 0) {
            const perpX = -dy / pathLen;
            const perpY = dx / pathLen;

            ctx.save();
            ctx.beginPath();
            // Use dynamic rangePx instead of hardcoded 800m
            ctx.moveTo(startX + perpX * rangePx, startY + perpY * rangePx);
            ctx.lineTo(endX + perpX * rangePx, endY + perpY * rangePx);
            ctx.lineTo(endX - perpX * rangePx, endY - perpY * rangePx);
            ctx.lineTo(startX - perpX * rangePx, startY - perpY * rangePx);
            ctx.closePath();

            const gradient = ctx.createLinearGradient(
              startX, startY - rangePx,
              startX, startY + rangePx
            );
            gradient.addColorStop(0, 'rgba(34, 197, 94, 0)');
            gradient.addColorStop(0.3, 'rgba(34, 197, 94, 0.08)');
            gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.12)');
            gradient.addColorStop(0.7, 'rgba(34, 197, 94, 0.08)');
            gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

            ctx.fillStyle = COLORS.RANGE_FILL;
            ctx.fill();

            // Range boundary lines
            ctx.setLineDash([4 * uiScale, 4 * uiScale]);
            ctx.strokeStyle = COLORS.RANGE_STROKE;
            ctx.lineWidth = 1 * uiScale;

            ctx.beginPath();
            ctx.moveTo(startX + perpX * rangePx, startY + perpY * rangePx);
            ctx.lineTo(endX + perpX * rangePx, endY + perpY * rangePx);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(startX - perpX * rangePx, startY - perpY * rangePx);
            ctx.lineTo(endX - perpX * rangePx, endY - perpY * rangePx);
            ctx.stroke();

            // 600m Shallow Lines (if map range is > 600m)
            if (rangeMeters > 600) {
              const range600Units = 600 / mapMeters;
              const range600Px = range600Units * size;

              ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)'; // Amber/Yellow
              ctx.lineWidth = 1 * uiScale;

              ctx.beginPath();
              ctx.moveTo(startX + perpX * range600Px, startY + perpY * range600Px);
              ctx.lineTo(endX + perpX * range600Px, endY + perpY * range600Px);
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(startX - perpX * range600Px, startY - perpY * range600Px);
              ctx.lineTo(endX - perpX * range600Px, endY - perpY * range600Px);
              ctx.stroke();
            }

            ctx.setLineDash([]);
            ctx.restore();
          }

          // Draw flight path line
          ctx.beginPath();
          ctx.setLineDash([10 * uiScale, 10 * uiScale]);
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = COLORS.PLANE_PATH;
          ctx.lineWidth = 2 * uiScale;
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw End Point
          ctx.beginPath();
          ctx.arc(endX, endY, 4 * uiScale, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.PLANE_PATH;
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1 * uiScale;
          ctx.stroke();
        }

        // Draw Start Point
        ctx.beginPath();
        ctx.arc(startX, startY, 4 * uiScale, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.PLANE_PATH;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1 * uiScale;
        ctx.stroke();
      }

      // 3. Draw Destination
      if (destination) {
        const destX = destination.x * size;
        const destY = destination.y * size;

        const xSize = 8 * uiScale;
        ctx.beginPath();
        ctx.moveTo(destX - xSize, destY - xSize);
        ctx.lineTo(destX + xSize, destY + xSize);
        ctx.moveTo(destX + xSize, destY - xSize);
        ctx.lineTo(destX - xSize, destY + xSize);
        ctx.strokeStyle = COLORS.DESTINATION;
        ctx.lineWidth = 3 * uiScale;
        ctx.stroke();
      }

      // 4. Draw Calculations
      if (planeStart && planeEnd && destination) {
        const calc = calculateDropParams(planeStart, planeEnd, destination, MAP_DATA[selectedMap], selectedMap);

        if (calc) {
          setStats({
            distance: calc.distanceToTarget,
            perpDist: calc.distancePerp,
            jumpDistanceRule: calc.jumpDistanceRule,
            isReachable: calc.isReachable,
            strategy: calc.strategy
          });

          const jX = calc.jumpPoint.x * size;
          const jY = calc.jumpPoint.y * size;
          const dX = calc.divePoint.x * size;
          const dY = calc.divePoint.y * size;
          const destX = destination.x * size;
          const destY = destination.y * size;

          // Trajectory
          ctx.beginPath();
          ctx.moveTo(jX, jY);
          ctx.lineTo(destX, destY);
          ctx.strokeStyle = calc.isReachable ? 'rgba(255, 255, 255, 0.6)' : 'rgba(239, 68, 68, 0.6)';
          ctx.lineWidth = 2 * uiScale;
          ctx.stroke();

          // Jump Point
          ctx.beginPath();
          ctx.arc(jX, jY, 6 * uiScale, 0, Math.PI * 2);
          ctx.fillStyle = calc.isReachable ? COLORS.JUMP_POINT : '#ef4444';
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2 * uiScale;
          ctx.stroke();

          // Label Jump
          ctx.fillStyle = 'white';
          ctx.font = `bold ${12 * uiScale}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`JUMP (${calc.jumpDistanceRule}m)`, jX + (10 * uiScale), jY);

          // Dive Point
          if (calc.isReachable) {
            const tSize = 6 * uiScale;
            ctx.beginPath();
            ctx.moveTo(dX, dY - tSize);
            ctx.lineTo(dX + tSize, dY + tSize);
            ctx.lineTo(dX - tSize, dY + tSize);
            ctx.closePath();
            ctx.fillStyle = COLORS.DIVE_POINT;
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.stroke();

            let diveLabel = "DIVE";
            if (selectedMap === 'Sanhok') diveLabel = "DIVE (100m)";
            else if (selectedMap === 'Karakin') diveLabel = "DIVE (115m)";
            else diveLabel = "DIVE (120m)";

            ctx.fillStyle = COLORS.DIVE_POINT;
            ctx.fillText(diveLabel, dX + (10 * uiScale), dY);
          }
        }
      } else {
        setStats({ distance: null, perpDist: null, jumpDistanceRule: null, isReachable: null, strategy: null });
      }
    } // End Drop Mode

    // Pop context
    ctx.restore();

    // Draw Map Error if exists (Overlay, screen space)
    if (mapError && !mapImage) {
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('Map Image Failed to Load', size / 2, size / 2);
    }
  }, [planeStart, planeEnd, destination, selectedMap, mapImage, highResImage, isHighResLoaded, mapError, transform, appMode, rulerStart, rulerEnd, roadGraph, selectedNodeId, editorPath, navStart, navEnd, navPath, navDistance, pathAnimProgress, glowProgress]);

  // Effect to trigger draw
  useEffect(() => {
    draw();
  }, [draw]);

  // Resize handler - defined AFTER draw to maintain dependency order
  const handleResize = useCallback(() => {
    if (canvasRef.current) {
      // Use clientWidth/Height to match the visual size exactly
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;

      // Avoid resizing if dimensions haven't changed to prevent flicker/reset
      if (canvasRef.current.width !== width || canvasRef.current.height !== height) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        draw();
      }
    }
  }, [draw]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // --- Interaction Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    // Calculate scale factor
    const scaleFactor = 1.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    let newK = transform.k * (direction > 0 ? scaleFactor : 1 / scaleFactor);

    // Limit zoom
    newK = Math.min(Math.max(newK, 1), 8); // Max 8x zoom

    // Calculate mouse pos relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // We want the point under the mouse to remain fixed
    // NewX = mx - (mx - OldX) * (newK / oldK)
    const newX = mx - (mx - transform.x) * (newK / transform.k);
    const newY = my - (my - transform.y) * (newK / transform.k);

    // Constrain panning to keep map in view
    // The visual width is size * newK
    // x must be between size - size*newK and 0
    const size = canvasRef.current.width; // Assuming square
    const minX = size * (1 - newK);
    const minY = size * (1 - newK);

    setTransform({
      k: newK,
      x: Math.min(0, Math.max(minX, newX)),
      y: Math.min(0, Math.max(minY, newY))
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or space+click for pan
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
    // Left click in brush mode also enables dragging
    else if (e.button === 0 && appMode === 'editor' && brushMode) {
      setIsDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Brush mode: create nodes while dragging in editor mode
    if (appMode === 'editor' && brushMode && e.buttons === 1 && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.k;
      const y = (e.clientY - rect.top - transform.y) / transform.k;
      const size = canvasRef.current.width || 1000;
      const p = { x: x / size, y: y / size };
      // Only create node if we've moved enough distance from last position
      const minDistance = 0.01875; // Minimum distance in normalized coordinates (~150m on 8km map)

      if (!lastBrushPos ||
        Math.sqrt((p.x - lastBrushPos.x) ** 2 + (p.y - lastBrushPos.y) ** 2) >= minDistance) {

        // Save to undo stack only on first brush stroke
        if (!lastBrushNodeId) {
          saveToUndoStack();
        }

        const newNodeId = Date.now().toString();
        const newNode: RoadNode = {
          id: newNodeId,
          x: p.x,
          y: p.y,
          connections: []
        };

        setRoadGraph(prev => {
          const next = { ...prev, nodes: { ...prev.nodes } };
          next.nodes[newNodeId] = newNode;

          // Connect to last brush node if exists
          if (lastBrushNodeId && prev.nodes[lastBrushNodeId]) {
            const lastNode = prev.nodes[lastBrushNodeId];
            next.nodes[lastBrushNodeId] = {
              ...lastNode,
              connections: [...lastNode.connections, newNodeId]
            };
            newNode.connections.push(lastBrushNodeId);
          }

          return next;
        });

        setLastBrushPos(p);
        setLastBrushNodeId(newNodeId);
      }

      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Normal drag behavior for panning
    if (isDragging && lastMousePos.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;

      setTransform(prev => {
        const size = canvasRef.current?.width || 1000;
        const minX = size - size * prev.k;
        const minY = size - size * prev.k;

        return {
          ...prev,
          x: Math.min(0, Math.max(minX, prev.x + dx)),
          y: Math.min(0, Math.max(minY, prev.y + dy))
        };
      });

      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    lastMousePos.current = null;

    // Reset brush mode state
    if (brushMode) {
      setLastBrushPos(null);
      setLastBrushNodeId(null);
    }
  };

  // Click handler wrapper to distinguish drag vs click
  // Ideally, use a small threshold. For now, simple logic:
  // If we move mostly, it's a drag. If we click shortly, it's a click.
  // Actually, standard practice for map apps:
  // MouseDown -> Wait -> MouseUp. If distance moved < threshold, trigger click.
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number, y: number } | null>(null);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setMouseDownPos({ x: e.clientX, y: e.clientY });
    handleMouseDown(e);
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    handleMouseUp(); // Call the simplified handleMouseUp
    if (mouseDownPos) {
      const dist = Math.sqrt((e.clientX - mouseDownPos.x) ** 2 + (e.clientY - mouseDownPos.y) ** 2);
      if (dist < 5) { // Threshold for "Click"
        // DELAY single click to check for Double Click
        // Clear any existing timeout (e.g. from previous click in a fast sequence)
        if (clickTimeout.current) {
          clearTimeout(clickTimeout.current);
          clickTimeout.current = null;
        }

        // Persist event logic (capture necessary data)
        const clickData = {
          clientX: e.clientX,
          clientY: e.clientY,
          button: e.button,
          target: e.target
        };

        // Mock the event for handleCanvasClick since we can't persist the React Synthetic Event easily in Timeout
        // Or just modify handleCanvasClick to take a struct
        clickTimeout.current = setTimeout(() => {
          // We reconstruct a partial event or refactor handleCanvasClick
          // Refactoring handleCanvasClick to take x/y is cleaner, but for now let's mock the event accessor
          const mockEvent = {
            clientX: clickData.clientX,
            clientY: clickData.clientY,
            button: clickData.button,
            // Add other props if needed by handleCanvasClick
          } as React.MouseEvent;

          handleCanvasClick(mockEvent);
          clickTimeout.current = null;
        }, 200); // 200ms delay to wait for potential Double Click
      }
    }
    setMouseDownPos(null);
  };


  // Helper to save current state to undo stack before making changes
  const saveToUndoStack = () => {
    setUndoStack(prev => {
      const newStack = [...prev, roadGraph];
      // Limit undo stack to 20 items to prevent memory issues
      return newStack.slice(-20);
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('handleCanvasClick triggered', { appMode, isDragging, button: e.button });
    // Ignore if dragging
    if (isDragging) return;

    if (e.button !== 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Convert to world space
    const size = canvas.width;
    const p = screenToWorld(mx, my, size);
    console.log('Click World Point:', p);

    // Bounds check
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return;

    if (appMode === 'ruler') {
      if (!rulerStart) {
        setRulerStart(p);
      } else if (!rulerEnd) {
        setRulerEnd(p);
      } else {
        // Reset and start new
        setRulerStart(p);
        setRulerEnd(null);
      }
    } else if (appMode === 'drop') {
      // Drop mode
      if (!planeStart) {
        setPlaneStart(p);
      } else if (!planeEnd) {
        setPlaneEnd(p);
      } else {
        setPlaneStart(p);
        setPlaneEnd(null);
        setDestination(null);
      }
    } else if (appMode === 'navigator') {
      // Left click only sets start point
      if (!navStart) {
        setNavStart(p);
        setNavPath(null); // Clear previous path
        setNavDistance(null);
      } else {
        // If start exists, left-click resets to new start
        setNavStart(p);
        setNavEnd(null);
        setNavPath(null);
        setNavDistance(null);
      }
    } else if (appMode === 'editor') {
      // Editor Mode Logic
      const clickedNodeId = findNearestNode(roadGraph, p.x, p.y);
      let clickedNode: RoadNode | null = null;

      // Visual check for "clicking on node" - reduced radius to 8px to prevent accidental selection
      if (clickedNodeId) {
        const n = roadGraph.nodes[clickedNodeId];
        const dist = Math.sqrt((n.x - p.x) ** 2 + (n.y - p.y) ** 2);
        if (dist < (8 / size)) {
          clickedNode = n;
        }
      }

      if (clickedNode) {
        // Clicked on an existing node
        if (selectedNodeId === clickedNode.id) {
          // Deselect
          setSelectedNodeId(null);
        } else if (selectedNodeId) {
          // Connect selected to clicked
          const start = roadGraph.nodes[selectedNodeId];
          const end = clickedNode;

          // Add connection bidirectionally if not exists
          if (!start.connections.includes(end.id)) {
            saveToUndoStack();
            setRoadGraph(prev => {
              const next = { ...prev, nodes: { ...prev.nodes } };
              next.nodes[start.id] = { ...start, connections: [...start.connections, end.id] };
              next.nodes[end.id] = { ...end, connections: [...end.connections, start.id] };
              return next;
            });
          }
          // Move selection to new node
          setSelectedNodeId(clickedNode.id);
        } else {
          // Select it
          setSelectedNodeId(clickedNode.id);
        }
      } else {
        // Clicked on empty space -> Create Node
        saveToUndoStack();
        const newNodeId = Date.now().toString();
        const newNode: RoadNode = {
          id: newNodeId,
          x: p.x,
          y: p.y,
          connections: []
        };

        setRoadGraph(prev => {
          const next = { ...prev, nodes: { ...prev.nodes } };
          next.nodes[newNodeId] = newNode;

          // If we had a selected node, connect to it (Extend path)
          if (selectedNodeId && prev.nodes[selectedNodeId]) {
            const start = prev.nodes[selectedNodeId];
            next.nodes[start.id] = { ...start, connections: [...start.connections, newNodeId] };
            newNode.connections.push(start.id);
          }

          return next;
        });

        // Auto select new node to continue chain
        setSelectedNodeId(newNodeId);
      }
    }
  };

  const deleteNode = (nodeId: string) => {
    saveToUndoStack();
    setRoadGraph(prev => {
      const nextNodes = { ...prev.nodes };
      const nodeToDelete = nextNodes[nodeId];

      if (!nodeToDelete) return prev;

      // Remove connections to this node from other nodes
      nodeToDelete.connections.forEach(connectedId => {
        if (nextNodes[connectedId]) {
          nextNodes[connectedId] = {
            ...nextNodes[connectedId],
            connections: nextNodes[connectedId].connections.filter(id => id !== nodeId)
          };
        }
      });

      // Remove the node itself
      delete nextNodes[nodeId];

      return { nodes: nextNodes };
    });

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  // Keyboard controls for deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (appMode === 'editor' && selectedNodeId) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          deleteNode(selectedNodeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appMode, selectedNodeId]);

  const handleSecondaryAction = (p: { x: number, y: number }) => {
    // Bounds check
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return;

    if (appMode === 'ruler') {
      setRulerStart(null);
      setRulerEnd(null);
    } else if (appMode === 'editor') {
      // Deselect
      setSelectedNodeId(null);
    } else if (appMode === 'navigator') {
      // Right-click sets destination and calculates path
      if (navStart) {
        setNavEnd(p);

        // Calculate Path immediately
        if (Object.keys(roadGraph.nodes).length > 0) {
          const startNodeId = findNearestNode(roadGraph, navStart.x, navStart.y);
          const endNodeId = findNearestNode(roadGraph, p.x, p.y);

          if (startNodeId && endNodeId) {
            const roadPathIds = findPath(roadGraph, startNodeId, endNodeId);

            // Construct full path points: Start -> NearestNode -> ... Path ... -> NearestNode -> End
            const points: Point[] = [];
            points.push(navStart);

            // Add road path points
            roadPathIds.forEach(id => {
              const n = roadGraph.nodes[id];
              points.push({ x: n.x, y: n.y });
            });

            points.push(p); // End point
            setNavPath(points);

            // Calculate total distance
            let totalDistance = 0;
            for (let i = 0; i < points.length - 1; i++) {
              const dx = (points[i + 1].x - points[i].x) * 8000; // 8km map
              const dy = (points[i + 1].y - points[i].y) * 8000;
              totalDistance += Math.sqrt(dx * dx + dy * dy);
            }
            setNavDistance(totalDistance);
          }
        }
      }
    } else if (appMode === 'drop') {
      // Drop mode - set destination
      setDestination(p);
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Stop zoom on some browsers

    // Clear the pending single click!
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Convert to world space
    const size = canvas.width;
    const p = screenToWorld(mx, my, size);

    handleSecondaryAction(p);
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Convert to world space
    const size = canvas.width;
    const p = screenToWorld(mx, my, size);

    handleSecondaryAction(p);
  };

  // --- Touch Handlers ---
  const touchState = useRef<{
    dist: number | null;
    center: { x: number, y: number } | null;
    start: { x: number, y: number } | null; // Screen coords of touch start
    last: { x: number, y: number } | null;  // Screen coords of last move
    startTime: number;
    isPinch: boolean;
    isDrawing: boolean; // New flag for drag-to-path
  }>({
    dist: null,
    center: null,
    start: null,
    last: null,
    startTime: 0,
    isPinch: false,
    isDrawing: false
  });

  const getTouchDist = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (t1: React.Touch, t2: React.Touch) => {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent default to stop scrolling/zooming page
    if (e.target === canvasRef.current) e.preventDefault();

    if (e.touches.length === 1) {
      touchState.current.start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchState.current.last = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchState.current.startTime = Date.now();
      touchState.current.isPinch = false;
      touchState.current.isDrawing = false;
    } else if (e.touches.length === 2) {
      touchState.current.dist = getTouchDist(e.touches[0], e.touches[1]);
      touchState.current.center = getTouchCenter(e.touches[0], e.touches[1]);
      touchState.current.last = touchState.current.center;
      touchState.current.isPinch = true;
      touchState.current.isDrawing = false; // Cancel drawing if 2nd finger touches
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.target === canvasRef.current) e.preventDefault();
    if (!canvasRef.current) return;

    if (e.touches.length === 1 && !touchState.current.isPinch) {
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;

      // Check for drag threshold to start drawing
      if (!touchState.current.isDrawing && touchState.current.start) {
        const dx = clientX - touchState.current.start.x;
        const dy = clientY - touchState.current.start.y;
        const moveDist = Math.sqrt(dx * dx + dy * dy);
        if (moveDist > 10) { // Threshold to differentiate tap from drag
          touchState.current.isDrawing = true;

          // Initialize Path Start
          const rect = canvasRef.current.getBoundingClientRect();
          const mx = touchState.current.start.x - rect.left;
          const my = touchState.current.start.y - rect.top;
          const p = screenToWorld(mx, my, canvasRef.current.width);

          // Update State
          setPlaneStart(p);

          // If in Ruler mode, similar logic
          if (appMode === 'ruler') {
            setRulerStart(p);
            setRulerEnd(p); // Init end as start
          } else {
            setPlaneEnd(p); // Init end as start
          }
        }
      }

      if (touchState.current.isDrawing) {
        // Update End Point
        const rect = canvasRef.current.getBoundingClientRect();
        const mx = clientX - rect.left;
        const my = clientY - rect.top;
        const p = screenToWorld(mx, my, canvasRef.current.width);

        // Bounds check for end point
        if (p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) {
          if (appMode === 'ruler') {
            setRulerEnd(p);
          } else {
            setPlaneEnd(p);
          }
        }
      } else {
        // If NOT drawing, we do NOTHING with 1 finger (no pan).
        // User must use 2 fingers to pan.
        // Or maybe we allow pan if not drawing? 
        // Re-reading user request: "instead of clicking two times a user has to press and slide"
        // This implies the 1-finger gesture is claimed by Path Creation.
        // Panning must surrender 1-finger support.
      }

      touchState.current.last = { x: clientX, y: clientY };

    } else if (e.touches.length === 2) {
      // 2 Finger Logic: Pan & Zoom
      const newDist = getTouchDist(e.touches[0], e.touches[1]);
      const newCenter = getTouchCenter(e.touches[0], e.touches[1]);

      if (touchState.current.dist && touchState.current.center && touchState.current.last) {
        // Zoom
        const scale = newDist / touchState.current.dist;
        let newK = transform.k * scale;
        newK = Math.min(Math.max(newK, 1), 8); // Limits

        // Calculate pinch center relative to canvas (Screen Space)
        const rect = canvasRef.current.getBoundingClientRect();
        const cx = touchState.current.center.x - rect.left;
        const cy = touchState.current.center.y - rect.top;

        // New World Pos = Old World Pos (Zoom towards pinch center)
        // newX = cx - (cx - x) * (newK / k)
        const newX = cx - (cx - transform.x) * (newK / transform.k);
        const newY = cy - (cy - transform.y) * (newK / transform.k);

        // Pan (Move center)
        // The center moved from touchState.current.last (old center avg) to newCenter
        // We actually track 'last' as 'current.center' from previous frame if we update it?
        // Actually, let's use the delta of the center point
        const dx = newCenter.x - touchState.current.last.x;
        const dy = newCenter.y - touchState.current.last.y;

        // Apply
        // First zoom centered on old pinch, then apply pan delta
        let finalX = newX + dx;
        let finalY = newY + dy;

        // Constraint
        const size = canvasRef.current.width;
        const minX = size * (1 - newK);
        const minY = size * (1 - newK);
        finalX = Math.min(0, Math.max(minX, finalX));
        finalY = Math.min(0, Math.max(minY, finalY));

        setTransform({ x: finalX, y: finalY, k: newK });
      }

      touchState.current.dist = newDist; // Update dist for next frame incremental zoom
      touchState.current.center = newCenter; // Update center for zoom origin
      touchState.current.last = newCenter;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Tap detection based on movement and time
    // If NOT isDrawing and NOT isPinch and time < 300ms -> Tap
    if (!touchState.current.isPinch && !touchState.current.isDrawing && touchState.current.start && e.touches.length === 0) {
      const dx = (touchState.current.last?.x || 0) - touchState.current.start.x;
      const dy = (touchState.current.last?.y || 0) - touchState.current.start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - touchState.current.startTime;

      if (dist < 10 && duration < 300) {
        // It's a tap
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect && touchState.current.last) {
          const clientX = touchState.current.last.x;
          const clientY = touchState.current.last.y;
          const mx = clientX - rect.left;
          const my = clientY - rect.top;

          // Convert to world space
          const size = canvasRef.current?.width || 1000;
          const p = screenToWorld(mx, my, size);

          // Double Tap logic could be here, or outside.
          // Currently we treat Tap as "Set Point" in desktop? 
          // If we want Double Tap for Dest, we need to track last tap time.
          // But wait, user said "Double-tap dest" in previous instruction.

          handleDoubleTap(p);
        }
      }
    }

    if (e.touches.length === 0) {
      touchState.current.start = null;
      touchState.current.last = null;
      touchState.current.dist = null;
      touchState.current.center = null;
      touchState.current.isPinch = false;
      touchState.current.isDrawing = false;
    }
  };

  // Helper for Double Tap
  const lastTapRef = useRef<{ time: number, p: Point } | null>(null);
  const handleDoubleTap = (p: Point) => {
    const now = Date.now();
    if (lastTapRef.current && (now - lastTapRef.current.time) < 300) {
      // Check distance
      const dx = p.x - lastTapRef.current.p.x;
      const dy = p.y - lastTapRef.current.p.y;
      if (Math.sqrt(dx * dx + dy * dy) < 0.05) { // 5% tolerence
        // Double Tap confirmed
        handleSecondaryAction(p); // Set Dest / Reset Ruler
        lastTapRef.current = null;
        return;
      }
    }
    lastTapRef.current = { time: now, p };
  };

  // Map change handler
  const handleMapChange = (map: string) => {
    setSelectedMap(map);
    setPlaneStart(null);
    setPlaneEnd(null);
    setDestination(null);
    setRulerStart(null);
    setRulerEnd(null);
    setStats({ distance: null, perpDist: null, jumpDistanceRule: null, isReachable: null, strategy: null });
    // Reset editor state? Maybe keep graph if same map?
    // Ideally we load new graph for new map. For now, clear it.
    setRoadGraph({ nodes: {} });
    setEditorPath(null);
    setSelectedNodeId(null);
  };

  const handleExportGraph = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(roadGraph));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `roads_${selectedMap}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Calculate ruler distance for sidebar
  const getRulerDistance = () => {
    if (rulerStart && rulerEnd) {
      const dx = rulerEnd.x - rulerStart.x;
      const dy = rulerEnd.y - rulerStart.y;
      const distWorld = Math.sqrt(dx * dx + dy * dy);
      return distWorld * MAP_DATA[selectedMap];
    }
    return null;
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden relative font-sans" style={{ background: 'var(--bg-primary)' }}>
      {/* Background gradient overlay */}
      <div className="absolute inset-0 opacity-50" style={{ background: 'radial-gradient(ellipse at top right, var(--accent-glow), transparent)' }} />

      <Sidebar
        selectedMap={selectedMap}
        onSelectMap={setSelectedMap}
        stats={stats}
        instructionStep={getStep()}
        theme={theme}
        onThemeChange={setTheme}
        mode={appMode}
        onModeChange={setAppMode}
        rulerDistance={getRulerDistance()}
        navDistance={navDistance}
        brushMode={brushMode}
        onBrushModeChange={setBrushMode}
        onExportGraph={handleExportGraph}
        onDeleteNode={selectedNodeId ? () => deleteNode(selectedNodeId) : undefined}
      />

      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: 'min(94vh, 94vw)', height: 'min(94vh, 94vw)' }}>
          {/* Canvas container */}
          <div className="relative neu-card p-2 rounded-xl h-full overflow-hidden">
            <canvas
              ref={canvasRef}
              onWheel={handleWheel}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleMouseUp}
              onContextMenu={handleCanvasContextMenu}
              onDoubleClick={handleCanvasDoubleClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd} // Handle cancel same as end
              className="rounded-lg w-full h-full cursor-crosshair touch-none" // touch-none is key for preventing browser zoom
              style={{ aspectRatio: '1/1' }}
            />

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
              <button
                className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition"
                onClick={() => setTransform(t => ({ ...t, k: Math.min(t.k * 1.2, 8), x: t.x * 1.2, y: t.y * 1.2 })) /* Simply zoom in center for button */}
              >
                +
              </button>
              <button
                className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition"
                onClick={() => setTransform({ x: 0, y: 0, k: 1 })}
              >
                R
              </button>
            </div>
            {/* Loading Indicator for High Res */}
            {transform.k >= 1.0 && !isHighResLoaded && (
              <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm animate-pulse">
                Loading Detail...
              </div>
            )}
          </div>

          {/* Map name badge */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 neu-card rounded-full text-sm font-semibold pointer-events-none" style={{ color: 'var(--text-primary)' }}>
            {selectedMap}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
