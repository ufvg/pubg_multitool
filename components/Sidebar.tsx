import React from 'react';
import { MAP_DATA, MAX_GLIDE_DISTANCE, roundDistance, ThemeMode } from '../constants';
import { DropStrategy } from '../utils/math';
import { AppMode } from '../types';

interface SidebarProps {
  selectedMap: string;
  onSelectMap: (map: string) => void;
  stats: {
    distance: number | null;
    perpDist: number | null;
    jumpDistanceRule: number | null;
    isReachable: boolean | null;
    strategy: DropStrategy | null;
  };
  instructionStep: number;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  rulerDistance: number | null;
  navDistance: number | null;
  brushMode?: boolean;
  onBrushModeChange?: (enabled: boolean) => void;
  onExportGraph?: () => void;
  onDeleteNode?: () => void;
}

const getStrategyConfig = (strategy: DropStrategy): { label: string; color: string; bgClass: string; borderClass: string; icon: string } => {
  switch (strategy) {
    case 'STANDARD':
      return { label: 'Standard Drop', color: 'text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/30', icon: '🎯' };
    case 'SLOW_GLIDE':
      return { label: 'Slow Glide', color: 'text-orange-400', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/30', icon: '🪂' };
    case 'SANHOK':
      return { label: 'Sanhok Style', color: 'text-cyan-400', bgClass: 'bg-cyan-500/10', borderClass: 'border-cyan-500/30', icon: '🌴' };
    case 'KARAKIN':
      return { label: 'Karakin Style', color: 'text-violet-400', bgClass: 'bg-violet-500/10', borderClass: 'border-violet-500/30', icon: '🏜️' };
    case 'SPECIAL':
      return { label: 'Special Zone', color: 'text-amber-400', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/30', icon: '⭐' };
    case 'TOO_FAR':
      return { label: 'Too Far', color: 'text-red-400', bgClass: 'bg-red-500/10', borderClass: 'border-red-500/30', icon: '⚠️' };
  }
};

const StatusStep: React.FC<{ step: number; currentStep: number; label: string }> = ({ step, currentStep, label }) => {
  const isActive = currentStep === step;
  const isCompleted = currentStep > step;

  return (
    <div className={`flex items-center gap-3 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-50'}`}>
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
        transition-all duration-300
        ${isCompleted ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
          isActive ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse-slow' :
            'bg-neutral-800 text-neutral-500'}
      `}>
        {isCompleted ? '✓' : step + 1}
      </div>
      <span className={`text-sm ${isActive ? 'text-white font-medium' : 'text-neutral-400'}`}>{label}</span>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  selectedMap,
  onSelectMap,
  stats,
  instructionStep,
  theme,
  onThemeChange,
  mode,
  onModeChange,
  rulerDistance,
  navDistance,
  brushMode,
  onBrushModeChange,
  onExportGraph,
  onDeleteNode
}) => {
  const strategyConfig = stats.strategy ? getStrategyConfig(stats.strategy) : null;
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <>
      {/* Sidebar Container */}
      <div className={`
        neu-card z-[9999] transition-all duration-300
        /* Desktop Styles */
        md:absolute md:top-4 md:left-4 md:w-80 md:p-6 md:max-h-[calc(100vh-32px)] md:overflow-y-auto md:rounded-2xl md:translate-y-0 md:z-50
        md:h-auto md:bottom-auto md:right-auto md:cursor-auto md:hover:bg-transparent
        /* Mobile Styles (Bottom Menu) */
        fixed bottom-0 left-0 right-0 w-full rounded-t-2xl rounded-b-none 
        ${isMobileOpen
          ? 'h-[85vh] overflow-y-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,20px))]'
          : 'h-[calc(5rem+env(safe-area-inset-bottom,20px))] p-4 pb-[calc(1rem+env(safe-area-inset-bottom,20px))] cursor-pointer hover:bg-neutral-800/50'
        }
      `}
        onClick={(e) => {
          // Only toggle on mobile and if not clicking interactive elements
          if (window.innerWidth < 768) {
            // If closed, open it. If open, only toggle if clicking the header area (approx, distinct from buttons)
            if (!isMobileOpen) {
              setIsMobileOpen(true);
            }
          }
        }}
      >
        {/* Mobile Handle / Indicator */}
        <div
          className="md:hidden w-12 h-1 bg-neutral-600 rounded-full mx-auto mb-4"
          onClick={(e) => {
            // Explicit toggle handle
            e.stopPropagation();
            setIsMobileOpen(!isMobileOpen);
          }}
        />

        {/* Header (Always Visible on Mobile) */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg animate-float shrink-0">
            <span className="text-2xl">🪂</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold gradient-text truncate">PUBG Drop Calc</h1>
            <p className="text-xs text-neutral-500 truncate">
              {isMobileOpen ? "Optimal landing assistant" : `Current Map: ${selectedMap}`}
            </p>
          </div>
          {/* Mobile Expand/Collapse Icon */}
          <div className="md:hidden text-neutral-400">
            {isMobileOpen ? '▼' : '▲'}
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
            Theme
          </label>
          <div className="theme-toggle">
            <button
              className={theme === 'dark' ? 'active' : ''}
              onClick={() => onThemeChange('dark')}
            >
              🌙 Dark
            </button>
            <button
              className={theme === 'light' ? 'active' : ''}
              onClick={() => onThemeChange('light')}
            >
              ☀️ Light
            </button>
            <button
              className={theme === 'map' ? 'active' : ''}
              onClick={() => onThemeChange('map')}
            >
              🗺️ Map
            </button>
          </div>
        </div>

        {/* Map Selector */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
            Select Map
          </label>
          <div className="neu-inset p-1">
            <select
              value={selectedMap}
              onChange={(e) => onSelectMap(e.target.value)}
              className="w-full bg-transparent border-none px-4 py-3 text-sm focus:ring-0 cursor-pointer"
              style={{ color: 'var(--text-primary)' }}
            >
              {Object.keys(MAP_DATA).map((map) => (
                <option key={map} value={map} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  {map} ({MAP_DATA[map] / 1000}km × {MAP_DATA[map] / 1000}km)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex p-1 rounded-xl bg-neutral-900 mb-6 border border-neutral-700/50">
          <button
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${mode === 'drop'
              ? 'bg-neutral-700 text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-400'
              }`}
            onClick={() => onModeChange('drop')}
          >
            Calc
          </button>
          <button
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${mode === 'ruler'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-400'
              }`}
            onClick={() => onModeChange('ruler')}
          >
            Ruler
          </button>
          <button
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${mode === 'editor'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-400'
              }`}
            onClick={() => onModeChange('editor')}
          >
            Editor
          </button>
          <button
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${mode === 'navigator'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-400'
              }`}
            onClick={() => onModeChange('navigator')}
          >
            Nav
          </button>
        </div>

        {mode === 'editor' ? (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/10 text-center">
              <h3 className="text-sm font-semibold text-violet-400 mb-2">Road Editor</h3>
              <p className="text-xs text-neutral-400">
                Click to create/select nodes.<br />
                Connect nodes by clicking between them.<br />
                <strong>ESC</strong>: Deselect | <strong>Ctrl+Z</strong>: Undo
              </p>
            </div>

            {onBrushModeChange && (
              <button
                onClick={() => onBrushModeChange(!brushMode)}
                className={`w-full px-4 py-3 rounded-xl font-semibold transition-all ${brushMode
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-violet-500/10 text-violet-400 border border-violet-500/30 hover:bg-violet-500/20'
                  }`}
              >
                <span className="mr-2">{brushMode ? '🖌️' : '✏️'}</span>
                {brushMode ? 'Brush Mode: ON' : 'Brush Mode: OFF'}
              </button>
            )}

            {onExportGraph && (
              <button
                onClick={onExportGraph}
                className="w-full mt-2 px-3 py-2 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <span>💾</span> Export Graph (JSON)
              </button>
            )}

            {onDeleteNode && (
              <button
                onClick={onDeleteNode}
                className="w-full mt-2 px-3 py-2 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <span>🗑️</span> Delete Selected Node
              </button>
            )}
          </div>
        ) : mode === 'navigator' ? (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-center">
              <h3 className="text-sm font-semibold text-purple-400 mb-2">Navigator</h3>
              <p className="text-xs text-neutral-400">
                <strong>Left-click</strong>: Set Start Point<br />
                <strong>Right-click</strong>: Set Destination<br />
                System finds shortest path via roads.
              </p>
            </div>

            {navDistance !== null && (
              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-purple-400">Route Distance</span>
                  <span className="text-2xl font-bold text-purple-300">{Math.round(navDistance)}m</span>
                </div>
                <div className="mt-2 text-xs text-neutral-400">
                  Total travel distance via roads
                </div>
              </div>
            )}
          </div>
        ) : mode === 'ruler' ? (
          <>
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
                <span className="text-xs uppercase tracking-wider text-amber-400 block mb-1">Measured Distance</span>
                <span className="text-3xl font-bold text-white">
                  {rulerDistance ? `${Math.round(rulerDistance)}m` : '-'}
                </span>
              </div>
              <div className="p-4 neu-inset text-sm text-neutral-400">
                <p className="mb-2"><strong>How to measure:</strong></p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Click first point on map</li>
                  <li>Click second point</li>
                  <li>Read distance above</li>
                  <li>Click again to reset</li>
                </ol>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Progress Steps */}
            <div className="mb-6 p-4 neu-inset">
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-4">Setup Progress</h2>
              <div className="space-y-3">
                <div className="text-xs text-neutral-400 mb-2">
                  <span className="hidden md:inline">Desktop: Click Start then Click End</span>
                  <span className="md:hidden">Mobile: Drag 1-finger to set path. 2-fingers to Pan.</span>
                </div>
                <StatusStep step={0} currentStep={instructionStep} label="Set flight path" />
                <StatusStep step={2} currentStep={instructionStep} label="Right-click / Double-tap dest" />
              </div>

              {/* Progress bar */}
              <div className="mt-4 progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min((instructionStep / 3) * 100, 100)}%` }}
                />
              </div>
            </div>
          </>
        )}
        {/* Stats Display */}
        {mode === 'drop' && stats.distance !== null && stats.strategy && strategyConfig && (
          <div className="space-y-4 animate-fade-in">
            {/* Strategy Badge */}
            <div className={`p-4 rounded-xl border ${strategyConfig.bgClass} ${strategyConfig.borderClass} transition-all duration-300`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wider text-neutral-400">Strategy</span>
                <span className={`font-bold flex items-center gap-2 ${strategyConfig.color}`}>
                  <span>{strategyConfig.icon}</span>
                  {strategyConfig.label}
                </span>
              </div>

              {/* Jump distance indicator */}
              <div className="flex items-center gap-3">
                <div className={`status-dot ${stats.isReachable ? 'success' : 'danger'}`} />
                <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{roundDistance(stats.jumpDistanceRule || 0)}m</span>
                <span className="text-xs text-neutral-500">jump distance</span>
              </div>
            </div>

            {/* Too Far Warning */}
            {stats.strategy === 'TOO_FAR' && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 animate-glow">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="text-red-400 font-bold text-sm">Target Unreachable</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Target is {roundDistance(stats.perpDist || 0)}m from flight path.
                      Maximum reachable distance is ~{MAX_GLIDE_DISTANCE}m with slow glide.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 neu-inset text-center">
                <span className="text-xs text-neutral-500 block mb-1">Distance from Path</span>
                <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {roundDistance(stats.perpDist || 0)}m
                </span>
              </div>
              <div className="p-4 neu-inset text-center">
                <span className="text-xs text-neutral-500 block mb-1">Jump to Target</span>
                <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {roundDistance(stats.distance || 0)}m
                </span>
              </div>
            </div>

            {/* Execution Instructions */}
            <div className={`p-4 rounded-xl border ${strategyConfig.bgClass} ${strategyConfig.borderClass}`}>
              <h3 className={`font-bold text-sm uppercase tracking-wider mb-3 ${strategyConfig.color}`}>
                How to Execute
              </h3>

              {stats.strategy === 'STANDARD' && (
                <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">●</span>
                    <span>Exit at <span className="text-emerald-400 font-semibold">green marker</span> (800m from target)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">●</span>
                    <span>Dive toward target at <span className="font-semibold">190-210 km/h</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">●</span>
                    <span>At <span className="text-amber-400 font-semibold">yellow marker</span> (120m), dive straight down</span>
                  </li>
                </ul>
              )}

              {stats.strategy === 'SPECIAL' && (
                <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">●</span>
                    <span>Exit at <span className="text-emerald-400 font-semibold">green marker</span> (600m from target)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">●</span>
                    <span>Special zone - <span className="font-semibold">shorter distance</span> required</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">●</span>
                    <span>Dive toward target at <span className="font-semibold">190-210 km/h</span></span>
                  </li>
                </ul>
              )}

              {stats.strategy === 'SLOW_GLIDE' && (
                <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">●</span>
                    <span>Exit at <span className="text-emerald-400 font-semibold">green marker</span> (perpendicular point)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5">●</span>
                    <span>Fly at <span className="text-orange-400 font-semibold">slowest speed</span> (hold W + look UP)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">●</span>
                    <span>At <span className="text-amber-400 font-semibold">120m</span> from target, dive straight down</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">⚡</span>
                    <span className="text-neutral-500">You won't land first - target is far from path</span>
                  </li>
                </ul>
              )}

              {stats.strategy === 'SANHOK' && (
                <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">●</span>
                    <span>Exit at <span className="text-emerald-400 font-semibold">green marker</span> (1200m from target)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">●</span>
                    <span>Fly at <span className="text-cyan-400 font-semibold">slowest speed</span> (hold W + look UP)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">●</span>
                    <span>At <span className="text-amber-400 font-semibold">yellow marker</span> (100m), dive straight down</span>
                  </li>
                </ul>
              )}

              {stats.strategy === 'KARAKIN' && (
                <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">●</span>
                    <span>Exit at <span className="text-emerald-400 font-semibold">green marker</span> (500m from target)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-400 mt-0.5">●</span>
                    <span>Fly as <span className="text-violet-400 font-semibold">horizontally as possible</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">●</span>
                    <span>At <span className="text-amber-400 font-semibold">yellow marker</span> (115m), dive straight down</span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-600">
            <span>Map: {MAP_DATA[selectedMap] / 1000}km × {MAP_DATA[selectedMap] / 1000}km</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Ready
            </span>
          </div>
        </div>
      </div >
    </>
  );
};
