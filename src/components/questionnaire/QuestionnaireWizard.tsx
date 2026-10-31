import React, { useState, useEffect } from 'react';
import {
  QuestionnaireData,
  RoomType,
  DimensionUnit,
  DesignStyle,
  FurnitureCategory,
  FurnitureRequirement,
  WallSide,
  DoorSwing,
  BudgetStrictness,
  BudgetCoverageScope,
  FurnitureValueDriver,
  FurnishingPace,
} from '../../types';
import {
  saveQuestionnaireDraft,
  loadQuestionnaireDraft,
  getDefaultFurnitureNeedsForRoomType,
} from '../../utils/storage';
import { formatINR } from '../../utils/currency';
import { convertToCm, formatDimension } from '../../utils/geometry';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Upload,
  X,
  Check,
  AlertCircle,
  HelpCircle,
  Maximize2,
  Layers,
  IndianRupee,
  ShieldCheck,
  Sliders,
  Wallet,
  CheckCircle2,
  Tag,
  PackageCheck,
  Sparkle,
} from 'lucide-react';
import { compressRoomPhoto } from '../../utils/imageUtils';

interface QuestionnaireWizardProps {
  initialData?: Partial<QuestionnaireData>;
  onComplete: (data: QuestionnaireData) => void;
  onCancel: () => void;
}

const DESIGN_STYLES: { id: DesignStyle; label: string; desc: string; sampleColors: string[] }[] = [
  { id: 'Japandi', label: 'Japandi', desc: 'Japanese functional minimalism paired with Scandinavian organic warmth.', sampleColors: ['#D8C3A5', '#86113C', '#4A5B4D', '#EDEBE6'] },
  { id: 'Scandinavian', label: 'Scandinavian', desc: 'Bright, airy, light oak woods with muted sage and functional simplicity.', sampleColors: ['#E8D8C8', '#879883', '#FAF8F5', '#3C3B3D'] },
  { id: 'Contemporary Indian', label: 'Contemporary Indian', desc: 'Rich seasoned timber, handcrafted cane, warm brass, and earthen pottery.', sampleColors: ['#785038', '#BF7258', '#D4AF37', '#FDF2F4'] },
  { id: 'Modern', label: 'Modern', desc: 'Crisp geometric lines, balanced neutral surfaces, and architectural lighting.', sampleColors: ['#EDEBE6', '#4A4D52', '#3C3B3D', '#D4AF37'] },
  { id: 'Minimalist', label: 'Minimalist', desc: 'Uncluttered calm surfaces, hidden storage, and pure architectural forms.', sampleColors: ['#FFFFFF', '#DFD8CC', '#262322', '#C4B9AA'] },
  { id: 'Organic modern', label: 'Organic Modern', desc: 'Sculptural stone curves, linen textiles, warm travertine, and earthy tones.', sampleColors: ['#EFE7DA', '#86113C', '#BE9B7B', '#879883'] },
  { id: 'Modern luxury', label: 'Modern Luxury', desc: 'Deep fluted velvet, champagne brass trims, and tailored statements.', sampleColors: ['#2D2926', '#4A5B4D', '#D4AF37', '#EDEBE6'] },
  { id: 'Industrial', label: 'Industrial', desc: 'Raw steel frameworks, reclaimed timber grain, and utilitarian hardware.', sampleColors: ['#3C3B3D', '#785038', '#8C8B88', '#B08855'] },
  { id: 'Bohemian', label: 'Bohemian', desc: 'Free-spirited layered textiles, natural rattan weaves, and botanical vitality.', sampleColors: ['#BF7258', '#D8CCA8', '#4A6B44', '#B08855'] },
  { id: 'Traditional', label: 'Traditional', desc: 'Timeless woodwork, ornate classic proportions, and enduring comfort.', sampleColors: ['#6B4423', '#785038', '#DFD8CC', '#D4AF37'] },
  { id: 'Coastal', label: 'Coastal', desc: 'Breezy linen drapery, bleached woods, sand tones, and oceanic calmness.', sampleColors: ['#E8F1F2', '#D8CCA8', '#FAF8F5', '#879883'] },
  { id: 'Eclectic', label: 'Eclectic', desc: 'Playful curation of vintage silhouettes, curated art, and rich colors.', sampleColors: ['#86113C', '#4A5B4D', '#D4AF37', '#879883'] },
];

export const QuestionnaireWizard: React.FC<QuestionnaireWizardProps> = ({
  initialData,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<QuestionnaireData>(() => {
    const draft = loadQuestionnaireDraft();
    return {
      ...draft,
      ...(initialData || {}),
      userProfile: {
        ...draft.userProfile,
        ...(initialData?.userProfile || {}),
      },
      dimensions: {
        ...draft.dimensions,
        ...(initialData?.dimensions || {}),
      },
      style: {
        ...draft.style,
        ...(initialData?.style || {}),
      },
      budget: {
        ...draft.budget,
        ...(initialData?.budget || {}),
      },
    };
  });
  const [unit, setUnit] = useState<DimensionUnit>(formData.dimensions.unit || 'cm');
  const [rawLength, setRawLength] = useState<string>(
    unit === 'metres'
      ? (formData.dimensions.lengthCm / 100).toString()
      : unit === 'feet'
      ? (formData.dimensions.lengthCm / 30.48).toFixed(1)
      : formData.dimensions.lengthCm.toString()
  );
  const [rawWidth, setRawWidth] = useState<string>(
    unit === 'metres'
      ? (formData.dimensions.widthCm / 100).toString()
      : unit === 'feet'
      ? (formData.dimensions.widthCm / 30.48).toFixed(1)
      : formData.dimensions.widthCm.toString()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState<boolean>(false);
  const [photoAnalysisNotice, setPhotoAnalysisNotice] = useState<string | null>(null);

  // Auto-save draft on changes
  useEffect(() => {
    saveQuestionnaireDraft(formData);
  }, [formData]);

  // Validation per step
  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.userProfile.profession) newErrors.profession = 'Please select or enter your profession.';
      if (formData.userProfile.dailyActivities.length === 0) newErrors.dailyActivities = 'Select at least one daily activity.';
    }

    if (currentStep === 2) {
      if (!formData.roomType) newErrors.roomType = 'Please select a room type.';
    }

    if (currentStep === 3) {
      const numL = parseFloat(rawLength);
      const numW = parseFloat(rawWidth);
      if (isNaN(numL) || numL <= 0) newErrors.length = 'Enter a valid positive length.';
      if (isNaN(numW) || numW <= 0) newErrors.width = 'Enter a valid positive width.';

      const lenCm = convertToCm(numL, unit);
      const widCm = convertToCm(numW, unit);
      if (lenCm < 150 || lenCm > 1500) newErrors.length = 'Length must be between 1.5m (150cm) and 15m.';
      if (widCm < 150 || widCm > 1500) newErrors.width = 'Width must be between 1.5m (150cm) and 15m.';
    }

    if (currentStep === 5) {
      if (!formData.style.primaryStyle) newErrors.style = 'Please choose a primary design style.';
    }

    if (currentStep === 7) {
      if (!formData.budget.totalBudgetINR || formData.budget.totalBudgetINR < 15000) {
        newErrors.budget = 'Please specify a budget of at least ₹15,000.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step === 3) {
        // Sync dimension in cm
        const lenCm = convertToCm(parseFloat(rawLength) || 400, unit);
        const widCm = convertToCm(parseFloat(rawWidth) || 350, unit);
        setFormData((prev) => ({
          ...prev,
          dimensions: {
            ...prev.dimensions,
            lengthCm: lenCm,
            widthCm: widCm,
            unit,
          },
        }));
      }
      setStep((s) => Math.min(s + 1, 7));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinish = () => {
    if (validateStep(7)) {
      onComplete({
        ...formData,
        completedAt: new Date().toISOString(),
      });
    }
  };

  // Image upload handler with client-side compression and background AI analysis
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
        setErrors({ photo: 'Please upload a valid JPG, PNG, or WebP image.' });
        return;
      }
      try {
        const compressed = await compressRoomPhoto(file, 1280, 1280, 0.82);
        setFormData((prev) => ({
          ...prev,
          photoUrl: compressed.dataUrl,
          photoName: file.name,
        }));

        // Trigger AI vision analysis in the background to detect room features & existing items
        setIsAnalyzingPhoto(true);
        setPhotoAnalysisNotice('Scanning room with AI vision to detect dimensions & existing furniture...');

        fetch('/api/scanner/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: compressed.dataUrl,
            mimeType: 'image/jpeg',
            userMeasurements: {
              lengthCm: formData.dimensions.lengthCm,
              widthCm: formData.dimensions.widthCm,
            },
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.analysis) {
              const detectedCount = data.analysis.detectedElements?.length || 0;
              setPhotoAnalysisNotice(
                `AI vision identified ${detectedCount} visible furniture element${
                  detectedCount === 1 ? '' : 's'
                } and architectural boundaries.`
              );
              setFormData((prev: any) => ({
                ...prev,
                scanAnalysis: data.analysis,
                existingLayoutItems: data.existingLayoutItems || [],
                roomType: prev.roomType || data.analysis.detectedRoomType,
                style: {
                  ...prev.style,
                  primaryStyle: prev.style.primaryStyle || data.analysis.detectedStyle,
                },
              }));
            }
          })
          .catch((err) => {
            console.warn('Background scan during questionnaire skipped:', err);
            setPhotoAnalysisNotice('Photo saved for design session reference.');
          })
          .finally(() => {
            setIsAnalyzingPhoto(false);
          });
      } catch (err) {
        console.warn('Image compression fallback to FileReader:', err);
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          setFormData((prev) => ({
            ...prev,
            photoUrl: loadEvt.target?.result as string,
            photoName: file.name,
          }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev: any) => ({
      ...prev,
      photoUrl: undefined,
      photoName: undefined,
      scanAnalysis: undefined,
      existingLayoutItems: undefined,
    }));
    setPhotoAnalysisNotice(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Header & Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
          <span className="font-semibold text-[#86113C] tracking-wider uppercase">
            Step {step} of 7
          </span>
          <button
            onClick={onCancel}
            className="text-stone-500 hover:text-stone-800 transition-colors"
          >
            Cancel & Exit
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-200/80 h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#86113C] h-full transition-all duration-300 ease-out rounded-full"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-stone-900">
            {step === 1 && 'About You & Your Lifestyle'}
            {step === 2 && 'Select Your Room Type'}
            {step === 3 && 'Room Dimensions & Openings'}
            {step === 4 && 'Room Photo (Optional Reference)'}
            {step === 5 && 'Design Style & Atmosphere'}
            {step === 6 && 'Furniture Needs & Functions'}
            {step === 7 && 'Budget & Review'}
          </h2>
        </div>
      </div>

      {/* Step Content Container */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 shadow-xs mb-8">
        {/* ================= STEP 1: USER PROFILE ================= */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">
                What is your age group?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['18-25', '26-35', '36-50', '50+'].map((age) => (
                  <button
                    key={age}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        userProfile: { ...prev.userProfile, ageGroup: age },
                      }))
                    }
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                      formData.userProfile.ageGroup === age
                        ? 'border-[#86113C] bg-[#FDF2F4] text-[#86113C] font-semibold ring-1 ring-[#86113C]'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    {age} years
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">
                Profession / Primary Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  'Student',
                  'Working Professional',
                  'Remote Freelancer',
                  'Homemaker',
                  'Retired',
                  'Creative Artist / Designer',
                ].map((prof) => (
                  <button
                    key={prof}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        userProfile: { ...prev.userProfile, profession: prof },
                      }))
                    }
                    className={`p-3 rounded-xl border text-sm text-left transition-all ${
                      formData.userProfile.profession === prof
                        ? 'border-[#86113C] bg-[#FDF2F4] text-[#86113C] font-semibold ring-1 ring-[#86113C]'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    {prof}
                  </button>
                ))}
              </div>
              {errors.profession && <p className="text-xs text-rose-600 mt-1">{errors.profession}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-stone-800 mb-2">
                  Who will use this room?
                </label>
                <select
                  value={formData.userProfile.roomUsers}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      userProfile: { ...prev.userProfile, roomUsers: e.target.value },
                    }))
                  }
                  className="w-full p-3 rounded-xl border border-stone-200 bg-white text-stone-800 text-sm focus:border-[#86113C] focus:ring-1 focus:ring-[#86113C]"
                >
                  <option value="Single individual">One person (Private)</option>
                  <option value="Couple">Couple</option>
                  <option value="Children">Children</option>
                  <option value="Family">Entire Family</option>
                  <option value="Guests">Guests & Visitors</option>
                  <option value="Shared accommodation">Shared Roommates</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-800 mb-2">
                  Regular Occupants: {formData.userProfile.occupantCount}
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={formData.userProfile.occupantCount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      userProfile: { ...prev.userProfile, occupantCount: parseInt(e.target.value) },
                    }))
                  }
                  className="w-full accent-[#86113C] mt-3"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1">
                Daily Activities in this space (Select all that apply)
              </label>
              <p className="text-xs text-stone-500 mb-3">
                This helps the layout engine allocate task lighting, ergonomics, and acoustic comfort.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'sleeping', label: 'Sleeping & Rest' },
                  { id: 'remote_work', label: 'Remote Work' },
                  { id: 'studying', label: 'Study & Reading' },
                  { id: 'relaxing', label: 'Relaxing / TV' },
                  { id: 'entertaining', label: 'Entertaining Guests' },
                  { id: 'gaming', label: 'Gaming' },
                  { id: 'exercising', label: 'Yoga / Light Exercise' },
                  { id: 'hobbies', label: 'Creative Hobbies' },
                ].map((act) => {
                  const isChecked = formData.userProfile.dailyActivities.includes(act.id);
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        const updated = isChecked
                          ? formData.userProfile.dailyActivities.filter((a) => a !== act.id)
                          : [...formData.userProfile.dailyActivities, act.id];
                        setFormData((prev) => ({
                          ...prev,
                          userProfile: { ...prev.userProfile, dailyActivities: updated },
                        }));
                      }}
                      className={`p-2.5 rounded-xl border text-xs text-left flex items-center justify-between transition-all ${
                        isChecked
                          ? 'border-[#86113C] bg-[#FDF2F4] text-[#86113C] font-semibold'
                          : 'border-stone-200 text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <span>{act.label}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-[#86113C]" />}
                    </button>
                  );
                })}
              </div>
              {errors.dailyActivities && <p className="text-xs text-rose-600 mt-1">{errors.dailyActivities}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1">
                Relevant Future Needs (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Planning to add second monitor or baby crib next year"
                value={formData.userProfile.futureNeeds}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    userProfile: { ...prev.userProfile, futureNeeds: e.target.value },
                  }))
                }
                className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:border-[#86113C] focus:ring-1 focus:ring-[#86113C]"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2: ROOM TYPE ================= */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1">
                Which room would you like to design?
              </label>
              <p className="text-xs text-stone-500 mb-4">
                Furniture categories and spatial clearance algorithms are customized for each room type.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { id: 'bedroom' as RoomType, label: 'Bedroom', desc: 'Sleep sanctuary & personal retreat' },
                  { id: 'living_room' as RoomType, label: 'Living Room', desc: 'Hospitality, lounge & entertainment' },
                  { id: 'home_office' as RoomType, label: 'Home Office', desc: 'Productive ergonomic workstation' },
                  { id: 'study_room' as RoomType, label: 'Study Room', desc: 'Focus desk, books & quiet study' },
                  { id: 'guest_room' as RoomType, label: 'Guest Room', desc: 'Versatile hospitality room' },
                  { id: 'dining_room' as RoomType, label: 'Dining Room', desc: 'Dining table & buffet storage' },
                  { id: 'studio_apartment' as RoomType, label: 'Studio Apartment', desc: 'All-in-one multi-zone living' },
                  { id: 'other' as RoomType, label: 'Multi-Purpose', desc: 'Custom flex arrangement' },
                ].map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        roomType: room.id,
                        functionalNeeds: {
                          ...prev.functionalNeeds,
                          furnitureNeeds: getDefaultFurnitureNeedsForRoomType(room.id),
                        },
                      }))
                    }
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      formData.roomType === room.id
                        ? 'border-[#86113C] bg-[#FDF2F4] text-stone-900 ring-2 ring-[#86113C]'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-stone-900">{room.label}</div>
                      <div className="text-xs text-stone-500 mt-1 leading-snug">{room.desc}</div>
                    </div>
                    {formData.roomType === room.id && (
                      <div className="mt-3 text-xs font-semibold text-[#86113C] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {errors.roomType && <p className="text-xs text-rose-600 mt-2">{errors.roomType}</p>}
            </div>
          </div>
        )}

        {/* ================= STEP 3: DIMENSIONS & OPENINGS ================= */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-stone-100">
              <div>
                <h3 className="text-sm font-semibold text-stone-800">Room Measurement Unit</h3>
                <p className="text-xs text-stone-500">All internal calculations stay consistent in centimeters.</p>
              </div>
              <div className="flex items-center bg-stone-100 p-1 rounded-xl">
                {(['cm', 'metres', 'feet'] as DimensionUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      setUnit(u);
                      if (u === 'metres') {
                        setRawLength((formData.dimensions.lengthCm / 100).toString());
                        setRawWidth((formData.dimensions.widthCm / 100).toString());
                      } else if (u === 'feet') {
                        setRawLength((formData.dimensions.lengthCm / 30.48).toFixed(1));
                        setRawWidth((formData.dimensions.widthCm / 30.48).toFixed(1));
                      } else {
                        setRawLength(formData.dimensions.lengthCm.toString());
                        setRawWidth(formData.dimensions.widthCm.toString());
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                      unit === u ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Length & Width */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Room Length ({unit})
                </label>
                <input
                  type="number"
                  step={unit === 'cm' ? '5' : '0.1'}
                  value={rawLength}
                  onChange={(e) => setRawLength(e.target.value)}
                  placeholder={unit === 'cm' ? '420' : unit === 'metres' ? '4.2' : '13.8'}
                  className="w-full p-3 rounded-xl border border-stone-200 text-stone-900 font-semibold focus:border-[#86113C] focus:ring-1 focus:ring-[#86113C]"
                />
                {errors.length && <p className="text-xs text-rose-600 mt-1">{errors.length}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Room Width ({unit})
                </label>
                <input
                  type="number"
                  step={unit === 'cm' ? '5' : '0.1'}
                  value={rawWidth}
                  onChange={(e) => setRawWidth(e.target.value)}
                  placeholder={unit === 'cm' ? '350' : unit === 'metres' ? '3.5' : '11.5'}
                  className="w-full p-3 rounded-xl border border-stone-200 text-stone-900 font-semibold focus:border-[#86113C] focus:ring-1 focus:ring-[#86113C]"
                />
                {errors.width && <p className="text-xs text-rose-600 mt-1">{errors.width}</p>}
              </div>
            </div>

            {/* Door Configuration */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Primary Entry Door
                </span>
                <span className="text-xs text-stone-500">
                  Required to reserve clearance and avoid blockages
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Door Wall</label>
                  <select
                    value={formData.dimensions.door.wall}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dimensions: {
                          ...prev.dimensions,
                          door: { ...prev.dimensions.door, wall: e.target.value as WallSide },
                        },
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-stone-200 bg-white"
                  >
                    <option value="south">South Wall (Bottom)</option>
                    <option value="north">North Wall (Top)</option>
                    <option value="west">West Wall (Left)</option>
                    <option value="east">East Wall (Right)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-600 font-medium mb-1">Door Width (cm)</label>
                  <input
                    type="number"
                    value={formData.dimensions.door.widthCm}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dimensions: {
                          ...prev.dimensions,
                          door: { ...prev.dimensions.door, widthCm: parseInt(e.target.value) || 90 },
                        },
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-stone-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 font-medium mb-1">Offset from Wall Corner (cm)</label>
                  <input
                    type="number"
                    value={formData.dimensions.door.positionCm}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dimensions: {
                          ...prev.dimensions,
                          door: { ...prev.dimensions.door, positionCm: parseInt(e.target.value) || 40 },
                        },
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-stone-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 font-medium mb-1">Door Swing Direction</label>
                  <select
                    value={formData.dimensions.door.swing}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dimensions: {
                          ...prev.dimensions,
                          door: { ...prev.dimensions.door, swing: e.target.value as DoorSwing },
                        },
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-stone-200 bg-white"
                  >
                    <option value="inward-right">Inward Right</option>
                    <option value="inward-left">Inward Left</option>
                    <option value="outward-right">Outward</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Window Configuration */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Window & Daylight Source
                </span>
                <span className="text-xs text-stone-500">
                  Used for placing desks near natural light
                </span>
              </div>

              {formData.dimensions.windows.map((win, idx) => (
                <div key={win.id || idx} className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-600 font-medium mb-1">Window Wall</label>
                    <select
                      value={win.wall}
                      onChange={(e) => {
                        const updated = [...formData.dimensions.windows];
                        updated[idx].wall = e.target.value as WallSide;
                        setFormData((prev) => ({
                          ...prev,
                          dimensions: { ...prev.dimensions, windows: updated },
                        }));
                      }}
                      className="w-full p-2 rounded-lg border border-stone-200 bg-white"
                    >
                      <option value="east">East Wall</option>
                      <option value="west">West Wall</option>
                      <option value="north">North Wall</option>
                      <option value="south">South Wall</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-600 font-medium mb-1">Window Width (cm)</label>
                    <input
                      type="number"
                      value={win.widthCm}
                      onChange={(e) => {
                        const updated = [...formData.dimensions.windows];
                        updated[idx].widthCm = parseInt(e.target.value) || 120;
                        setFormData((prev) => ({
                          ...prev,
                          dimensions: { ...prev.dimensions, windows: updated },
                        }));
                      }}
                      className="w-full p-2 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-medium mb-1">Position on Wall (cm)</label>
                    <input
                      type="number"
                      value={win.positionCm}
                      onChange={(e) => {
                        const updated = [...formData.dimensions.windows];
                        updated[idx].positionCm = parseInt(e.target.value) || 60;
                        setFormData((prev) => ({
                          ...prev,
                          dimensions: { ...prev.dimensions, windows: updated },
                        }));
                      }}
                      className="w-full p-2 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Dimension Proportional Preview Box */}
            <div className="p-4 bg-[#FAF8F5] rounded-xl border border-stone-200 text-center">
              <div className="text-xs text-stone-500 font-medium mb-2">
                Room Boundary Proportion Preview ({convertToCm(parseFloat(rawLength) || 400, unit)} × {convertToCm(parseFloat(rawWidth) || 350, unit)} cm)
              </div>
              <div className="h-32 flex items-center justify-center">
                <div
                  className="border-2 border-dashed border-[#86113C] bg-white rounded-md shadow-xs flex items-center justify-center text-xs font-semibold text-stone-700 relative"
                  style={{
                    width: `${Math.min(220, Math.max(120, (parseFloat(rawLength) || 400) * 0.4))}px`,
                    height: `${Math.min(110, Math.max(60, (parseFloat(rawWidth) || 350) * 0.3))}px`,
                  }}
                >
                  <span className="text-[11px] text-stone-500">
                    Floor Plan Canvas
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: PHOTO UPLOAD ================= */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Visual Reference Only:</strong> Any uploaded room photograph serves as an aesthetic and inspirational reference. Entered measurements remain the architectural source of truth for the 2D floor planner.
              </div>
            </div>

            {formData.photoUrl ? (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-video max-h-72 w-full flex items-center justify-center">
                  <img
                    src={formData.photoUrl}
                    alt="Uploaded Room Reference"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute top-3 right-3 p-2 bg-stone-900/80 hover:bg-stone-900 text-white rounded-full transition-colors shadow-sm"
                    title="Remove Photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span className="truncate">{formData.photoName || 'Room_Photo.jpg'}</span>
                  <label className="text-[#86113C] hover:underline cursor-pointer font-semibold">
                    Replace Photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {isAnalyzingPhoto && (
                  <div className="p-3 rounded-xl bg-[#FDF2F4] border border-[#F8C8D4] text-xs text-[#86113C] flex items-center gap-2 font-medium animate-pulse">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Scanning room photo with AI vision to map geometry and detect furniture...</span>
                  </div>
                )}
                {!isAnalyzingPhoto && photoAnalysisNotice && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{photoAnalysisNotice}</span>
                  </div>
                )}
              </div>
            ) : (
              <label className="border-2 border-dashed border-stone-300 hover:border-[#86113C] rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-stone-50/50 hover:bg-[#FDF2F4]/30">
                <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-stone-200 flex items-center justify-center text-stone-600 mb-3">
                  <Upload className="w-5 h-5 text-[#86113C]" />
                </div>
                <div className="text-sm font-semibold text-stone-800">
                  Click to upload room photo
                </div>
                <div className="text-xs text-stone-500 mt-1 max-w-sm">
                  JPG, JPEG, PNG, or WebP. Take a wide photo standing in the doorway.
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}

            <div className="text-center text-xs text-stone-500">
              No photo handy? Feel free to skip this step and continue directly to style selection.
            </div>
          </div>
        )}

        {/* ================= STEP 5: STYLE SELECTION ================= */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1">
                Select Primary Design Style
              </label>
              <p className="text-xs text-stone-500 mb-4">
                Choose the design language that best reflects your desired atmosphere.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {DESIGN_STYLES.map((st) => {
                  const isSelected = formData.style.primaryStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          style: { ...prev.style, primaryStyle: st.id },
                        }))
                      }
                      className={`p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#86113C] bg-[#FDF2F4] ring-2 ring-[#86113C]'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-sm text-stone-900">{st.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#86113C]" />}
                      </div>
                      <p className="text-xs text-stone-600 leading-snug mb-3">{st.desc}</p>
                      <div className="flex items-center gap-1.5">
                        {st.sampleColors.map((hex, i) => (
                          <div
                            key={i}
                            className="w-3.5 h-3.5 rounded-full border border-black/10"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.style && <p className="text-xs text-rose-600 mt-2">{errors.style}</p>}
            </div>

            {/* Atmosphere & Space Philosophy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Desired Atmosphere
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grounded, warm, clutter-free, relaxing evening haven"
                  value={formData.style.atmosphere}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      style: { ...prev.style, atmosphere: e.target.value },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:border-[#86113C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Space Density Philosophy
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'clutter-free', label: 'Minimalist' },
                    { id: 'balanced', label: 'Balanced' },
                    { id: 'decorative', label: 'Layered' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          style: { ...prev.style, spacePhilosophy: p.id as any },
                        }))
                      }
                      className={`py-2 px-1 text-xs font-medium rounded-lg border transition-colors ${
                        formData.style.spacePhilosophy === p.id
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 6: FURNITURE REQUIREMENTS ================= */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-stone-800 mb-1">
                Room Furniture Requirements
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                Mark items as Required, Optional, Already Owned, or Not Needed.
              </p>

              <div className="space-y-2.5">
                {(
                  [
                    { cat: 'beds' as FurnitureCategory, label: 'Bed & Mattress' },
                    { cat: 'sofas' as FurnitureCategory, label: 'Sofa / Seating' },
                    { cat: 'desks' as FurnitureCategory, label: 'Work / Study Desk' },
                    { cat: 'chairs' as FurnitureCategory, label: 'Office or Accent Chair' },
                    { cat: 'wardrobes' as FurnitureCategory, label: 'Wardrobe / Closet' },
                    { cat: 'storage' as FurnitureCategory, label: 'Credenza / Sideboard' },
                    { cat: 'bookshelves' as FurnitureCategory, label: 'Bookshelf & Display' },
                    { cat: 'tables' as FurnitureCategory, label: 'Coffee or Side Tables' },
                    { cat: 'tv_units' as FurnitureCategory, label: 'TV Media Console' },
                    { cat: 'lighting' as FurnitureCategory, label: 'Floor & Table Lamps' },
                    { cat: 'rugs' as FurnitureCategory, label: 'Floor Area Rug' },
                    { cat: 'decor_plants' as FurnitureCategory, label: 'Indoor Potted Plants' },
                  ] as const
                ).map(({ cat, label }) => {
                  const currentVal = formData.functionalNeeds.furnitureNeeds[cat] || 'optional';
                  return (
                    <div
                      key={cat}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-stone-100 bg-[#FAF8F5] gap-2"
                    >
                      <span className="text-xs font-semibold text-stone-800">{label}</span>
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        {(
                          [
                            { val: 'required', label: 'Required' },
                            { val: 'optional', label: 'Optional' },
                            { val: 'owned', label: 'Already Owned' },
                            { val: 'none', label: 'Not Needed' },
                          ] as { val: FurnitureRequirement; label: string }[]
                        ).map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                functionalNeeds: {
                                  ...prev.functionalNeeds,
                                  furnitureNeeds: {
                                    ...prev.functionalNeeds.furnitureNeeds,
                                    [cat]: opt.val,
                                  },
                                },
                              }))
                            }
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                              currentVal === opt.val
                                ? opt.val === 'required'
                                  ? 'bg-[#86113C] text-white'
                                  : opt.val === 'owned'
                                  ? 'bg-emerald-700 text-white'
                                  : opt.val === 'optional'
                                  ? 'bg-stone-700 text-white'
                                  : 'bg-stone-300 text-stone-700'
                                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Special considerations */}
            <div className="pt-4 border-t border-stone-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-3">
                Functional Priorities & Accessibility
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {[
                  { key: 'extraStorage', label: 'Extra Storage Solutions' },
                  { key: 'dedicatedWorkArea', label: 'Dedicated Work / Study Zone' },
                  { key: 'compactLayoutPriority', label: 'Compact / Max Space Priority' },
                  { key: 'accessibleMovement', label: 'Wide Walking Clearances' },
                  { key: 'petFriendly', label: 'Pet-Friendly Durable Fabrics' },
                  { key: 'childFriendly', label: 'Child-Safe Rounded Edges' },
                ].map((item) => {
                  const isChecked = (formData.functionalNeeds as any)[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          functionalNeeds: {
                            ...prev.functionalNeeds,
                            [item.key]: !isChecked,
                          },
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        isChecked
                          ? 'border-[#86113C] bg-[#FDF2F4] text-[#86113C] font-semibold'
                          : 'border-stone-200 text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-[#86113C]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 7: BUDGET & REVIEW ================= */}
        {step === 7 && (
          <div className="space-y-8">
            {/* Header intro */}
            <div>
              <span className="text-xs font-semibold text-[#86113C] tracking-wider uppercase">
                Step 7 · Financial & Sourcing Preferences
              </span>
              <h3 className="font-serif-display text-xl font-bold text-stone-900 mt-1">
                Budget Personalisation & Furnishing Plan
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                DecorHub synchronizes layout suggestions, materials, and product recommendations to your financial comfort zone.
              </p>
            </div>

            {/* QUESTION 1: Total Budget */}
            <div className="p-5 rounded-2xl bg-stone-50/70 border border-stone-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-[#86113C]" />
                    <span>Question 1: What is your total budget for this room makeover?</span>
                  </label>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Select a suggested tier or type any custom amount in Indian Rupees (INR).
                  </p>
                </div>
              </div>

              {/* Suggested quick amounts */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { amt: 50000, label: '₹50K · Compact' },
                  { amt: 85000, label: '₹85K · Balanced' },
                  { amt: 125000, label: '₹1.25L · Standard' },
                  { amt: 200000, label: '₹2L · Premium' },
                  { amt: 350000, label: '₹3.5L · Curated' },
                  { amt: 500000, label: '₹5L+ · Luxury' },
                ].map((item) => (
                  <button
                    key={item.amt}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        budget: { ...prev.budget, totalBudgetINR: item.amt },
                      }))
                    }
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${
                      formData.budget.totalBudgetINR === item.amt
                        ? 'border-[#86113C] bg-[#FDF2F4] text-[#86113C] ring-1 ring-[#86113C] shadow-2xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="pt-1">
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-stone-600 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    step="5000"
                    placeholder="Enter custom INR amount"
                    value={formData.budget.totalBudgetINR || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        budget: {
                          ...prev.budget,
                          totalBudgetINR: parseInt(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white font-semibold text-stone-900 focus:border-[#86113C] focus:ring-1 focus:ring-[#86113C]"
                  />
                </div>
                {errors.budget && <p className="text-xs text-rose-600 mt-1">{errors.budget}</p>}
              </div>
            </div>

            {/* QUESTION 2: What should your budget cover? */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/90 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-[#86113C]" />
                  <span>Question 2: What should your budget cover?</span>
                </label>
                <p className="text-xs text-stone-500 mt-0.5">
                  Select your expected scope. We will account for estimates accordingly.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'furniture_only' as BudgetCoverageScope,
                    title: 'Furniture only',
                    desc: 'Core furnishings only (beds, sofas, desks, wardrobes)',
                    inclusions: { includesFurniture: true, includesDecor: false, includesLighting: false, includesDelivery: false, includesInstallation: false, includesRenovation: false },
                  },
                  {
                    id: 'furniture_decor' as BudgetCoverageScope,
                    title: 'Furniture and decor',
                    desc: 'Furniture plus rugs, textiles, cushions, and planters',
                    inclusions: { includesFurniture: true, includesDecor: true, includesLighting: false, includesDelivery: false, includesInstallation: false, includesRenovation: false },
                  },
                  {
                    id: 'furniture_decor_lighting' as BudgetCoverageScope,
                    title: 'Furniture, decor, & lighting',
                    desc: 'Complete aesthetic setup with ambient & task lamps',
                    inclusions: { includesFurniture: true, includesDecor: true, includesLighting: true, includesDelivery: false, includesInstallation: false, includesRenovation: false },
                  },
                  {
                    id: 'full_turnkey' as BudgetCoverageScope,
                    title: 'Turnkey: Decor + Delivery + Installation',
                    desc: 'Includes white-glove shipping & carpentry installation',
                    inclusions: { includesFurniture: true, includesDecor: true, includesLighting: true, includesDelivery: true, includesInstallation: true, includesRenovation: false },
                  },
                  {
                    id: 'complete_renovation' as BudgetCoverageScope,
                    title: 'Complete room makeover & renovation',
                    desc: 'Covers furnishing plus basic civil/wall painting refresh',
                    inclusions: { includesFurniture: true, includesDecor: true, includesLighting: true, includesDelivery: true, includesInstallation: true, includesRenovation: true },
                  },
                  {
                    id: 'custom' as BudgetCoverageScope,
                    title: 'Custom selection',
                    desc: 'Pick your own exact set of inclusions and exclusions',
                    inclusions: null,
                  },
                ].map((opt) => {
                  const isSelected = (formData.budget.coverageScope || 'full_turnkey') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (opt.inclusions) {
                          setFormData((prev) => ({
                            ...prev,
                            budget: {
                              ...prev.budget,
                              coverageScope: opt.id,
                              ...opt.inclusions,
                            },
                          }));
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            budget: {
                              ...prev.budget,
                              coverageScope: 'custom',
                            },
                          }));
                        }
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#86113C] bg-[#FDF2F4] ring-1 ring-[#86113C]'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-[#86113C]' : 'text-stone-800'}`}>
                          {opt.title}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#86113C]" />}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Granular custom toggles (visible if custom selected or for fine-tuning) */}
              {(formData.budget.coverageScope === 'custom' || formData.budget.coverageScope === 'full_turnkey') && (
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 mt-2 space-y-2">
                  <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                    Fine-tune Inclusions:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-stone-700">
                    {[
                      { key: 'includesFurniture', label: 'Core Furniture' },
                      { key: 'includesDecor', label: 'Rugs & Art Decor' },
                      { key: 'includesLighting', label: 'Lighting Fixtures' },
                      { key: 'includesDelivery', label: 'Delivery (₹3,500)' },
                      { key: 'includesInstallation', label: 'Assembly (₹4,500)' },
                      { key: 'includesRenovation', label: 'Civil Paint/Wall Prep' },
                    ].map((item) => {
                      const checked = (formData.budget as any)[item.key] ?? false;
                      return (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                budget: {
                                  ...prev.budget,
                                  coverageScope: 'custom',
                                  [item.key]: e.target.checked,
                                },
                              }))
                            }
                            className="accent-[#86113C] rounded"
                          />
                          <span className="text-xs">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* QUESTION 3: How strictly should we follow your budget? */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/90 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#86113C]" />
                  <span>Question 3: How strictly should we follow your budget?</span>
                </label>
                <p className="text-xs text-stone-500 mt-0.5">
                  Guide the recommendation engine on flexibility vs hard price constraints.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'strict' as BudgetStrictness,
                    title: 'Strict budget',
                    desc: 'Stay strictly within my limit. Never suggest combinations that exceed it.',
                    badge: 'Firm Cap',
                  },
                  {
                    id: 'flexible' as BudgetStrictness,
                    title: 'Flexible budget',
                    desc: 'Allow slight 10–15% increases if they unlock substantially higher durability or design.',
                    badge: 'Balanced',
                  },
                  {
                    id: 'quality_first' as BudgetStrictness,
                    title: 'Quality-first',
                    desc: 'Prioritise heirloom craftsmanship and ergonomics, explaining where extra cost adds value.',
                    badge: 'Durability',
                  },
                ].map((tier) => {
                  const isSelected = (formData.budget.strictness || 'flexible') === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          budget: { ...prev.budget, strictness: tier.id },
                        }))
                      }
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#86113C] bg-[#FDF2F4] ring-1 ring-[#86113C]'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-[#86113C]' : 'text-stone-800'}`}>
                          {tier.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-semibold">
                          {tier.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                        {tier.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUESTION 4: What matters most when selecting furniture? */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/90 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#86113C]" />
                  <span>Question 4: What matters most when selecting furniture?</span>
                </label>
                <p className="text-xs text-stone-500 mt-0.5">
                  Select all priorities that define your purchasing criteria (multiple selections allowed).
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'affordable' as FurnitureValueDriver, label: 'Affordable prices' },
                  { id: 'best_value' as FurnitureValueDriver, label: 'Best value for money' },
                  { id: 'quality_durability' as FurnitureValueDriver, label: 'Quality & durability' },
                  { id: 'comfort_ergonomics' as FurnitureValueDriver, label: 'Comfort & ergonomics' },
                  { id: 'style_appearance' as FurnitureValueDriver, label: 'Appearance & style' },
                  { id: 'storage_functionality' as FurnitureValueDriver, label: 'Storage & functionality' },
                  { id: 'child_safety' as FurnitureValueDriver, label: 'Child safety & family needs' },
                  { id: 'sustainable' as FurnitureValueDriver, label: 'Sustainable materials' },
                ].map((driver) => {
                  const currentList = formData.budget.selectionDrivers || ['best_value', 'quality_durability'];
                  const isChecked = currentList.includes(driver.id);
                  return (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => {
                        const nextList = isChecked
                          ? currentList.filter((d) => d !== driver.id)
                          : [...currentList, driver.id];
                        setFormData((prev) => ({
                          ...prev,
                          budget: {
                            ...prev.budget,
                            selectionDrivers: nextList.length > 0 ? nextList : ['best_value'],
                          },
                        }));
                      }}
                      className={`p-3 rounded-xl border text-xs text-left flex items-center justify-between transition-all ${
                        isChecked
                          ? 'border-[#86113C] bg-[#FDF2F4] text-[#86113C] font-semibold ring-1 ring-[#86113C]'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <span className="truncate">{driver.label}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-[#86113C] shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUESTION 5: How would you like to furnish the room? */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/90 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#86113C]" />
                  <span>Question 5: How would you like to furnish the room?</span>
                </label>
                <p className="text-xs text-stone-500 mt-0.5">
                  Choose whether you want everything purchased at once or structured in phases.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'entire_room' as FurnishingPace,
                    title: 'Furnish the entire room',
                    desc: 'Source and place all essential and accent pieces now within current budget.',
                  },
                  {
                    id: 'essential_first' as FurnishingPace,
                    title: 'Buy essential items first',
                    desc: 'Prioritize daily foundation pieces (bed, wardrobe, primary seating), adding accessories later.',
                  },
                  {
                    id: 'phased_plan' as FurnishingPace,
                    title: 'Follow a phased furnishing plan',
                    desc: 'Structured 3-phase purchasing roadmap with future milestone investments.',
                  },
                ].map((pace) => {
                  const isSelected = (formData.budget.furnishingPace || 'entire_room') === pace.id;
                  return (
                    <button
                      key={pace.id}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          budget: { ...prev.budget, furnishingPace: pace.id },
                        }))
                      }
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#86113C] bg-[#FDF2F4] ring-1 ring-[#86113C]'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-[#86113C]' : 'text-stone-800'}`}>
                          {pace.title}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#86113C]" />}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                        {pace.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Answers Summary Review Card */}
            <div className="p-5 rounded-2xl border border-stone-200 bg-[#FAF8F5] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="font-serif-display text-base font-bold text-stone-900">
                  Questionnaire Summary Review
                </span>
                <span className="text-xs text-[#86113C] font-semibold">Ready to synthesize</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-stone-500 font-medium">Room & Users</div>
                  <div className="font-semibold text-stone-900 capitalize">
                    {formData.roomType.replace('_', ' ')} · {formData.userProfile.occupantCount} {formData.userProfile.occupantCount === 1 ? 'person' : 'people'}
                  </div>
                </div>

                <div>
                  <div className="text-stone-500 font-medium">Dimensions</div>
                  <div className="font-semibold text-stone-900">
                    {formData.dimensions.lengthCm} × {formData.dimensions.widthCm} cm
                  </div>
                </div>

                <div>
                  <div className="text-stone-500 font-medium">Design Style</div>
                  <div className="font-semibold text-[#86113C]">
                    {formData.style.primaryStyle}
                  </div>
                </div>

                <div>
                  <div className="text-stone-500 font-medium">Target Budget</div>
                  <div className="font-semibold text-stone-900">
                    {formatINR(formData.budget.totalBudgetINR)}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-stone-600">
                <div>
                  <span className="text-stone-400 font-medium">Coverage: </span>
                  <span className="font-semibold capitalize">{(formData.budget.coverageScope || 'full_turnkey').replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-medium">Flexibility: </span>
                  <span className="font-semibold capitalize">{formData.budget.strictness || 'flexible'}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-medium">Furnishing Pace: </span>
                  <span className="font-semibold capitalize">{(formData.budget.furnishingPace || 'entire_room').replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="px-5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-500 hover:text-stone-700 text-sm font-medium"
          >
            Cancel
          </button>
        )}

        {step < 7 ? (
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-[#86113C] hover:bg-[#700E32] text-white text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <span>Continue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="px-8 py-3 rounded-xl bg-[#86113C] hover:bg-[#700E32] active:bg-[#5A0B28] text-white text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate My Design</span>
          </button>
        )}
      </div>
    </div>
  );
};
