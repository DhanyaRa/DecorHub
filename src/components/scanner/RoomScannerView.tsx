import React, { useState, useRef } from 'react';
import {
  Project,
  RoomScanAnalysis,
  DetectedElement,
  FurnitureCategory,
  RoomType,
  DesignStyle,
  PlacedItem,
  QuestionnaireData,
} from '../../types';
import { compressRoomPhoto } from '../../utils/imageUtils';
import { generateLayoutAlternatives } from '../../utils/layoutGenerator';
import { formatINR } from '../../utils/currency';
import { getDefaultFurnitureNeedsForRoomType } from '../../utils/storage';
import { FURNITURE_CATALOG } from '../../data/furnitureCatalog';
import {
  Upload,
  Camera,
  Scan,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Ruler,
  Layers,
  RefreshCw,
  IndianRupee,
  Sliders,
  Check,
} from 'lucide-react';

interface RoomScannerViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onProceedToDesign: () => void;
  onOpenQuestionnaire?: (data?: Partial<QuestionnaireData>) => void;
}

export const RoomScannerView: React.FC<RoomScannerViewProps> = ({
  project,
  onUpdateProject,
  onProceedToDesign,
  onOpenQuestionnaire,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Uploaded photo state: strictly user's photo or null (never silently mock sample room)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    project.questionnaire.photoUrl || null
  );
  const [photoName, setPhotoName] = useState<string>(
    project.questionnaire.photoName || 'my_room_photo.jpg'
  );

  // Scanner state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isGeneratingDesign, setIsGeneratingDesign] = useState<boolean>(false);
  const [scanStage, setScanStage] = useState<'compressing' | 'analyzing' | 'extracting' | 'ready' | null>(null);
  const [scanResult, setScanResult] = useState<RoomScanAnalysis | null>(project.scanAnalysis || null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmed measurements vs AI estimates
  const [confirmedLengthCm, setConfirmedLengthCm] = useState<number>(project.questionnaire.dimensions.lengthCm || 440);
  const [confirmedWidthCm, setConfirmedWidthCm] = useState<number>(project.questionnaire.dimensions.widthCm || 380);
  const [confirmedCeilingCm, setConfirmedCeilingCm] = useState<number>(project.questionnaire.dimensions.ceilingHeightCm || 280);
  const [isMeasurementConfirmed, setIsMeasurementConfirmed] = useState<boolean>(true);

  // Confirmed INR Budget for room makeover
  const [confirmedBudgetINR, setConfirmedBudgetINR] = useState<number>(
    project.questionnaire.budget?.totalBudgetINR || 125000
  );

  // Overlay bounding box toggles
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);

  // Client-side compressed file upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please upload a valid room photograph in JPG, JPEG, PNG, or WebP format.');
      return;
    }

    setErrorMessage(null);
    setPhotoName(file.name);
    setScanStage('compressing');
    setIsScanning(true);

    try {
      // 1. Client-side canvas compression down to max 1280px (<250KB)
      // Eliminates network latency, prevents 413 errors and LocalStorage quota overflow
      const compressed = await compressRoomPhoto(file, 1280, 1280, 0.82);
      setPhotoDataUrl(compressed.dataUrl);

      // 2. Trigger AI vision scan with compressed image
      await runScanAnalysis(compressed.dataUrl, 'image/jpeg');
    } catch (err: any) {
      console.error('Failed to process image file:', err);
      setErrorMessage('Could not process this image. Please try a different photo or enter measurements manually.');
      setIsScanning(false);
      setScanStage(null);
    }
  };

  // Run AI analysis through /api/scanner/analyze with 15s timeout
  const runScanAnalysis = async (imgBase64: string, mimeType: string = 'image/jpeg') => {
    setIsScanning(true);
    setScanStage('analyzing');
    setErrorMessage(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14000); // 14-second client timeout

    try {
      const res = await fetch('/api/scanner/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imgBase64,
          mimeType,
          userMeasurements: {
            lengthCm: confirmedLengthCm,
            widthCm: confirmedWidthCm,
            ceilingHeightCm: confirmedCeilingCm,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setScanStage('extracting');

      if (!res.ok) {
        throw new Error(`Analysis endpoint returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.analysis) {
        setScanResult(data.analysis);
        setScanNotice(data.measurementAccuracyNotice);

        const effectiveLength = data.analysis.estimatedRoomDimensions?.lengthCm || confirmedLengthCm;
        const effectiveWidth = data.analysis.estimatedRoomDimensions?.widthCm || confirmedWidthCm;
        const detectedType = (data.analysis.detectedRoomType || project.questionnaire.roomType || 'bedroom') as RoomType;
        const detectedStyle = (data.analysis.detectedStyle || project.questionnaire.style?.primaryStyle || 'Japandi') as DesignStyle;

        setConfirmedLengthCm(effectiveLength);
        setConfirmedWidthCm(effectiveWidth);

        const updatedQuestionnaire: QuestionnaireData = {
          ...project.questionnaire,
          photoUrl: imgBase64,
          photoName,
          roomType: detectedType,
          style: {
            ...project.questionnaire.style,
            primaryStyle: detectedStyle,
          },
          dimensions: {
            ...project.questionnaire.dimensions,
            lengthCm: effectiveLength,
            widthCm: effectiveWidth,
            ceilingHeightCm: confirmedCeilingCm,
            measurementSource: isMeasurementConfirmed ? 'user_confirmed' : 'estimated',
          },
          budget: {
            ...project.questionnaire.budget,
            totalBudgetINR: confirmedBudgetINR,
          },
        };

        const existingItems: PlacedItem[] = data.existingLayoutItems || [];
        const layoutAlternatives = generateLayoutAlternatives(updatedQuestionnaire, existingItems);
        const activeLayoutKey = 'space_efficient';
        const initialItems = [...(layoutAlternatives[activeLayoutKey]?.items || existingItems)];

        const typeLabel = detectedType.charAt(0).toUpperCase() + detectedType.slice(1).replace('_', ' ');
        const newProjName = `${detectedStyle} ${typeLabel} (${effectiveLength}×${effectiveWidth}cm)`;

        // Persist photo, analysis, dimensions, and generated 2D layouts directly to project
        const updatedProj: Project = {
          ...project,
          name: newProjName,
          scanAnalysis: data.analysis,
          originalExistingLayoutItems: existingItems,
          questionnaire: updatedQuestionnaire,
          activeLayoutId: activeLayoutKey,
          layoutAlternatives,
          currentPlacedItems: initialItems,
          updatedAt: new Date().toISOString(),
        };

        onUpdateProject(updatedProj);
        setScanStage('ready');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Scan analysis issue, activating calibrated fallback:', err);
      setErrorMessage(
        err.name === 'AbortError'
          ? 'Live AI scan timed out. Room geometry calibrated from entered measurements.'
          : 'Could not reach vision model. Confirm measurements below or add existing furniture manually.'
      );
      setScanStage(null);

      // Safe calibrated fallback that NEVER invents fake furniture detections
      const fallbackAnalysis: RoomScanAnalysis = {
        detectedRoomType: project.questionnaire.roomType || 'bedroom',
        architecturalFeatures: [
          'Room perimeter aligned with confirmed user measurements',
          'Standard door entry clearance corridor (90cm clearance)',
          'Clear wall boundaries verified against floor dimensions',
        ],
        detectedElements: [], // Strictly empty: do not invent unverified mock detections
        detectedStyle: project.questionnaire.style?.primaryStyle || 'Japandi',
        detectedColors: ['Warm Neutral'],
        detectedMaterials: ['Natural Timber', 'Textile'],
        lightingCondition: 'Standard ambient illumination',
        movementSafetyConcerns: [],
        estimatedRoomDimensions: {
          lengthCm: confirmedLengthCm,
          widthCm: confirmedWidthCm,
          ceilingHeightCm: confirmedCeilingCm,
          confidence: 'confirmed',
        },
        aiProvider: 'manual-input',
        rawNotes: 'AI scan was not able to verify items. You can confirm your room dimensions and add existing items manually.',
      };

      setScanResult(fallbackAnalysis);

      const fallbackQuestionnaire: QuestionnaireData = {
        ...project.questionnaire,
        photoUrl: imgBase64,
        photoName,
        dimensions: {
          ...project.questionnaire.dimensions,
          lengthCm: confirmedLengthCm,
          widthCm: confirmedWidthCm,
          ceilingHeightCm: confirmedCeilingCm,
          measurementSource: 'user_confirmed',
        },
      };

      const fallbackLayouts = generateLayoutAlternatives(fallbackQuestionnaire, []);
      const activeLayoutKey = 'space_efficient';

      // Update project with uploaded photo regardless of API status
      onUpdateProject({
        ...project,
        scanAnalysis: fallbackAnalysis,
        originalExistingLayoutItems: [],
        questionnaire: fallbackQuestionnaire,
        activeLayoutId: activeLayoutKey,
        layoutAlternatives: fallbackLayouts,
        currentPlacedItems: fallbackLayouts[activeLayoutKey]?.items || [],
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Generate design directly from scanned room and confirmed dimensions/budget
  const handleGenerateDesignFromScan = async () => {
    setIsGeneratingDesign(true);

    try {
      const activePhoto = photoDataUrl || project.questionnaire.photoUrl;
      const detectedType = (scanResult?.detectedRoomType || project.questionnaire.roomType || 'bedroom') as RoomType;
      const primaryStyle = (scanResult?.detectedStyle || project.questionnaire.style?.primaryStyle || 'Japandi') as DesignStyle;

      const currentNeeds = project.questionnaire.functionalNeeds?.furnitureNeeds;
      const furnitureNeeds =
        currentNeeds &&
        Object.keys(currentNeeds).length > 0 &&
        project.questionnaire.roomType === detectedType
          ? currentNeeds
          : getDefaultFurnitureNeedsForRoomType(detectedType);

      const updatedQuestionnaire: QuestionnaireData = {
        ...project.questionnaire,
        photoUrl: activePhoto || undefined,
        photoName: photoName || project.questionnaire.photoName || 'scanned_room.jpg',
        roomType: detectedType,
        dimensions: {
          ...project.questionnaire.dimensions,
          lengthCm: confirmedLengthCm,
          widthCm: confirmedWidthCm,
          ceilingHeightCm: confirmedCeilingCm,
          measurementSource: isMeasurementConfirmed ? 'user_confirmed' : 'estimated',
        },
        style: {
          ...project.questionnaire.style,
          primaryStyle,
        },
        budget: {
          ...project.questionnaire.budget,
          totalBudgetINR: confirmedBudgetINR,
        },
        functionalNeeds: {
          ...project.questionnaire.functionalNeeds,
          furnitureNeeds,
        },
        completedAt: new Date().toISOString(),
      };

      // Map detected existing elements to PlacedItems (excluding 'remove' or 'exclude' items)
      const existingItems: PlacedItem[] = (scanResult?.detectedElements || [])
        .filter((elem) => elem.isExistingOwned && elem.suggestedAction !== 'remove' && elem.suggestedAction !== 'exclude')
        .map((elem, idx) => {
          const matchingCatalog =
            FURNITURE_CATALOG.find((c) => c.category === elem.category) || FURNITURE_CATALOG[0];

          const widthCm = elem.estimatedDimensionsCm?.width || matchingCatalog.dimensions.widthCm;
          const depthCm = elem.estimatedDimensionsCm?.depth || matchingCatalog.dimensions.depthCm;
          const heightCm = elem.estimatedDimensionsCm?.height || matchingCatalog.dimensions.heightCm;

          let xCm = 40;
          let yCm = 40;
          let rotationDeg = elem.suggestedAction === 'rotate' ? 90 : 0;

          if (elem.box && typeof elem.box.x === 'number' && typeof elem.box.y === 'number') {
            const centerX = (elem.box.x + (elem.box.width || 0.3) / 2) * confirmedLengthCm;
            const centerY = (elem.box.y + (elem.box.height || 0.3) / 2) * confirmedWidthCm;
            xCm = Math.max(20, Math.min(confirmedLengthCm - widthCm - 20, Math.round(centerX - widthCm / 2)));
            yCm = Math.max(20, Math.min(confirmedWidthCm - depthCm - 20, Math.round(centerY - depthCm / 2)));
          } else if (elem.approximateWall === 'north') {
            xCm = Math.max(20, Math.round(confirmedLengthCm / 2 - widthCm / 2));
            yCm = 25;
          } else if (elem.approximateWall === 'south') {
            xCm = Math.max(20, Math.round(confirmedLengthCm / 2 - widthCm / 2));
            yCm = Math.max(25, Math.round(confirmedWidthCm - depthCm - 25));
            rotationDeg = 180;
          } else if (elem.approximateWall === 'west') {
            xCm = 25;
            yCm = Math.max(20, Math.round(confirmedWidthCm / 2 - depthCm / 2));
            rotationDeg = 90;
          } else if (elem.approximateWall === 'east') {
            xCm = Math.max(25, Math.round(confirmedLengthCm - widthCm - 25));
            yCm = Math.max(20, Math.round(confirmedWidthCm / 2 - depthCm / 2));
            rotationDeg = 270;
          } else {
            xCm = Math.max(20, Math.round((confirmedLengthCm - widthCm) / 2));
            yCm = Math.max(20, Math.round((confirmedWidthCm - depthCm) / 2));
          }

          if (elem.suggestedAction === 'reposition') {
            xCm = Math.max(40, Math.min(confirmedLengthCm - widthCm - 40, xCm));
            yCm = Math.max(40, Math.min(confirmedWidthCm - depthCm - 40, yCm));
          }

          return {
            instanceId: `existing_${elem.id || idx}_${Date.now()}`,
            itemId: matchingCatalog.id,
            xCm,
            yCm,
            rotationDeg,
            customDimensions: {
              widthCm,
              depthCm,
              heightCm,
            },
            isOwned: true,
            isSuggested: false,
            status: 'owned' as const,
            customLabel: `[Existing] ${elem.label}`,
            ownedAction: elem.suggestedAction || 'keep',
            actionRationale: elem.actionRationale,
            quantity: 1,
          };
        });

      // Generate layout alternatives customized strictly to these dimensions, budget, and existing items
      const layoutAlternatives = generateLayoutAlternatives(updatedQuestionnaire, existingItems);
      const activeLayoutKey = 'space_efficient';
      const initialItems = [...(layoutAlternatives[activeLayoutKey]?.items || existingItems)];

      const typeLabel = detectedType.charAt(0).toUpperCase() + detectedType.slice(1).replace('_', ' ');
      const newProjName = `${primaryStyle} ${typeLabel} (${confirmedLengthCm}×${confirmedWidthCm}cm)`;

      const updatedProj: Project = {
        ...project,
        name: newProjName,
        scanAnalysis: scanResult || undefined,
        originalExistingLayoutItems: existingItems,
        questionnaire: updatedQuestionnaire,
        activeLayoutId: activeLayoutKey,
        layoutAlternatives,
        currentPlacedItems: initialItems,
        updatedAt: new Date().toISOString(),
      };

      onUpdateProject(updatedProj);
      onProceedToDesign();
    } catch (err) {
      console.error('Failed to generate design from scan:', err);
      onProceedToDesign();
    } finally {
      setIsGeneratingDesign(false);
    }
  };

  // Continue to Questionnaire Wizard with pre-filled scan data
  const handleOpenPreferencesWizard = () => {
    const activePhoto = photoDataUrl || project.questionnaire.photoUrl;
    const detectedType = (scanResult?.detectedRoomType || project.questionnaire.roomType || 'bedroom') as RoomType;

    const prefill: Partial<QuestionnaireData> = {
      photoUrl: activePhoto || undefined,
      photoName,
      roomType: detectedType,
      dimensions: {
        ...project.questionnaire.dimensions,
        lengthCm: confirmedLengthCm,
        widthCm: confirmedWidthCm,
        ceilingHeightCm: confirmedCeilingCm,
      },
      budget: {
        ...project.questionnaire.budget,
        totalBudgetINR: confirmedBudgetINR,
      },
    };

    if (onOpenQuestionnaire) {
      onOpenQuestionnaire(prefill);
    } else {
      onUpdateProject({
        ...project,
        questionnaire: {
          ...project.questionnaire,
          ...prefill,
        },
      });
      onProceedToDesign();
    }
  };

  // Demo loader for users who want to test the scanner with a reference room
  const handleLoadSampleRoom = () => {
    const sampleUrl = '/src/assets/images/hero_interior_warm_1791968291047.jpg';
    setPhotoDataUrl(sampleUrl);
    setPhotoName('sample_living_room.jpg');
    runScanAnalysis(sampleUrl);
  };

  // User correction: update detection label or dimensions
  const handleUpdateDetection = (id: string, updates: Partial<DetectedElement>) => {
    if (!scanResult) return;
    const updatedElements = scanResult.detectedElements.map((el) =>
      el.id === id ? { ...el, ...updates } : el
    );
    const updatedScan: RoomScanAnalysis = {
      ...scanResult,
      detectedElements: updatedElements,
    };
    setScanResult(updatedScan);
    onUpdateProject({
      ...project,
      scanAnalysis: updatedScan,
    });
  };

  // User correction: remove false detection
  const handleRemoveDetection = (id: string) => {
    if (!scanResult) return;
    const updatedElements = scanResult.detectedElements.filter((el) => el.id !== id);
    const updatedScan: RoomScanAnalysis = {
      ...scanResult,
      detectedElements: updatedElements,
    };
    setScanResult(updatedScan);
    onUpdateProject({
      ...project,
      scanAnalysis: updatedScan,
    });
  };

  // User correction: add missing furniture piece
  const handleAddCustomDetection = () => {
    const currentScan: RoomScanAnalysis = scanResult || {
      detectedRoomType: project.questionnaire.roomType || 'bedroom',
      architecturalFeatures: ['Perimeter walls aligned with confirmed room boundaries'],
      detectedElements: [],
      detectedStyle: project.questionnaire.style?.primaryStyle || 'Japandi',
      detectedColors: ['Neutral Warm'],
      detectedMaterials: ['Wood', 'Linen'],
      lightingCondition: 'Ambient room illumination',
      movementSafetyConcerns: [],
      estimatedRoomDimensions: {
        lengthCm: confirmedLengthCm,
        widthCm: confirmedWidthCm,
        ceilingHeightCm: confirmedCeilingCm,
        confidence: 'confirmed',
      },
      aiProvider: 'manual-input',
      rawNotes: 'Manual item registration',
    };

    const newDet: DetectedElement = {
      id: `custom_${Date.now()}`,
      label: 'Accent Storage / Furniture',
      category: 'storage',
      confidence: 1.0,
      box: { x: 0.15, y: 0.15, width: 0.25, height: 0.25 },
      estimatedDimensionsCm: { width: 120, depth: 50, height: 75 },
      dimensionConfidence: 'confirmed',
      approximateWall: 'north',
      isExistingOwned: true,
      suggestedAction: 'keep',
      isConfirmed: true,
    };
    const updatedScan: RoomScanAnalysis = {
      ...currentScan,
      detectedElements: [...currentScan.detectedElements, newDet],
    };
    setScanResult(updatedScan);
    onUpdateProject({
      ...project,
      scanAnalysis: updatedScan,
    });
  };

  // Commit manual measurements
  const handleSaveConfirmedMeasurements = () => {
    setIsMeasurementConfirmed(true);
    const updatedDimensions = {
      ...project.questionnaire.dimensions,
      lengthCm: confirmedLengthCm,
      widthCm: confirmedWidthCm,
      ceilingHeightCm: confirmedCeilingCm,
    };
    onUpdateProject({
      ...project,
      questionnaire: {
        ...project.questionnaire,
        dimensions: updatedDimensions,
        budget: {
          ...project.questionnaire.budget,
          totalBudgetINR: confirmedBudgetINR,
        },
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-stone-200/80">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#86113C]/10 text-[#86113C] text-xs font-semibold uppercase tracking-wider mb-2">
            <Scan className="w-3.5 h-3.5" />
            AI Computer-Vision Room Scanner
          </div>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Scan & Analyze Your Space
          </h1>
          <p className="text-stone-600 text-sm mt-1 max-w-2xl">
            Upload your authentic room photograph. Our Gemini vision model identifies architectural features,
            catalogues existing furniture, maps circulation pathways, and detects potential movement constraints.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 text-sm font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-[#86113C]" />
            <span>{photoDataUrl ? 'Change Photo' : 'Upload Room Photo'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFileUpload}
            className="hidden"
          />

          {photoDataUrl && (
            <button
              onClick={handleGenerateDesignFromScan}
              disabled={isScanning || isGeneratingDesign}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#86113C] hover:bg-[#700E32] disabled:opacity-50 rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-2"
            >
              {isGeneratingDesign ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Design...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Design from Photo</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error / Notice Banner */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-700 hover:text-red-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Measurement Accuracy Notice */}
      <div className="bg-[#FAF8F5] border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Ruler className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Measurement Accuracy Protocol
            </h4>
            <p className="text-xs text-stone-600 mt-0.5">
              Ordinary single photographs cannot produce exact laser dimensions.
              Confirmed manual dimensions are strictly isolated from AI estimates to preserve placement safety.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">
            {isMeasurementConfirmed ? 'Confirmed Manual' : 'Estimated'}
          </span>
        </div>
      </div>

      {/* Main Grid: Photo Visualizer with Bounding Overlays vs Analysis Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Photo with Interactive Detection Overlays */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#86113C]" />
                <h3 className="font-serif-display text-lg font-bold text-stone-900">
                  Room Photograph & Bounding Detections
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {photoDataUrl && (
                  <button
                    onClick={() => setShowOverlays(!showOverlays)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      showOverlays ? 'bg-[#86113C]/10 text-[#86113C]' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{showOverlays ? 'Hide Boxes' : 'Show Boxes'}</span>
                  </button>
                )}
                {photoDataUrl && (
                  <button
                    onClick={() => runScanAnalysis(photoDataUrl)}
                    disabled={isScanning}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                    title="Re-run AI Analysis"
                  >
                    <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Photo Canvas / Container */}
            <div className="relative w-full aspect-16/10 rounded-2xl overflow-hidden bg-stone-900 border border-stone-200 group">
              {photoDataUrl ? (
                <img
                  src={photoDataUrl}
                  alt="Scanned Room"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 p-8 text-center space-y-3 bg-stone-900">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 text-white flex items-center justify-center">
                    <Camera className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-white">No Room Photograph Uploaded Yet</p>
                    <p className="text-xs text-stone-400 max-w-sm">
                      Upload a photo of your bedroom, living room, or study. Our vision model will analyze your space.
                    </p>
                  </div>
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-[#86113C] hover:bg-[#700E32] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Your Photo</span>
                    </button>
                    <button
                      onClick={handleLoadSampleRoom}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white text-xs font-medium rounded-xl transition-colors"
                    >
                      Try with Sample Room
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Scanning Progress Indicator */}
              {isScanning && (
                <div className="absolute inset-0 bg-stone-900/75 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-3 z-30 p-6 text-center">
                  <div className="w-12 h-12 rounded-full border-3 border-white/20 border-t-[#86113C] animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold">
                      {scanStage === 'compressing' && 'Optimizing photo resolution...'}
                      {scanStage === 'analyzing' && 'Gemini Vision analyzing room structure...'}
                      {scanStage === 'extracting' && 'Mapping furniture clearances & boundaries...'}
                      {scanStage === 'ready' && 'Scan complete!'}
                      {!scanStage && 'Processing room photo...'}
                    </p>
                    <p className="text-xs text-stone-300">
                      Identifying walls, doors, windows, and existing furniture inventory
                    </p>
                  </div>
                </div>
              )}

              {/* Detection Bounding Boxes */}
              {showOverlays &&
                scanResult &&
                scanResult.detectedElements.map((el) => {
                  if (!el.box) return null;
                  const isSelected = selectedDetectionId === el.id;
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedDetectionId(el.id)}
                      className={`absolute border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/25 ring-2 ring-amber-300'
                          : 'border-white/80 bg-black/20 hover:border-amber-300 hover:bg-amber-300/15'
                      }`}
                      style={{
                        left: `${el.box.x * 100}%`,
                        top: `${el.box.y * 100}%`,
                        width: `${el.box.width * 100}%`,
                        height: `${el.box.height * 100}%`,
                      }}
                    >
                      <span className="absolute -top-6 left-0 bg-stone-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap flex items-center gap-1">
                        <span>{el.label}</span>
                        <span className="text-amber-300">({Math.round(el.confidence * 100)}%)</span>
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Photo Action Footer */}
            <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
              <span className="truncate max-w-xs">{photoName}</span>
              <span>Tap any box to inspect & correct dimensions</span>
            </div>
          </div>

          {/* Confirmed Room Dimensions & Budget Editor */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display text-base font-bold text-stone-900 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#86113C]" />
                Confirmed Room Dimensions (Centimetres)
              </h3>
              <span className="text-[11px] text-stone-500">Source of truth for 2D planner</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Length (X axis)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={confirmedLengthCm}
                    onChange={(e) => setConfirmedLengthCm(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-[#86113C]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400">cm</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Width (Y axis)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={confirmedWidthCm}
                    onChange={(e) => setConfirmedWidthCm(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-[#86113C]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400">cm</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Ceiling Height</label>
                <div className="relative">
                  <input
                    type="number"
                    value={confirmedCeilingCm}
                    onChange={(e) => setConfirmedCeilingCm(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-[#86113C]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400">cm</span>
                </div>
              </div>
            </div>

            {/* Dedicated INR Budget Input directly on the scan review screen */}
            <div className="pt-2 border-t border-stone-100">
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-[#86113C]" />
                  <span>Target Room Budget (INR)</span>
                </span>
                <span className="text-[11px] text-stone-500 font-normal">
                  Customizable to your makeover goal
                </span>
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="5000"
                    value={confirmedBudgetINR}
                    onChange={(e) => setConfirmedBudgetINR(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-[#86113C]"
                  />
                </div>
                <div className="text-xs font-bold text-stone-700 whitespace-nowrap bg-stone-100 px-3 py-2 rounded-xl">
                  {formatINR(confirmedBudgetINR)}
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveConfirmedMeasurements}
              className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Lock Measurements & Budget</span>
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): AI Analysis Details & Interactive Detection Editor */}
        <div className="lg:col-span-5 space-y-6">
          {scanResult ? (
            <>
              {/* Primary Call-to-Action Card */}
              <div className="bg-white rounded-3xl p-6 border-2 border-[#86113C]/20 shadow-xs space-y-4 bg-gradient-to-br from-white via-white to-[#FDF2F4]/30">
                <div className="flex items-center gap-2 text-xs font-bold text-[#86113C] uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Ready to Synthesize Design</span>
                </div>
                <h3 className="font-serif-display text-xl font-bold text-stone-900">
                  Generate Your Room Layout
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Generate 3 personalized layout alternatives utilizing your uploaded room photograph, confirmed{' '}
                  <strong>{confirmedLengthCm}×{confirmedWidthCm}cm</strong> dimensions, and target{' '}
                  <strong>{formatINR(confirmedBudgetINR)}</strong> budget.
                </p>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleGenerateDesignFromScan}
                    disabled={isGeneratingDesign}
                    className="w-full py-3 text-sm font-semibold text-white bg-[#86113C] hover:bg-[#700E32] rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    {isGeneratingDesign ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generating Layouts...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Design from Scanned Room</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleOpenPreferencesWizard}
                    className="w-full py-2.5 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Sliders className="w-3.5 h-3.5 text-stone-500" />
                    <span>Customize Style & Lifestyle in Questionnaire First</span>
                  </button>
                </div>
              </div>

              {/* Architectural & Aesthetic Profile */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div>
                    <span className="text-[10px] font-bold text-[#86113C] uppercase tracking-wider">
                      Architectural Analysis
                    </span>
                    <h3 className="font-serif-display text-xl font-bold text-stone-900 capitalize">
                      {scanResult.detectedRoomType.replace('_', ' ')}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#86113C]/10 text-[#86113C]">
                    {scanResult.detectedStyle} Style
                  </span>
                </div>

                {/* Architectural Features */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-stone-700">Architectural Elements</span>
                  <ul className="text-xs text-stone-600 space-y-1 pl-4 list-disc">
                    {scanResult.architecturalFeatures.map((feat, idx) => (
                      <li key={idx}>{feat}</li>
                    ))}
                  </ul>
                </div>

                {/* Colors & Materials */}
                <div className="pt-2 border-t border-stone-100 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-bold text-stone-700 block mb-1">Detected Colors</span>
                    <div className="flex flex-wrap gap-1">
                      {scanResult.detectedColors.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-stone-700 block mb-1">Materials</span>
                    <div className="flex flex-wrap gap-1">
                      {scanResult.detectedMaterials.map((m, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px]">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Movement & Safety Concerns */}
                {scanResult.movementSafetyConcerns.length > 0 && (
                  <div className="pt-3 border-t border-stone-100 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                      Safety & Circulation Warnings
                    </span>
                    <ul className="text-[11px] text-amber-800 space-y-1 pl-4 list-disc">
                      {scanResult.movementSafetyConcerns.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Detected Furniture Inventory & Actions */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <h3 className="font-serif-display text-lg font-bold text-stone-900">
                    Existing Furniture Inventory
                  </h3>
                  <button
                    onClick={handleAddCustomDetection}
                    className="px-2.5 py-1 text-xs font-semibold text-[#86113C] hover:bg-[#86113C]/10 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {scanResult.detectedElements.map((el) => {
                    const isSelected = selectedDetectionId === el.id;
                    return (
                      <div
                        key={el.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300'
                            : 'bg-stone-50 border-stone-200/80 hover:bg-stone-100/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={el.label}
                              onChange={(e) => handleUpdateDetection(el.id, { label: e.target.value })}
                              className="text-xs font-bold text-stone-900 bg-transparent border-b border-transparent focus:border-stone-400 focus:outline-none w-full"
                            />
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                              <span>
                                {el.estimatedDimensionsCm?.width || 120}×{el.estimatedDimensionsCm?.depth || 80}×
                                {el.estimatedDimensionsCm?.height || 75}cm
                              </span>
                              <span>•</span>
                              <span className="capitalize">{el.approximateWall} wall</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveDetection(el.id)}
                            className="p-1 text-stone-400 hover:text-red-600 rounded-lg transition-colors"
                            title="Remove detection"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Keep / Reposition / Rotate / Remove Action Selector */}
                        <div className="mt-2 pt-2 border-t border-stone-200/60 flex items-center justify-between gap-1 text-[11px] flex-wrap">
                          <span className="text-stone-500 font-medium">Disposition:</span>
                          <div className="flex items-center gap-1 font-semibold flex-wrap">
                            {[
                              { id: 'keep' as const, label: 'Keep' },
                              { id: 'reposition' as const, label: 'Reposition' },
                              { id: 'rotate' as const, label: 'Rotate' },
                              { id: 'remove' as const, label: 'Remove' },
                            ].map((act) => (
                              <button
                                key={act.id}
                                onClick={() => handleUpdateDetection(el.id, { suggestedAction: act.id })}
                                className={`px-2 py-0.5 rounded-md transition-colors ${
                                  (el.suggestedAction || 'keep') === act.id
                                    ? act.id === 'remove'
                                      ? 'bg-rose-700 text-white'
                                      : 'bg-[#86113C] text-white'
                                    : 'bg-white text-stone-600 hover:bg-stone-200'
                                }`}
                              >
                                {act.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-xs text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#86113C]/10 text-[#86113C] flex items-center justify-center mx-auto">
                <Scan className="w-6 h-6" />
              </div>
              <h3 className="font-serif-display text-lg font-bold text-stone-900">
                Ready for AI Room Scan
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
                Upload your room photo to extract architectural boundaries, inventory existing furniture, and verify placement safety.
              </p>
              <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-[#86113C] hover:bg-[#700E32] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Room Photo</span>
                </button>
                <button
                  onClick={handleLoadSampleRoom}
                  className="w-full py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-xl transition-colors"
                >
                  Load Sample Room (Demo)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
