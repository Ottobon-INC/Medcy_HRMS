import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle, RefreshCcw, Plus, Trash2 } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';
import { fetchPayrollConfig, upsertPayrollConfig, PayrollConfig, PayrollTier } from '../lib/services/payroll-config-service';

interface AdminSettingsProps {
  language: Language;
}

export default function AdminSettings({ language }: AdminSettingsProps) {
  const t = translations[language];
  const [config, setConfig] = useState<PayrollConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    const data = await fetchPayrollConfig();
    setConfig(data);
    setIsLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(config)) {
        if (key === 'payroll_tiers') {
          await upsertPayrollConfig('payroll_tiers_json', 0, JSON.stringify(value));
          continue;
        }
        
        let label = '';
        switch (key) {
          case 'pf_percent': label = 'PF % of Basic'; break;
          case 'professional_tax': label = 'Professional Tax (Fixed)'; break;
          case 'hra_fixed': label = 'Legacy HRA'; break;
          case 'medical_allowance': label = 'Legacy Medical'; break;
          case 'conveyance_allowance': label = 'Legacy Conveyance'; break;
        }
        if (typeof value === 'number') {
          await upsertPayrollConfig(key, value, label);
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save config:', err);
      alert(`Failed to save settings: ${err.message || 'Check your connection'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: keyof PayrollConfig, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      [key]: Number(value)
    });
  };

  const addTier = () => {
    if (!config) return;
    const newTier: PayrollTier = {
      id: Date.now().toString(),
      name: `Tier ${(config.payroll_tiers?.length || 0) + 1}`,
      minSalary: 0,
      maxSalary: 999999,
      hra: 0,
      ma: 0,
      ca: 0
    };
    setConfig({
      ...config,
      payroll_tiers: [...(config.payroll_tiers || []), newTier]
    });
  };

  const updateTier = (tierId: string, field: keyof PayrollTier, value: string | number) => {
    if (!config || !config.payroll_tiers) return;
    const updatedTiers = config.payroll_tiers.map(t => {
      if (t.id === tierId) {
        return { ...t, [field]: field === 'name' ? value : Number(value) };
      }
      return t;
    });
    setConfig({ ...config, payroll_tiers: updatedTiers });
  };

  const removeTier = (tierId: string) => {
    if (!config || !config.payroll_tiers) return;
    if (config.payroll_tiers.length <= 1) {
      alert("You must have at least one payroll tier.");
      return;
    }
    setConfig({
      ...config,
      payroll_tiers: config.payroll_tiers.filter(t => t.id !== tierId)
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCcw className="w-8 h-8 animate-spin mb-4 text-teal-500" />
        <p>Loading settings...</p>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-teal-600" />
            {language === 'te' ? 'సిస్టమ్ సెట్టింగ్‌లు' : 'System Settings'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'te' 
              ? 'పేరోల్ స్ట్రక్చర్ మరియు ఇతర సెట్టింగ్‌లను కాన్ఫిగర్ చేయండి.' 
              : 'Configure payroll structure, allowances, and deductions.'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm">
        <form onSubmit={handleSave} className="space-y-8">
          
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              {language === 'te' ? 'పేరోల్ స్ట్రక్చర్ (Payroll Structure)' : 'Payroll Structure'}
            </h3>
            
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">Define salary ranges and their corresponding allowances.</p>
              <button
                type="button"
                onClick={addTier}
                className="flex items-center gap-1.5 text-xs font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Tier
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {config.payroll_tiers?.map((tier, index) => (
                <div key={tier.id} className="mb-6 border border-slate-100 rounded-2xl p-5 bg-slate-50/50 shadow-sm relative group">
                  <button 
                    type="button"
                    onClick={() => removeTier(tier.id)}
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove Tier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="mb-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tier Name</label>
                    <input 
                      type="text" 
                      required 
                      value={tier.name} 
                      onChange={(e) => updateTier(tier.id, 'name', e.target.value)} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/10"
                      placeholder="e.g. Tier 1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Min Salary</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">₹</span>
                        <input 
                          type="number" 
                          required 
                          value={tier.minSalary} 
                          onChange={(e) => updateTier(tier.id, 'minSalary', e.target.value)} 
                          className="w-full pl-7 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Max Salary</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">₹</span>
                        <input 
                          type="number" 
                          required 
                          value={tier.maxSalary} 
                          onChange={(e) => updateTier(tier.id, 'maxSalary', e.target.value)} 
                          className="w-full pl-7 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-4 border-t border-slate-200/60">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500">HRA</label>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1.5 text-slate-400 font-bold text-sm">₹</span>
                        <input type="number" required value={tier.hra} onChange={(e) => updateTier(tier.id, 'hra', e.target.value)} className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500">Medical</label>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1.5 text-slate-400 font-bold text-sm">₹</span>
                        <input type="number" required value={tier.ma} onChange={(e) => updateTier(tier.id, 'ma', e.target.value)} className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500">Conveyance</label>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1.5 text-slate-400 font-bold text-sm">₹</span>
                        <input type="number" required value={tier.ca} onChange={(e) => updateTier(tier.id, 'ca', e.target.value)} className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">

              {/* Deductions */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  PF % (Percentage of Basic)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={config.pf_percent || ''}
                    onChange={(e) => handleChange('pf_percent', e.target.value)}
                    className="w-full pl-4 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                  <span className="absolute right-4 top-2 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Professional Tax (Fixed)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    value={config.professional_tax || ''}
                    onChange={(e) => handleChange('professional_tax', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-teal-50 border border-teal-100 rounded-xl">
              <p className="text-xs text-teal-800 font-medium">
                <span className="font-bold">Info:</span> Changing these values will apply to all <b>future</b> payslips generated. Existing payslips will not be modified unless manually regenerated.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
            {saveSuccess && (
              <span className="text-emerald-600 text-sm font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle className="w-4 h-4" />
                Settings Saved!
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md shadow-teal-600/15 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70"
            >
              {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {language === 'te' ? 'సేవ్ చేయండి' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
