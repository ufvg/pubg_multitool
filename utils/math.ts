import { Point } from '../types';
import {
  MAP_DATA,
  getJumpDistance,
  DIVE_DISTANCE_SANHOK,
  DIVE_DISTANCE_KARAKIN,
  DIVE_DISTANCE_DEFAULT,
  MAX_GLIDE_DISTANCE
} from '../constants';

// Helper: Distance between two points (Unit coords)
export const getDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Helper: Vector subtraction
export const subtract = (p1: Point, p2: Point): Point => ({
  x: p1.x - p2.x,
  y: p1.y - p2.y
});

// Helper: Vector addition
export const add = (p1: Point, p2: Point): Point => ({
  x: p1.x + p2.x,
  y: p1.y + p2.y
});

// Helper: Multiply vector by scalar
export const scale = (p: Point, s: number): Point => ({
  x: p.x * s,
  y: p.y * s
});

// Helper: Normalize vector
export const normalize = (p: Point): Point => {
  const len = Math.sqrt(p.x * p.x + p.y * p.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: p.x / len, y: p.y / len };
};

// Helper: Dot product
export const dot = (p1: Point, p2: Point): number => {
  return p1.x * p2.x + p1.y * p2.y;
};

// Strategy types
export type DropStrategy = 'STANDARD' | 'SLOW_GLIDE' | 'SANHOK' | 'KARAKIN' | 'SPECIAL' | 'TOO_FAR';

/**
 * Find the point on the flight path where distance to target equals jumpDistance.
 * Returns the point closest to planeStart (earliest jump opportunity)
 */
const findJumpPointAtDistance = (
  planeStart: Point,
  pathDir: Point,
  destination: Point,
  jumpDistanceUnits: number
): Point | null => {
  const D = subtract(planeStart, destination);
  const dotDP = dot(D, pathDir);
  const D2 = D.x * D.x + D.y * D.y;
  const r2 = jumpDistanceUnits * jumpDistanceUnits;

  const a = 1;
  const b = 2 * dotDP;
  const c = D2 - r2;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null;
  }

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  let t: number;
  if (t1 >= 0) {
    t = t1;
  } else if (t2 >= 0) {
    t = t2;
  } else {
    return null;
  }

  return {
    x: planeStart.x + pathDir.x * t,
    y: planeStart.y + pathDir.y * t
  };
};

/**
 * Find the perpendicular point (closest point on flight path to destination)
 */
const findPerpPoint = (
  planeStart: Point,
  pathDir: Point,
  destination: Point
): Point => {
  const destVector = subtract(destination, planeStart);
  const t = dot(destVector, pathDir);
  return {
    x: planeStart.x + pathDir.x * t,
    y: planeStart.y + pathDir.y * t
  };
};

// Core Calculation - Distance-based jump point with dynamic rules
export const calculateDropParams = (
  planeStart: Point,
  planeEnd: Point,
  destination: Point,
  mapSizeMeters: number,
  mapName: string
) => {
  // 1. Get flight path direction
  const pathVector = subtract(planeEnd, planeStart);
  const pathLength = Math.sqrt(pathVector.x ** 2 + pathVector.y ** 2);

  if (pathLength === 0) return null;

  const pathDir = normalize(pathVector);

  // 2. Calculate perpendicular point and distance first
  const perpPoint = findPerpPoint(planeStart, pathDir, destination);
  const perpDistMeters = getDistance(perpPoint, destination) * mapSizeMeters;

  // 3. Get jump distance rule based on map, location, AND perpendicular distance
  const { distance: jumpDistanceMeters, technique } = getJumpDistance(
    mapName,
    destination.x,
    destination.y,
    perpDistMeters
  );

  // 4. Map technique to strategy
  const strategy: DropStrategy = technique;

  // 5. Determine jump point based on strategy
  let jumpPoint: Point;
  let isReachable = true;

  if (strategy === 'SLOW_GLIDE' || strategy === 'TOO_FAR') {
    // For slow glide or too far: jump at perpendicular point
    jumpPoint = perpPoint;
    isReachable = strategy !== 'TOO_FAR';
  } else {
    // Standard, Sanhok, or Special: find point at exact jump distance
    const jumpDistanceUnits = jumpDistanceMeters / mapSizeMeters;
    const foundPoint = findJumpPointAtDistance(planeStart, pathDir, destination, jumpDistanceUnits);

    if (foundPoint) {
      jumpPoint = foundPoint;
    } else {
      // Fallback to perpendicular if no exact point found
      jumpPoint = perpPoint;
      isReachable = perpDistMeters <= MAX_GLIDE_DISTANCE;
    }
  }

  // 6. Calculate dive point
  const jumpToDestDir = normalize(subtract(destination, jumpPoint));
  let diveDistanceMeters = DIVE_DISTANCE_DEFAULT; // 120m default

  if (mapName === 'Sanhok') {
    diveDistanceMeters = DIVE_DISTANCE_SANHOK; // 100m
  } else if (mapName === 'Karakin') {
    diveDistanceMeters = DIVE_DISTANCE_KARAKIN; // 115m
  } else if (strategy === 'SLOW_GLIDE') {
    diveDistanceMeters = DIVE_DISTANCE_DEFAULT; // 120m
  }

  const diveOffsetUnits = diveDistanceMeters / mapSizeMeters;
  const divePoint: Point = {
    x: destination.x - jumpToDestDir.x * diveOffsetUnits,
    y: destination.y - jumpToDestDir.y * diveOffsetUnits
  };

  // 7. Actual distance from jump point to target
  const distanceToTarget = getDistance(jumpPoint, destination) * mapSizeMeters;

  return {
    jumpPoint,
    divePoint,
    perpPoint,
    distanceToTarget,
    distancePerp: perpDistMeters,
    jumpDistanceRule: jumpDistanceMeters,
    isReachable,
    strategy
  };
};
