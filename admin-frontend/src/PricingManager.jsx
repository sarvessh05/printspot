import React, { useState, useEffect } from 'react';
import { DollarSign, Save, RefreshCcw, CheckCircle, Info } from 'lucide-react';

const PricingManager = () => {
    const [pricing, setPricing] = useState({ bw: 2, color: 10, double_sided_discount: 0 });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/settings/pricing`)
            .then(res => res.json())
            .then(data => setPricing(data))
            .catch(err => console.error("Pricing fetch error", err));
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage("");
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/settings/pricing`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Admin-Password': import.meta.env.VITE_ADMIN_PASSWORD || 'ADMIN_MASTER_PASSWORD' 
                },
                body: JSON.stringify(pricing)
            });
            if (response.ok) {
                setMessage("Pricing updated successfully!");
                setTimeout(() => setMessage(""), 3000);
            } else {
                setMessage("Failed to update pricing.");
            }
        } catch (err) {
            setMessage("Error: " + err.message);
        }
        setIsSaving(false);
    };

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Dynamic Pricing Manager</h1>
                <p className="text-slate-500">Adjust the cost-per-page for all users instantly.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                {/* B&W Price */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                            <DollarSign size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-800">B&W Rate</h3>
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input 
                            type="number" 
                            className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 transition-all text-xl font-bold"
                            value={pricing.bw}
                            onChange={(e) => setPricing({...pricing, bw: parseInt(e.target.value) || 0})}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Standard cost per single-sided B&W page.</p>
                </div>

                {/* Color Price */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-sky-600">
                        <div className="p-2 bg-sky-50 rounded-lg">
                            <Info size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-800">Color Rate</h3>
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400 font-bold">₹</span>
                        <input 
                            type="number" 
                            className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 transition-all text-xl font-bold text-sky-600"
                            value={pricing.color}
                            onChange={(e) => setPricing({...pricing, color: parseInt(e.target.value) || 0})}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Premium cost per single-sided color page.</p>
                </div>
            </div>

            <div className="mt-10 flex items-center gap-4">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? <RefreshCcw className="animate-spin" /> : <Save size={20} />}
                    Save Changes
                </button>
                {message && (
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                        <CheckCircle size={20} />
                        {message}
                    </div>
                )}
            </div>

            <div className="mt-12 bg-sky-50 border border-sky-100 p-6 rounded-2xl max-w-4xl">
                 <h4 className="font-bold text-sky-900 mb-2 flex items-center gap-2">
                    <Info size={18}/> Developer Note
                 </h4>
                 <p className="text-sky-700 text-sm leading-relaxed">
                    Changes made here are stored in Supabase under the <code className="bg-white px-1 rounded">platform_settings</code> table. 
                    The customer-facing application fetches these values on load to calculate the bill on the review page.
                 </p>
            </div>
        </div>
    );
};

export default PricingManager;
