import React, { useState } from 'react';
import {
  Project,
  DesignPriority,
  DesignStyle,
  SafetyRequirements,
  FurnitureCategory,
  FurnitureRequirement,
  BudgetCoverageScope,
  BudgetStrictness,
  FurnishingPace,
} from '../../types';
import { formatINR } from '../../utils/currency';
import {
  User,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  CheckCircle2,
  Save,
  Cloud,
  Layers,
  Heart,
  Baby,
  Dog,
  Anchor,
  IndianRupee,
} from 'lucide-react';

interface ProfileSettingsViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  currentUser: any;
  isCloudConnected: boolean;
  onOpenAuth: () => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  project,
  onUpdateProject,
  currentUser,
  isCloudConnected,
  onOpenAuth,
}) => {
  const survey = project.questionnaire;

  // Local state for editable user preferences
  const [ageGroup, setAgeGroup] = useState<string>(survey.userProfile.ageGroup || '26-35');
  const [profession, setProfession] = useState<string>(survey.userProfile.profession || 'working_professional');
  const [occupantCount, setOccupantCount] = useState<number>(survey.userProfile.occupantCount || 2);
  const [roomUsers, setRoomUsers] = useState<string>(survey.userProfile.roomUsers || 'couple');
  const [dailyActivities, setDailyActivities] = useState<string[]>(survey.userProfile.dailyActivities || ['sleeping', 'remote_work']);
  const [futureNeeds, setFutureNeeds] = useState<string>(survey.userProfile.futureNeeds || '');

  // Priorities & Style
  const [primaryPriority, setPrimaryPriority] = useState<DesignPriority>(
    project.designPriorities?.primary || 'comfort_focused'
  );
  const [primaryStyle, setPrimaryStyle] = useState<DesignStyle>(survey.style.primaryStyle || 'Japandi');
  const [spacePhilosophy, setSpacePhilosophy] = useState<'clutter-free' | 'balanced' | 'decorative'>(
    survey.style.spacePhilosophy || 'balanced'
  );

  // Safety requirements
  const [safety, setSafety] = useState<SafetyRequirements>(
    project.safetyRequirements || {
      childFriendly: survey.functionalNeeds.childFriendly || false,
      petFriendly: survey.functionalNeeds.petFriendly || false,
      antiFallAnchoring: true,
      softCorners: survey.functionalNeeds.childFriendly || false,
      wideClearances: survey.functionalNeeds.accessibleMovement || false,
    }
  );

  // Budget preferences
  const [totalBudgetINR, setTotalBudgetINR] = useState<number>(survey.budget.totalBudgetINR || 120000);
  const [coverageScope, setCoverageScope] = useState<BudgetCoverageScope>(survey.budget.coverageScope || 'full_turnkey');
  const [strictness, setStrictness] = useState<BudgetStrictness>(survey.budget.strictness || 'flexible');
  const [furnishingPace, setFurnishingPace] = useState<FurnishingPace>(survey.budget.furnishingPace || 'entire_room');
  const [includesDelivery, setIncludesDelivery] = useState<boolean>(survey.budget.includesDelivery || false);
  const [includesInstallation, setIncludesInstallation] = useState<boolean>(survey.budget.includesInstallation || false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Toggle activity
  const toggleActivity = (act: string) => {
    setDailyActivities((prev) =>
      prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]
    );
  };

  // Save changes back to Project & LocalStorage
  const handleSavePreferences = () => {
    const updated: Project = {
      ...project,
      designPriorities: {
        primary: primaryPriority,
      },
      safetyRequirements: safety,
      questionnaire: {
        ...project.questionnaire,
        userProfile: {
          ...project.questionnaire.userProfile,
          ageGroup,
          profession,
          occupantCount,
          roomUsers,
          dailyActivities,
          futureNeeds,
        },
        style: {
          ...project.questionnaire.style,
          primaryStyle,
          spacePhilosophy,
        },
        functionalNeeds: {
          ...project.questionnaire.functionalNeeds,
          childFriendly: safety.childFriendly,
          petFriendly: safety.petFriendly,
          accessibleMovement: safety.wideClearances,
        },
        budget: {
          ...project.questionnaire.budget,
          totalBudgetINR,
          coverageScope,
          strictness,
          furnishingPace,
          includesDelivery,
          includesInstallation,
        },
      },
      updatedAt: new Date().toISOString(),
    };

    onUpdateProject(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Page Title & Account Cloud Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#86113C] text-white flex items-center justify-center font-bold text-xl shadow-xs">
            <User className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#86113C] uppercase tracking-wider">
              Unified Profile & Living Preferences
            </span>
            <h1 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900 mt-0.5">
              {currentUser && !currentUser.isGuest ? currentUser.displayName : 'Designer Profile & Settings'}
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Edit your lifestyle, design priorities, and safety parameters anytime without re-taking the questionnaire.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAuth}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-100 text-stone-800 hover:bg-stone-200 transition-colors flex items-center gap-1.5"
          >
            <Cloud className="w-3.5 h-3.5 text-[#86113C]" />
            <span>{isCloudConnected ? 'Supabase Sync Active' : 'Connect Cloud Sync'}</span>
          </button>

          <button
            onClick={handleSavePreferences}
            className="px-5 py-2 text-xs font-bold text-white bg-[#86113C] hover:bg-[#700E32] rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl p-4 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Preferences updated successfully! Recommendations and layout alternatives have been synchronized.</span>
        </div>
      )}

      {/* Grid of Preference Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Module 1: Lifestyle & Occupancy */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
          <h3 className="font-serif-display text-lg font-bold text-stone-900 pb-3 border-b border-stone-100 flex items-center gap-2">
            <User className="w-4 h-4 text-[#86113C]" />
            Lifestyle & Daily Living
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Profession / Role</label>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800 focus:bg-white focus:ring-2 focus:ring-[#86113C]"
              >
                <option value="working_professional">Working Professional</option>
                <option value="student">Student / Academic</option>
                <option value="freelancer">Freelancer / Creative</option>
                <option value="homemaker">Homemaker</option>
                <option value="retired">Retired</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Age Range</label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800 focus:bg-white"
                >
                  <option value="18-25">18–25</option>
                  <option value="26-35">26–35</option>
                  <option value="36-50">36–50</option>
                  <option value="50+">50+</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Occupants</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={occupantCount}
                  onChange={(e) => setOccupantCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800 focus:bg-white"
                />
              </div>
            </div>

            {/* Daily Activities Pills */}
            <div>
              <label className="block font-semibold text-stone-700 mb-2">Daily Room Activities</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'sleeping', label: 'Sleeping' },
                  { id: 'remote_work', label: 'Remote Work' },
                  { id: 'studying', label: 'Studying' },
                  { id: 'reading_relaxation', label: 'Reading' },
                  { id: 'tv_entertainment', label: 'Media/TV' },
                  { id: 'dressing_grooming', label: 'Dressing' },
                ].map((act) => {
                  const isSelected = dailyActivities.includes(act.id);
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => toggleActivity(act.id)}
                      className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                        isSelected
                          ? 'bg-[#86113C] text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {act.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Future Plans */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Future Plans / Anticipated Needs</label>
              <textarea
                rows={2}
                value={futureNeeds}
                onChange={(e) => setFutureNeeds(e.target.value)}
                placeholder="e.g. Planning to add nursery cot next year, or converting into dual-workstation..."
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800 focus:bg-white text-xs"
              />
            </div>
          </div>
        </div>

        {/* Module 2: Design Priorities & Style */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
          <h3 className="font-serif-display text-lg font-bold text-stone-900 pb-3 border-b border-stone-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#86113C]" />
            Design Objective & Aesthetic
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Primary Design Priority</label>
              <select
                value={primaryPriority}
                onChange={(e) => setPrimaryPriority(e.target.value as DesignPriority)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800 focus:bg-white focus:ring-2 focus:ring-[#86113C]"
              >
                <option value="space_efficient">Space-Efficient (Maximum Open Area)</option>
                <option value="comfort_focused">Comfort-Focused (Plush Bedding & Seating)</option>
                <option value="productivity_focused">Productivity & WFH Workstation</option>
                <option value="study_focused">Study & Academic Focus</option>
                <option value="storage_focused">High-Capacity Storage & Wardrobes</option>
                <option value="child_safe">Child-Safe & Family-Friendly</option>
                <option value="accessibility_focused">Accessibility & Wide Clearances</option>
                <option value="minimalist">Minimalist & Clutter-Free</option>
                <option value="budget_conscious">Budget-Conscious Value</option>
                <option value="balanced">Balanced Harmonious Layout</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Interior Design Style</label>
              <select
                value={primaryStyle}
                onChange={(e) => setPrimaryStyle(e.target.value as DesignStyle)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800 focus:bg-white"
              >
                <option value="Japandi">Japandi (Warm wood & cane simplicity)</option>
                <option value="Scandinavian">Scandinavian (Blonde wood & sage tones)</option>
                <option value="Modern">Modern (Clean lines & architectural symmetry)</option>
                <option value="Contemporary Indian">Contemporary Indian (Rich teak & brass)</option>
                <option value="Minimalist">Minimalist (Pure geometric serenity)</option>
                <option value="Bohemian">Bohemian (Layered textiles & warm rattan)</option>
                <option value="Industrial">Industrial (Raw metal & reclaimed wood)</option>
                <option value="Traditional">Traditional (Classic craftsmanship)</option>
                <option value="Modern luxury">Modern Luxury (Velvet & subtle gold)</option>
                <option value="Organic modern">Organic Modern (Earthy curves & stone)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Space Density Philosophy</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'clutter-free' as const, label: 'Minimalist' },
                  { id: 'balanced' as const, label: 'Balanced' },
                  { id: 'decorative' as const, label: 'Curated' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSpacePhilosophy(p.id)}
                    className={`py-2 px-2 rounded-xl text-center font-semibold transition-colors ${
                      spacePhilosophy === p.id
                        ? 'bg-[#86113C] text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Module 3: Safety & Accessibility Requirements */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="font-serif-display text-lg font-bold text-stone-900 pb-3 border-b border-stone-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-700" />
            Safety & Physical Clearances
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={safety.childFriendly}
                onChange={(e) => setSafety({ ...safety, childFriendly: e.target.checked })}
                className="w-4 h-4 accent-[#86113C] rounded"
              />
              <div className="flex-1">
                <span className="font-bold text-stone-800 flex items-center gap-1.5">
                  <Baby className="w-3.5 h-3.5 text-amber-600" />
                  Child-Safe Environment
                </span>
                <span className="text-[11px] text-stone-500 block">
                  Avoids glass surfaces and sharp corner coffee tables
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={safety.antiFallAnchoring}
                onChange={(e) => setSafety({ ...safety, antiFallAnchoring: e.target.checked })}
                className="w-4 h-4 accent-[#86113C] rounded"
              />
              <div className="flex-1">
                <span className="font-bold text-stone-800 flex items-center gap-1.5">
                  <Anchor className="w-3.5 h-3.5 text-indigo-600" />
                  Anti-Tip Furniture Anchoring
                </span>
                <span className="text-[11px] text-stone-500 block">
                  Recommends wall bracket anchoring for tall wardrobes and bookshelves
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={safety.wideClearances}
                onChange={(e) => setSafety({ ...safety, wideClearances: e.target.checked })}
                className="w-4 h-4 accent-[#86113C] rounded"
              />
              <div className="flex-1">
                <span className="font-bold text-stone-800">Wide 90cm+ Circulation Transit</span>
                <span className="text-[11px] text-stone-500 block">
                  Accessible pathways accommodating strollers or mobility aids
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Module 4: Budget in INR */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="font-serif-display text-lg font-bold text-stone-900 pb-3 border-b border-stone-100 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-[#86113C]" />
            Target Budget in Indian Rupees (INR)
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Total Furnishing Budget</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-stone-500">₹</span>
                <input
                  type="number"
                  step="5000"
                  value={totalBudgetINR}
                  onChange={(e) => setTotalBudgetINR(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-base font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-[#86113C]"
                />
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">
                Formatted: <strong>{formatINR(totalBudgetINR)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Coverage Scope</label>
                <select
                  value={coverageScope}
                  onChange={(e) => setCoverageScope(e.target.value as BudgetCoverageScope)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-800 focus:bg-white"
                >
                  <option value="furniture_only">Furniture only</option>
                  <option value="furniture_decor">Furniture and decor</option>
                  <option value="furniture_decor_lighting">Furniture, decor, & lighting</option>
                  <option value="full_turnkey">Turnkey (Decor + Delivery + Assembly)</option>
                  <option value="complete_renovation">Full room renovation</option>
                  <option value="custom">Custom selection</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Budget Flexibility</label>
                <select
                  value={strictness}
                  onChange={(e) => setStrictness(e.target.value as BudgetStrictness)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-800 focus:bg-white"
                >
                  <option value="strict">Strict budget (Firm cap)</option>
                  <option value="flexible">Flexible budget (+10-15%)</option>
                  <option value="quality_first">Quality-first (Prioritise durability)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Furnishing Pace</label>
                <select
                  value={furnishingPace}
                  onChange={(e) => setFurnishingPace(e.target.value as FurnishingPace)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-800 focus:bg-white"
                >
                  <option value="entire_room">Furnish entire room now</option>
                  <option value="essential_first">Essential foundation first</option>
                  <option value="phased_plan">Phased 3-stage roadmap</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includesDelivery}
                  onChange={(e) => setIncludesDelivery(e.target.checked)}
                  className="accent-[#86113C]"
                />
                <span className="text-stone-700">Include Estimated Logistics & Delivery (~₹3,500)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includesInstallation}
                  onChange={(e) => setIncludesInstallation(e.target.checked)}
                  className="accent-[#86113C]"
                />
                <span className="text-stone-700">Include Assembly & Fitting (~₹4,500)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
