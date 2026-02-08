export interface Point {
  x: number;
  y: number;
}

export interface CalculationResult {
  jumpPoint: Point;
  divePoint: Point;
  distanceToTarget: number; // Meters
  timeToImpact: number; // Seconds (estimate)
  isValid: boolean;
}

export type AppMode = 'drop' | 'ruler' | 'editor' | 'navigator';

export interface MapGraph {
  nodes: { [id: string]: { id: string; x: number; y: number; connections: string[] } };
}