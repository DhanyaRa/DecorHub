import React, { useState } from 'react';
import { Project } from '../../types';
import {
  loadAllProjects,
  saveProject,
  deleteProject,
  duplicateProject,
  setActiveProjectId,
} from '../../utils/storage';
import { formatINR, calculateBudgetBreakdown } from '../../utils/currency';
import {
  FolderKanban,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface SavedProjectsViewProps {
  currentProjectId: string;
  onSelectProject: (proj: Project) => void;
  onStartNewDesign: () => void;
}

export const SavedProjectsView: React.FC<SavedProjectsViewProps> = ({
  currentProjectId,
  onSelectProject,
  onStartNewDesign,
}) => {
  const [projects, setProjects] = useState<Project[]>(() => loadAllProjects());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');

  const handleOpen = (p: Project) => {
    setActiveProjectId(p.id);
    onSelectProject(p);
  };

  const handleDuplicate = (id: string) => {
    const dup = duplicateProject(id);
    if (dup) {
      setProjects(loadAllProjects());
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      const remaining = deleteProject(id);
      setProjects(remaining);
      if (remaining.length > 0 && currentProjectId === id) {
        onSelectProject(remaining[0]);
      }
    }
  };

  const handleStartRename = (p: Project) => {
    setEditingId(p.id);
    setEditName(p.name);
  };

  const handleSaveRename = (p: Project) => {
    if (editName.trim()) {
      const updated: Project = {
        ...p,
        name: editName.trim(),
        updatedAt: new Date().toISOString(),
      };
      saveProject(updated);
      setProjects(loadAllProjects());
      if (currentProjectId === p.id) {
        onSelectProject(updated);
      }
    }
    setEditingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#B45A3E] tracking-wider uppercase">
            Project Archives
          </div>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
            Saved Room Projects
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-xl">
            Manage your saved room configurations, duplicate design alternatives, or start a new
            personalized room synthesis.
          </p>
        </div>

        <button
          onClick={onStartNewDesign}
          className="px-5 py-2.5 rounded-xl bg-[#C86D51] hover:bg-[#B45A3E] text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Room Design</span>
        </button>
      </div>

      {/* Projects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((proj) => {
          const isCurrent = proj.id === currentProjectId;
          const q = proj.questionnaire;
          const breakdown = calculateBudgetBreakdown(proj.currentPlacedItems, q.budget);
          const isEditing = editingId === proj.id;

          return (
            <div
              key={proj.id}
              className={`bg-white rounded-2xl border p-6 shadow-xs flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'border-[#C86D51] ring-2 ring-[#C86D51]/30 shadow-md'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full p-1.5 rounded-lg border border-stone-300 text-sm font-semibold text-stone-900 focus:border-[#C86D51]"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(proj)}
                          className="p-1.5 rounded-lg bg-[#C86D51] text-white"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif-display text-lg font-bold text-stone-900 truncate">
                          {proj.name}
                        </h3>
                        <button
                          onClick={() => handleStartRename(proj)}
                          className="p-1 text-stone-400 hover:text-stone-700"
                          title="Rename Project"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="text-xs text-stone-500 mt-0.5">
                      {q.style.primaryStyle} · {q.roomType.replace('_', ' ')}
                    </div>
                  </div>

                  {isCurrent && (
                    <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#FAF0EB] text-[#B45A3E] text-[10px] font-bold">
                      Active
                    </span>
                  )}
                </div>

                {/* Dimensions & Stats */}
                <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-stone-100 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Dimensions:</span>
                    <span className="font-semibold text-stone-900">
                      {q.dimensions.lengthCm} × {q.dimensions.widthCm} cm
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Furnishings:</span>
                    <span className="font-semibold text-stone-900">
                      {proj.currentPlacedItems.length} items placed
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Estimated Total:</span>
                    <span className="font-bold text-stone-900">
                      {formatINR(breakdown.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Date stamp */}
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Modified {new Date(proj.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between mt-5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicate(proj.id)}
                    className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                    title="Duplicate Project"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {projects.length > 1 && (
                    <button
                      onClick={() => handleDelete(proj.id, proj.name)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleOpen(proj)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Open Design</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
