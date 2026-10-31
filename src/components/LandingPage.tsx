import React from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Ruler, Layout, IndianRupee, Layers, ShieldCheck, Compass } from 'lucide-react';
import { ActiveTab, Project } from '../types';

interface LandingPageProps {
  onStartQuestionnaire: () => void;
  onExplorePlanner: () => void;
  onExploreCatalog: () => void;
  onExploreScanner?: () => void;
  onLoadTemplate: (templateName: string) => void;
  currentProject: Project;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartQuestionnaire,
  onExplorePlanner,
  onExploreCatalog,
  onExploreScanner,
  onLoadTemplate,
  currentProject,
}) => {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Copy Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDF2F4] border border-[#F8C8D4] text-[#86113C] text-xs font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI-Based Adaptive Interior Design</span>
              </div>

              <h1 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 leading-[1.12] text-balance">
                Your space. Your style. <br />
                <span className="text-[#86113C] italic font-medium">Thoughtfully designed.</span>
              </h1>

              <p className="text-stone-600 text-base sm:text-lg leading-relaxed max-w-xl">
                Experience an end-to-end interior design workspace. Scan your existing room with AI vision,
                customize layout priorities, inspect your room in genuine 3D, and balance your real furniture budget in Indian Rupees.
              </p>

              <div className="pt-2 flex flex-wrap gap-3 sm:items-center">
                <button
                  onClick={onStartQuestionnaire}
                  className="px-6 py-3.5 text-base font-semibold text-white bg-[#86113C] hover:bg-[#700E32] active:bg-[#5A0B28] rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Start Room Design</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                {onExploreScanner && (
                  <button
                    onClick={onExploreScanner}
                    className="px-5 py-3.5 text-base font-semibold text-[#86113C] bg-white hover:bg-stone-50 border border-[#86113C]/30 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Scan Room Photo</span>
                  </button>
                )}
                <button
                  onClick={onExplorePlanner}
                  className="px-5 py-3.5 text-base font-semibold text-stone-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Layout className="w-4 h-4 text-stone-600" />
                  <span>2D & 3D Planner</span>
                </button>
              </div>

              {/* Trust & Evidence markers */}
              <div className="pt-6 border-t border-stone-200/80 grid grid-cols-3 gap-4">
                <div>
                  <div className="font-serif-display text-2xl font-bold text-stone-900">100%</div>
                  <div className="text-xs text-stone-500 font-medium mt-0.5">Client-Side & Private</div>
                </div>
                <div>
                  <div className="font-serif-display text-2xl font-bold text-stone-900">₹ INR</div>
                  <div className="text-xs text-stone-500 font-medium mt-0.5">Live Cost Estimation</div>
                </div>
                <div>
                  <div className="font-serif-display text-2xl font-bold text-stone-900">2D Scaled</div>
                  <div className="text-xs text-stone-500 font-medium mt-0.5">Collision-Aware Planner</div>
                </div>
              </div>
            </div>

            {/* Right Visual Column */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-stone-200/60 bg-stone-100 group aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3]">
                <img
                  src="/src/assets/images/hero_interior_warm_1791968291047.jpg"
                  alt="DecorHub Curated Interior Showcase"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent pointer-events-none" />

                {/* Floating Showcase Preview Card on Image */}
                <div className="absolute bottom-5 left-5 right-5 p-4 rounded-xl bg-white/95 backdrop-blur-md border border-stone-200/80 shadow-lg text-stone-900 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#86113C] tracking-wider uppercase">Curated Interior Showcase</div>
                    <div className="font-serif-display text-base font-bold text-stone-900 truncate">
                      Japandi Sanctuary Master Suite
                    </div>
                    <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                      <span>420 × 350 cm</span>
                      <span>·</span>
                      <span>Architectural 2D & 3D Spatial Model</span>
                    </div>
                  </div>
                  <button
                    onClick={onExplorePlanner}
                    className="shrink-0 px-3.5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap"
                  >
                    View in 2D
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Pillars Section */}
      <section className="py-16 bg-[#F5F2EB]/60 border-y border-stone-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-serif-display text-3xl font-bold text-stone-900">
              Complete Architectural Workspace
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-2">
              Everything required to plan, arrange, and furnish your home with architectural precision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-xs hover:shadow-sm transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#FDF2F4] text-[#86113C] flex items-center justify-center mb-5">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="font-serif-display text-xl font-bold text-stone-900 mb-2">
                Personalized Questionnaire
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">
                7 thoughtful steps capturing occupant lifestyle, work-from-home habits, room dimensions,
                door swing directions, window locations, and aesthetic philosophies.
              </p>
              <div className="text-xs text-stone-500 space-y-1.5 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#86113C]" />
                  <span>Real metric & imperial dimension inputs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#86113C]" />
                  <span>Door & window wall positioning</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-xs hover:shadow-sm transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-5">
                <Layout className="w-6 h-6" />
              </div>
              <h3 className="font-serif-display text-xl font-bold text-stone-900 mb-2">
                Interactive 2D Room Planner
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">
                Top-down scaled canvas with authentic furniture vector silhouettes. Drag, rotate,
                snap to walls, and get real-time warnings if doors or pathways are obstructed.
              </p>
              <div className="text-xs text-stone-500 space-y-1.5 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Door swing & collision detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Multi-layout comparison (A, B, C)</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-xs hover:shadow-sm transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center mb-5">
                <IndianRupee className="w-6 h-6" />
              </div>
              <h3 className="font-serif-display text-xl font-bold text-stone-900 mb-2">
                Live INR Budget Dashboard
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">
                Instant price calculation across furniture, decor, delivery, and installation.
                Features smart one-click cheaper alternatives to keep your project strictly within budget.
              </p>
              <div className="text-xs text-stone-500 space-y-1.5 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Itemized shopping list with quantities</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Printable design report & PNG export</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Style Inspirations Showcase */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="text-xs font-semibold text-[#86113C] tracking-wider uppercase">Style Archetypes</div>
              <h2 className="font-serif-display text-3xl font-bold text-stone-900 mt-1">
                Curated Design Aesthetics
              </h2>
            </div>
            <button
              onClick={onExploreCatalog}
              className="text-sm font-semibold text-[#86113C] hover:text-[#700E32] flex items-center gap-1.5 transition-colors self-start md:self-auto"
            >
              <span>Explore Furniture Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Japandi */}
            <div className="group rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-xs hover:shadow-md transition-all">
              <div className="aspect-[4/3] overflow-hidden bg-stone-100 relative">
                <img
                  src="/src/assets/images/style_japandi_minimal_1791968292725.jpg"
                  alt="Japandi Style Interior"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <div className="text-xs font-medium text-stone-500 mb-1">Japanese Minimalism · Scandinavian Warmth</div>
                <h3 className="font-serif-display text-xl font-bold text-stone-900">Japandi Sanctuary</h3>
                <p className="text-stone-600 text-xs leading-relaxed mt-2">
                  Low-profile ash wood platform beds, woven paper cord textures, and earthy linen for peaceful daily rest.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-stone-500 font-medium">
                  <span className="bg-stone-100 px-2 py-0.5 rounded">Light Ash</span>
                  <span className="bg-stone-100 px-2 py-0.5 rounded">Warm Timber</span>
                  <span className="bg-stone-100 px-2 py-0.5 rounded">Woven Cane</span>
                </div>
              </div>
            </div>

            {/* Card 2: Scandinavian */}
            <div className="group rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-xs hover:shadow-md transition-all">
              <div className="aspect-[4/3] overflow-hidden bg-stone-100 relative">
                <img
                  src="/src/assets/images/style_scandi_modern_1791968291106.jpg"
                  alt="Scandinavian Style Interior"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <div className="text-xs font-medium text-stone-500 mb-1">Nordic Light · Functional Simplicity</div>
                <h3 className="font-serif-display text-xl font-bold text-stone-900">Scandinavian Modern</h3>
                <p className="text-stone-600 text-xs leading-relaxed mt-2">
                  Airy natural oak tables, sage green accent tones, tapered silhouettes, and light-filled spatial flow.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-stone-500 font-medium">
                  <span className="bg-stone-100 px-2 py-0.5 rounded">Pale Oak</span>
                  <span className="bg-stone-100 px-2 py-0.5 rounded">Sage Green</span>
                  <span className="bg-stone-100 px-2 py-0.5 rounded">Matte Metal</span>
                </div>
              </div>
            </div>

            {/* Card 3: Contemporary Indian */}
            <div className="group rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-xs hover:shadow-md transition-all">
              <div className="aspect-[4/3] overflow-hidden bg-stone-100 relative">
                <img
                  src="/src/assets/images/style_indian_contemporary_1791968292346.jpg"
                  alt="Contemporary Indian Interior"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <div className="text-xs font-medium text-stone-500 mb-1">Heritage Woodcraft · Modern Proportions</div>
                <h3 className="font-serif-display text-xl font-bold text-stone-900">Contemporary Indian</h3>
                <p className="text-stone-600 text-xs leading-relaxed mt-2">
                  Rich seasoned Sheesham and teak timber, subtle antique brass inlays, hand-loomed rugs, and warm earth tones.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-stone-500 font-medium">
                  <span className="bg-stone-100 px-2 py-0.5 rounded">Sheesham Wood</span>
                  <span className="bg-stone-100 px-2 py-0.5 rounded">Brushed Brass</span>
                  <span className="bg-stone-100 px-2 py-0.5 rounded">Jute & Wool</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instant Ready-to-Edit Templates */}
      <section className="py-14 bg-white border-t border-stone-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-2xl bg-[#FAF8F5] border border-stone-200">
            <div>
              <div className="text-xs font-semibold text-[#86113C] tracking-wider uppercase">Ready Templates</div>
              <h3 className="font-serif-display text-2xl font-bold text-stone-900 mt-1">
                Jump directly into standard room configurations
              </h3>
              <p className="text-stone-600 text-sm mt-1 max-w-xl">
                Select a standard room archetype to immediately open the 2D planner and test furniture arrangements.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onLoadTemplate('master_bedroom')}
                className="px-4 py-2.5 text-xs font-semibold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl transition-colors shadow-xs"
              >
                14×12ft Master Bedroom
              </button>
              <button
                onClick={() => onLoadTemplate('living_room')}
                className="px-4 py-2.5 text-xs font-semibold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl transition-colors shadow-xs"
              >
                16×13ft Living Lounge
              </button>
              <button
                onClick={() => onLoadTemplate('wfh_study')}
                className="px-4 py-2.5 text-xs font-semibold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl transition-colors shadow-xs"
              >
                11×10ft WFH Study
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-stone-200/80 bg-[#FAF8F5] text-stone-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif-display text-base font-bold text-stone-900">DecorHub</span>
            <span>·</span>
            <span>Your space. Your style. Thoughtfully designed.</span>
          </div>
          <div>
            <span>Client-side adaptive interior design engine · Verified in Indian Rupees (INR)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
