import React from 'react';
import { ActiveTab } from '../types';
import { Compass, Sparkles, FolderKanban, Layout, ShoppingBag, Calculator, User, Cloud, Scan, Settings } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onStartDesign: () => void;
  onOpenAuth: () => void;
  currentUser: any;
  isCloudConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onStartDesign,
  onOpenAuth,
  currentUser,
  isCloudConnected,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onSelectTab('home')}
          className="text-left group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86113C] rounded-lg p-1 -m-1"
        >
          <div className="w-8 h-8 rounded-lg bg-[#86113C] text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
            <Compass className="w-4.5 h-4.5" />
          </div>
          <span className="font-serif-display text-2xl font-bold tracking-tight text-stone-900 group-hover:text-[#700E32] transition-colors whitespace-nowrap shrink-0">
            DecorHub
          </span>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
          <button
            onClick={() => onSelectTab('home')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'home'
                ? 'text-[#86113C] border-[#86113C] font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onSelectTab('my_designs')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'my_designs'
                ? 'text-[#86113C] border-[#86113C] font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            My Designs
          </button>
          <button
            onClick={() => onSelectTab('scanner')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'scanner'
                ? 'text-[#86113C] border-[#86113C] font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            Room Scanner
          </button>
          <button
            onClick={() => onSelectTab('planner')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'planner'
                ? 'text-[#86113C] border-[#86113C] font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            2D & 3D Planner
          </button>
          <button
            onClick={() => onSelectTab('catalog')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'catalog'
                ? 'text-[#86113C] border-[#86113C] font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            Furniture Catalog
          </button>
          <button
            onClick={() => onSelectTab('budget')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'budget'
                ? 'text-[#86113C] border-[#86113C] font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            Budget
          </button>
          <button
            onClick={() => onSelectTab('projects')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'projects'
                ? 'text-[#86113C] border-[#86113C] font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            Saved Projects
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'settings'
                ? 'text-[#86113C] border-[#86113C] font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenAuth}
            className="p-2 text-stone-600 hover:text-[#86113C] hover:bg-stone-100 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title={currentUser && !currentUser.isGuest ? `Signed in as ${currentUser.displayName}` : 'Sign in / Cloud Sync'}
          >
            <User className="w-4 h-4 text-[#86113C]" />
            <span className="hidden lg:inline">
              {currentUser && !currentUser.isGuest ? currentUser.displayName?.split(' ')[0] : 'Account'}
            </span>
            {isCloudConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected to Supabase Cloud" />
            )}
          </button>

          <button
            onClick={onStartDesign}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#86113C] hover:bg-[#700E32] active:bg-[#5A0B28] rounded-xl shadow-xs hover:shadow-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86113C] focus-visible:ring-offset-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Design My Room</span>
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Sub-Bar */}
      <div className="md:hidden flex overflow-x-auto no-scrollbar px-4 py-2 gap-2 border-t border-stone-200/60 bg-white/60 text-xs">
        {[
          { tab: 'home' as ActiveTab, label: 'Home', icon: Compass },
          { tab: 'my_designs' as ActiveTab, label: 'Designs', icon: Sparkles },
          { tab: 'scanner' as ActiveTab, label: 'Scan', icon: Scan },
          { tab: 'planner' as ActiveTab, label: 'Planner', icon: Layout },
          { tab: 'catalog' as ActiveTab, label: 'Catalog', icon: ShoppingBag },
          { tab: 'budget' as ActiveTab, label: 'Budget', icon: Calculator },
          { tab: 'projects' as ActiveTab, label: 'Projects', icon: FolderKanban },
          { tab: 'settings' as ActiveTab, label: 'Settings', icon: Settings },
        ].map((item) => (
          <button
            key={item.tab}
            onClick={() => onSelectTab(item.tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              activeTab === item.tab
                ? 'bg-[#86113C] text-white'
                : 'bg-stone-100/90 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};
