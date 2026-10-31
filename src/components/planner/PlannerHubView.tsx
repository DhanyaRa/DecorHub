import React, { useState } from 'react';
import { Project, PlacedItem } from '../../types';
import { RoomPlanner2D } from './RoomPlanner2D';
import { RoomPlanner3D } from './RoomPlanner3D';
import { BeforeAfterView } from './BeforeAfterView';
import { Layout, Eye, ArrowLeftRight, ShoppingBag } from 'lucide-react';

interface PlannerHubViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onOpenShoppingList: () => void;
  initialMode?: '2d' | '3d' | 'before_after';
}

export const PlannerHubView: React.FC<PlannerHubViewProps> = ({
  project,
  onUpdateProject,
  onOpenShoppingList,
  initialMode = '2d',
}) => {
  const [plannerMode, setPlannerMode] = useState<'2d' | '3d' | 'before_after'>(initialMode);

  return (
    <div className="space-y-6">
      {/* Top View Mode Navigation Pill Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* 2D / 3D / Before-After Mode Switcher */}
        <div className="inline-flex items-center p-1.5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <button
            onClick={() => setPlannerMode('2d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              plannerMode === '2d'
                ? 'bg-[#86113C] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Layout className="w-4 h-4" />
            <span>Interactive 2D Plan</span>
          </button>

          <button
            onClick={() => setPlannerMode('3d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              plannerMode === '3d'
                ? 'bg-[#86113C] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>3D Realistic Room</span>
          </button>

          <button
            onClick={() => setPlannerMode('before_after')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              plannerMode === 'before_after'
                ? 'bg-[#86113C] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Before & After</span>
          </button>
        </div>

        {/* Layout Alternative (A, B, C) Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-2">
            Layout:
          </span>
          {Object.values(project.layoutAlternatives).map((alt) => {
            const isSelected = project.activeLayoutId === alt.id;
            return (
              <button
                key={alt.id}
                onClick={() => {
                  onUpdateProject({
                    ...project,
                    activeLayoutId: alt.id,
                    currentPlacedItems: [...alt.items],
                    updatedAt: new Date().toISOString(),
                  });
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#86113C] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {alt.id === 'space_efficient'
                  ? 'Layout A (Space)'
                  : alt.id === 'comfort_focused'
                  ? 'Layout B (Comfort)'
                  : 'Layout C (Storage)'}
              </button>
            );
          })}
        </div>

        <button
          onClick={onOpenShoppingList}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200 flex items-center gap-2 transition-colors shrink-0"
        >
          <ShoppingBag className="w-4 h-4 text-[#86113C]" />
          <span>View Budget & Shopping List</span>
        </button>
      </div>

      {/* Render Active Planner Engine */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {plannerMode === '2d' && (
          <RoomPlanner2D
            project={project}
            onUpdateProject={onUpdateProject}
            onOpenShoppingList={onOpenShoppingList}
          />
        )}

        {plannerMode === '3d' && (
          <RoomPlanner3D
            project={project}
            onUpdateProject={onUpdateProject}
            onSwitchTo2D={() => setPlannerMode('2d')}
          />
        )}

        {plannerMode === 'before_after' && (
          <BeforeAfterView
            project={project}
            onOpenPlanner2D={() => setPlannerMode('2d')}
            onOpenPlanner3D={() => setPlannerMode('3d')}
          />
        )}
      </div>
    </div>
  );
};
