import React from 'react';
import { Project } from '../../types';
import { calculateBudgetBreakdown, formatINR } from '../../utils/currency';
import { CATEGORY_LABELS } from '../../data/furnitureCatalog';
import { Printer, Download, X, Compass, CheckCircle2 } from 'lucide-react';

interface DesignReportModalProps {
  project: Project;
  onClose: () => void;
}

export const DesignReportModal: React.FC<DesignReportModalProps> = ({
  project,
  onClose,
}) => {
  const q = project.questionnaire;
  const breakdown = calculateBudgetBreakdown(project.currentPlacedItems, q.budget);
  const activeLayout = project.layoutAlternatives[project.activeLayoutId] || project.layoutAlternatives.space_efficient;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csv = 'Product Name,Category,Quantity,Unit Price (INR),Subtotal (INR),Status\n';
    for (const item of breakdown.itemizedSummary) {
      const cleanName = item.name.replace(/,/g, '');
      const priceForTotal = item.isOwned || item.isSuggested ? 0 : item.totalPrice;
      const statusLabel = item.isOwned
        ? 'Retained Asset (Pre-owned)'
        : item.isSuggested
        ? 'Optional AI Suggestion'
        : 'Selected Purchase';
      csv += `"${cleanName}",${item.category},${item.quantity},${item.unitPrice},${priceForTotal},"${statusLabel}"\n`;
    }
    csv += `\nFurniture Subtotal,,,${breakdown.furnitureSubtotal}\n`;
    csv += `Decor Subtotal,,,${breakdown.decorSubtotal}\n`;
    csv += `Estimated Grand Total,,,${breakdown.grandTotal}\n`;
    csv += `Target Budget,,,${breakdown.totalBudget}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DecorHub-ShoppingList-${project.name.replace(/\s+/g, '-')}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-10 shadow-2xl border border-stone-200 my-8 space-y-6">
        {/* Modal Controls (Hidden in print) */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 no-print">
          <div>
            <span className="text-xs font-semibold text-[#B45A3E] tracking-wider uppercase">
              Project Dossier
            </span>
            <h2 className="font-serif-display text-2xl font-bold text-stone-900">
              Architectural Design & Sourcing Report
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#C86D51] hover:bg-[#B45A3E] rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= PRINTABLE REPORT BODY ================= */}
        <div className="space-y-6 text-stone-800">
          {/* Header Brand */}
          <div className="flex items-start justify-between border-b border-stone-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif-display text-2xl font-bold text-[#C86D51]">
                  DecorHub
                </span>
                <span className="text-xs text-stone-400">· Interior Design System</span>
              </div>
              <h1 className="font-serif-display text-xl font-bold text-stone-900 mt-1">
                {project.name}
              </h1>
              <div className="text-xs text-stone-500 mt-0.5">
                Prepared on {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div className="text-right text-xs space-y-0.5">
              <div className="font-semibold text-stone-900">Project Reference #{project.id.slice(-6)}</div>
              <div className="text-stone-500">{q.roomType.replace('_', ' ').toUpperCase()}</div>
              <div className="text-[#B45A3E] font-medium">{q.style.primaryStyle} Style</div>
            </div>
          </div>

          {/* Room Profile & Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs">
            <div>
              <div className="text-stone-400 font-medium">Room Dimensions</div>
              <div className="font-bold text-stone-900 mt-0.5">
                {q.dimensions.lengthCm} × {q.dimensions.widthCm} cm
              </div>
              <div className="text-[11px] text-stone-500">
                {((q.dimensions.lengthCm * q.dimensions.widthCm) / 10000).toFixed(1)} sq. m (
                {Math.round(((q.dimensions.lengthCm * q.dimensions.widthCm) / 10000) * 10.764)} sq. ft)
              </div>
            </div>

            <div>
              <div className="text-stone-400 font-medium">Primary Occupants</div>
              <div className="font-bold text-stone-900 mt-0.5">{q.userProfile.roomUsers}</div>
              <div className="text-[11px] text-stone-500">{q.userProfile.occupantCount} regular occupants</div>
            </div>

            <div>
              <div className="text-stone-400 font-medium">Active Layout Mode</div>
              <div className="font-bold text-stone-900 mt-0.5">{activeLayout.name}</div>
              <div className="text-[11px] text-stone-500">{activeLayout.tagline}</div>
            </div>

            <div>
              <div className="text-stone-400 font-medium">Estimated Sourcing Total</div>
              <div className="font-bold text-stone-900 mt-0.5">{formatINR(breakdown.grandTotal)}</div>
              <div className="text-[11px] text-stone-500">Budget: {formatINR(breakdown.totalBudget)}</div>
            </div>
          </div>

          {/* Design Rationale */}
          <div className="space-y-2">
            <h3 className="font-serif-display text-base font-bold text-stone-900">
              Architectural & Placement Rationale
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600">
              {activeLayout.rationalePoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-stone-50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C86D51] shrink-0 mt-0.5" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sourcing Itemized Table */}
          <div className="space-y-3">
            <h3 className="font-serif-display text-base font-bold text-stone-900">
              Furniture Sourcing & Bill of Materials
            </h3>

            {breakdown.itemizedSummary.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300 space-y-1">
                <div className="font-bold text-stone-800 text-xs">No furniture selected for purchase yet.</div>
                <div className="text-[11px] text-stone-500">Browse the furniture catalogue and select the items you want to include.</div>
              </div>
            ) : (
              <table className="w-full text-left text-xs border border-stone-200 rounded-xl overflow-hidden">
                <thead className="bg-stone-100 text-stone-600 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 font-semibold">Furniture Piece</th>
                    <th className="p-2.5 font-semibold">Category</th>
                    <th className="p-2.5 font-semibold text-center">Qty</th>
                    <th className="p-2.5 font-semibold text-right">Unit Est. (INR)</th>
                    <th className="p-2.5 font-semibold text-right">Total Est. (INR)</th>
                    <th className="p-2.5 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {breakdown.itemizedSummary.map((item, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="p-2.5 font-semibold text-stone-900">{item.name}</td>
                      <td className="p-2.5 capitalize text-stone-500">
                        {CATEGORY_LABELS[item.category as any] || item.category}
                      </td>
                      <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono">{formatINR(item.unitPrice)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {item.isOwned
                          ? '₹0 (Owned)'
                          : item.isSuggested
                          ? '₹0 (Optional)'
                          : formatINR(item.totalPrice)}
                      </td>
                      <td className="p-2.5 text-center text-[10px] font-semibold">
                        {item.isOwned ? (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Pre-owned</span>
                        ) : item.isSuggested ? (
                          <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">Suggestion</span>
                        ) : (
                          <span className="text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded">Selected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Financial Summary */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
            <div className="space-y-1 text-stone-600">
              <div>Furniture Subtotal: <strong>{formatINR(breakdown.furnitureSubtotal)}</strong></div>
              <div>Decor & Textiles: <strong>{formatINR(breakdown.decorSubtotal)}</strong></div>
              {breakdown.deliveryCost > 0 && <div>Delivery Allowance: <strong>{formatINR(breakdown.deliveryCost)}</strong></div>}
              {breakdown.installationCost > 0 && <div>Assembly Allowance: <strong>{formatINR(breakdown.installationCost)}</strong></div>}
            </div>

            <div className="text-right sm:border-l sm:border-stone-200 sm:pl-6">
              <div className="text-stone-400 font-medium">Grand Total Estimate</div>
              <div className="font-serif-display text-2xl font-bold text-stone-900">
                {formatINR(breakdown.grandTotal)}
              </div>
              <div className={`text-[11px] font-semibold ${breakdown.isOverBudget ? 'text-rose-600' : 'text-emerald-700'}`}>
                {breakdown.isOverBudget
                  ? `Over budget by ${formatINR(breakdown.overBudgetAmount)}`
                  : `Within target budget (${formatINR(breakdown.remainingBudget)} remaining)`}
              </div>
            </div>
          </div>

          {/* Architectural Disclaimer */}
          <div className="text-[11px] text-stone-400 leading-relaxed border-t border-stone-200 pt-3">
            <strong>Planning Notice:</strong> This architectural design dossier and 2D floor arrangement is an approximate space-planning aid. Please confirm physical on-site measurements, doorway clearances, and structural masonry before placing furniture purchase orders.
          </div>
        </div>
      </div>
    </div>
  );
};
