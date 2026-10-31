/**
 * DecorHub: AI-Based Adaptive Interior Design System
 * Main Application Orchestrator
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, Project, QuestionnaireData, CatalogItem } from './types';
import {
  loadAllProjects,
  saveProject,
  getActiveProject,
  createProjectFromQuestionnaire,
  DEFAULT_INITIAL_QUESTIONNAIRE,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { QuestionnaireWizard } from './components/questionnaire/QuestionnaireWizard';
import { RoomPlanner2D } from './components/planner/RoomPlanner2D';
import { PlannerHubView } from './components/planner/PlannerHubView';
import { RoomScannerView } from './components/scanner/RoomScannerView';
import { ProfileSettingsView } from './components/profile/ProfileSettingsView';
import { FurnitureCatalogView } from './components/catalog/FurnitureCatalogView';
import { BudgetDashboardView } from './components/budget/BudgetDashboardView';
import { DesignSummaryView } from './components/recommendations/DesignSummaryView';
import { SavedProjectsView } from './components/projects/SavedProjectsView';
import { DesignReportModal } from './components/export/DesignReportModal';
import { AuthModal } from './components/auth/AuthModal';
import { checkBackendHealth, syncProjectToApi } from './services/api';
import { supabase } from './services/supabaseClient';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [currentProject, setCurrentProject] = useState<Project>(() => getActiveProject());
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
    displayName?: string;
    isGuest: boolean;
  }>({ id: 'guest', displayName: 'Guest User', isGuest: true });
  const [questionnairePrefill, setQuestionnairePrefill] = useState<Partial<QuestionnaireData> | null>(null);

  const refreshAuth = () => {
    checkBackendHealth().then((health) => {
      setIsCloudConnected(health.supabaseConfigured);
      if (health.user && !health.user.isGuest) {
        setCurrentUser({
          id: health.user.id,
          email: health.user.email,
          displayName: health.user.displayName || health.user.email?.split('@')[0] || 'User',
          isGuest: false,
        });
      }
    });
  };

  useEffect(() => {
    refreshAuth();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            isGuest: false,
          });
        } else {
          setCurrentUser({ id: 'guest', displayName: 'Guest User', isGuest: true });
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Sync project changes to localStorage & backend API
  const handleUpdateProject = (updated: Project) => {
    setCurrentProject(updated);
    saveProject(updated);
    syncProjectToApi(updated);
  };

  // Complete questionnaire flow
  const handleCompleteQuestionnaire = (data: QuestionnaireData) => {
    const existingItems = (data as any).existingLayoutItems || (data.photoUrl === currentProject.questionnaire.photoUrl ? currentProject.originalExistingLayoutItems : []);
    const scanAnalysis = (data as any).scanAnalysis || (data.photoUrl === currentProject.questionnaire.photoUrl ? currentProject.scanAnalysis : undefined);
    const newProj = createProjectFromQuestionnaire(data, undefined, existingItems, scanAnalysis);
    saveProject(newProj);
    setCurrentProject(newProj);
    setActiveTab('my_designs');
  };

  // Add catalog item to active project room
  const handleAddItemToActiveRoom = (item: CatalogItem) => {
    const newItem = {
      instanceId: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      itemId: item.id,
      xCm: Math.max(30, Math.floor((currentProject.questionnaire.dimensions.lengthCm - item.dimensions.widthCm) / 2)),
      yCm: Math.max(30, Math.floor((currentProject.questionnaire.dimensions.widthCm - item.dimensions.depthCm) / 2)),
      rotationDeg: 0,
    };
    const updated: Project = {
      ...currentProject,
      currentPlacedItems: [...currentProject.currentPlacedItems, newItem],
      updatedAt: new Date().toISOString(),
    };
    handleUpdateProject(updated);
  };

  // Select layout alternative (A, B, C)
  const handleSelectLayoutAlternative = (layoutKey: string) => {
    const alt = currentProject.layoutAlternatives[layoutKey];
    if (alt) {
      const updated: Project = {
        ...currentProject,
        activeLayoutId: layoutKey,
        currentPlacedItems: [...alt.items],
        updatedAt: new Date().toISOString(),
      };
      handleUpdateProject(updated);
    }
  };

  // Pre-configured room template launcher from Landing Page
  const handleLoadTemplate = (templateType: string) => {
    let templateSurvey: QuestionnaireData = { ...DEFAULT_INITIAL_QUESTIONNAIRE };

    if (templateType === 'master_bedroom') {
      templateSurvey = {
        ...DEFAULT_INITIAL_QUESTIONNAIRE,
        roomType: 'bedroom',
        dimensions: {
          lengthCm: 430,
          widthCm: 370,
          ceilingHeightCm: 290,
          unit: 'cm',
          door: { wall: 'south', positionCm: 45, widthCm: 90, swing: 'inward-right' },
          windows: [{ id: 'w1', wall: 'east', positionCm: 80, widthCm: 150, heightCm: 140 }],
          obstructions: [],
        },
        style: {
          ...DEFAULT_INITIAL_QUESTIONNAIRE.style,
          primaryStyle: 'Japandi',
        },
      };
    } else if (templateType === 'living_room') {
      templateSurvey = {
        ...DEFAULT_INITIAL_QUESTIONNAIRE,
        roomType: 'living_room',
        dimensions: {
          lengthCm: 490,
          widthCm: 400,
          ceilingHeightCm: 300,
          unit: 'cm',
          door: { wall: 'south', positionCm: 50, widthCm: 100, swing: 'inward-right' },
          windows: [{ id: 'w1', wall: 'north', positionCm: 100, widthCm: 180, heightCm: 160 }],
          obstructions: [],
        },
        style: {
          ...DEFAULT_INITIAL_QUESTIONNAIRE.style,
          primaryStyle: 'Scandinavian',
        },
        budget: {
          ...DEFAULT_INITIAL_QUESTIONNAIRE.budget,
          totalBudgetINR: 175000,
        },
      };
    } else if (templateType === 'wfh_study') {
      templateSurvey = {
        ...DEFAULT_INITIAL_QUESTIONNAIRE,
        roomType: 'home_office',
        dimensions: {
          lengthCm: 340,
          widthCm: 300,
          ceilingHeightCm: 280,
          unit: 'cm',
          door: { wall: 'west', positionCm: 40, widthCm: 90, swing: 'inward-left' },
          windows: [{ id: 'w1', wall: 'north', positionCm: 80, widthCm: 120, heightCm: 140 }],
          obstructions: [],
        },
        style: {
          ...DEFAULT_INITIAL_QUESTIONNAIRE.style,
          primaryStyle: 'Contemporary Indian',
        },
        budget: {
          ...DEFAULT_INITIAL_QUESTIONNAIRE.budget,
          totalBudgetINR: 95000,
        },
      };
    }

    const newProj = createProjectFromQuestionnaire(
      templateSurvey,
      templateType === 'master_bedroom'
        ? '14×12ft Master Bedroom Sanctuary'
        : templateType === 'living_room'
        ? '16×13ft Contemporary Living Lounge'
        : '11×10ft WFH Executive Study'
    );
    saveProject(newProj);
    setCurrentProject(newProj);
    setActiveTab('planner');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 font-sans selection:bg-[#E07A5F]/20 selection:text-[#B24C31]">
      {/* Top Bar adhering to strict 3-zone contract */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onStartDesign={() => {
          setActiveTab('questionnaire');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        isCloudConnected={isCloudConnected}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {/* 1. Landing Page */}
        {activeTab === 'home' && (
          <LandingPage
            onStartQuestionnaire={() => {
              setActiveTab('questionnaire');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onExplorePlanner={() => {
              setActiveTab('planner');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onExploreCatalog={() => {
              setActiveTab('catalog');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onExploreScanner={() => {
              setActiveTab('scanner');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onLoadTemplate={handleLoadTemplate}
            currentProject={currentProject}
          />
        )}

        {/* 2. Onboarding Questionnaire */}
        {activeTab === 'questionnaire' && (
          <QuestionnaireWizard
            initialData={questionnairePrefill || undefined}
            onComplete={handleCompleteQuestionnaire}
            onCancel={() => {
              setQuestionnairePrefill(null);
              setActiveTab('home');
            }}
          />
        )}

        {/* 3. My Designs / Recommendations Summary */}
        {activeTab === 'my_designs' && (
          <DesignSummaryView
            project={currentProject}
            onOpenPlanner={() => setActiveTab('planner')}
            onOpenBudget={() => setActiveTab('budget')}
            onSelectAlternative={handleSelectLayoutAlternative}
            onPrintReport={() => setIsReportModalOpen(true)}
          />
        )}

        {/* 4. AI Room Scanner */}
        {activeTab === 'scanner' && (
          <RoomScannerView
            project={currentProject}
            onUpdateProject={handleUpdateProject}
            onProceedToDesign={() => setActiveTab('my_designs')}
            onOpenQuestionnaire={(prefill) => {
              if (prefill) {
                setQuestionnairePrefill(prefill);
              }
              setActiveTab('questionnaire');
            }}
          />
        )}

        {/* 5. Synchronized 2D and 3D Room Planner */}
        {activeTab === 'planner' && (
          <PlannerHubView
            project={currentProject}
            onUpdateProject={handleUpdateProject}
            onOpenShoppingList={() => setActiveTab('budget')}
          />
        )}

        {/* 6. Furniture Catalog */}
        {activeTab === 'catalog' && (
          <FurnitureCatalogView
            currentProject={currentProject}
            onAddItemToRoom={handleAddItemToActiveRoom}
          />
        )}

        {/* 7. Live INR Budget Dashboard */}
        {activeTab === 'budget' && (
          <BudgetDashboardView
            project={currentProject}
            onUpdateProject={handleUpdateProject}
            onOpenPlanner={() => setActiveTab('planner')}
            onOpenCatalog={() => setActiveTab('catalog')}
          />
        )}

        {/* 8. Saved Projects Archive */}
        {activeTab === 'projects' && (
          <SavedProjectsView
            currentProjectId={currentProject.id}
            onSelectProject={(proj) => {
              setCurrentProject(proj);
              setActiveTab('planner');
            }}
            onStartNewDesign={() => setActiveTab('questionnaire')}
          />
        )}

        {/* 9. Unified Profile & Living Preferences Settings */}
        {activeTab === 'settings' && (
          <ProfileSettingsView
            project={currentProject}
            onUpdateProject={handleUpdateProject}
            currentUser={currentUser}
            isCloudConnected={isCloudConnected}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Printable / Export Dossier Modal */}
      {isReportModalOpen && (
        <DesignReportModal
          project={currentProject}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {/* Supabase Auth & Cloud Sync Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthChange={refreshAuth}
      />
    </div>
  );
}
