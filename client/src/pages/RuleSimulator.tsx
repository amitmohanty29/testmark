import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { RuleConfiguration, SimulationRun } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Cpu, 
  Play, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  History, 
  PlusCircle, 
  ArrowRight, 
  Sliders, 
  Layers, 
  Scale, 
  Info,
  Clock,
  FileCheck2,
  Lock
} from 'lucide-react';

export const RuleSimulator: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const [ruleConfigs, setRuleConfigs] = useState<RuleConfiguration[]>([]);
  const [simulationRuns, setSimulationRuns] = useState<SimulationRun[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulation form
  const [simName, setSimName] = useState('2026 OIML Tolerance Tightening Impact Analysis');
  const [simDescription, setSimDescription] = useState('Assessment of proposed stricter MPE limits on historical NAWI Class III instruments');
  const [baseConfigId, setBaseConfigId] = useState('');
  const [simulatedConfigId, setSimulatedConfigId] = useState('');
  const [running, setRunning] = useState(false);
  const [latestResult, setLatestResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create new rule configuration modal
  const [isCreateConfigModalOpen, setIsCreateConfigModalOpen] = useState(false);
  const [newVersion, setNewVersion] = useState('OIML-R76-DRAFT-2027');
  const [newName, setNewName] = useState('OIML R-76 Proposed Ultra-Strict Revision');
  const [newToleranceMultiplier, setNewToleranceMultiplier] = useState(0.8); // 20% stricter
  const [creatingConfig, setCreatingConfig] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesRes, runsRes] = await Promise.all([
        api.getRuleConfigs(),
        api.getSimulationRuns(),
      ]);
      const rules = rulesRes.ruleConfigs || [];
      setRuleConfigs(rules);
      setSimulationRuns(runsRes.runs || []);

      if (rules.length > 0) {
        setBaseConfigId(rules[0].id);
        if (rules.length > 1) {
          setSimulatedConfigId(rules[1].id);
        } else {
          setSimulatedConfigId(rules[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load simulator data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedConfigId) {
      setError('Please select a candidate / draft rule configuration to simulate.');
      return;
    }
    setRunning(true);
    setError(null);
    setLatestResult(null);

    try {
      const res = await api.runSimulation({
        name: simName,
        description: simDescription,
        baseRuleConfigId: baseConfigId || undefined,
        simulatedRuleConfigId: simulatedConfigId,
      });

      const parsedResults = typeof res.simulation.results === 'string'
        ? JSON.parse(res.simulation.results)
        : res.simulation.results;

      setLatestResult({
        ...res.simulation,
        results: parsedResults,
      });

      loadData();
    } catch (err: any) {
      setError(err.message || 'Simulation execution failed');
    } finally {
      setRunning(false);
    }
  };

  const handleCreateDraftConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingConfig(true);
    try {
      await api.createRuleConfig({
        version: newVersion,
        name: newName,
        description: `Draft OIML rule set with tolerance multiplier: ${newToleranceMultiplier}`,
        standardRef: 'OIML R 76-1 (Draft)',
        isDraft: true,
        isActive: false,
        configuration: JSON.stringify({
          toleranceMultiplier: Number(newToleranceMultiplier),
          tightenFactor: (1 - Number(newToleranceMultiplier)) * 100 + '%',
          description: 'Custom simulated MPE tolerances',
        }),
      });

      setIsCreateConfigModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create rule configuration');
    } finally {
      setCreatingConfig(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#ded7c4] rounded p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#a37b12]">
              Metrological Regulatory Sandboxing
            </span>
            <span className="text-gov-sand-400">•</span>
            <span className="text-xs text-gov-sand-600 font-medium">What-If Analysis Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#006c51] mt-0.5 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#006c51]" />
            OIML Rule Impact Simulator
          </h1>
          <p className="text-xs text-gov-sand-600 mt-0.5">
            Test candidate or tightened regulatory tolerance rules against historical evaluation datasets in a strictly read-only sandbox.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isAdmin && (
            <button
              onClick={() => setIsCreateConfigModalOpen(true)}
              className="btn-gov-secondary text-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Define Candidate Rule Set
            </button>
          )}
        </div>
      </div>

      {/* Mandatory Non-Binding Legal Disclaimer */}
      <div className="bg-amber-50/80 border-l-4 border-amber-600 p-4 rounded-r text-xs text-amber-950 flex items-start space-x-3 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold uppercase tracking-wide text-amber-900 text-[11px] flex items-center gap-2">
            <span>Mandatory Metrology Regulatory Disclaimer: Non-Binding Sandbox</span>
            <span className="bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded text-[9px] font-mono">
              READ-ONLY
            </span>
          </div>
          <p className="leading-relaxed text-[11px]">
            This simulation environment runs in an isolated, read-only analytical mode. Results generated herein are purely hypothetical for regulatory impact assessment and <strong>DO NOT alter, amend, or invalidate</strong> any legally recorded evaluation, pattern approval certificate, or test report issued under Section 24 of the Legal Metrology Act 2009.
          </p>
        </div>
      </div>

      {/* Simulation Setup Card */}
      <div className="gov-card p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900 mb-4 pb-2 border-b border-[#e5dfd1] flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#006c51]" /> Configure Simulation Run
        </h2>

        <form onSubmit={handleRunSimulation} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="gov-label">Simulation Name</label>
              <input
                type="text"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                className="gov-input w-full text-xs"
                required
              />
            </div>

            <div>
              <label className="gov-label">Regulatory Objective / Description</label>
              <input
                type="text"
                value={simDescription}
                onChange={(e) => setSimDescription(e.target.value)}
                className="gov-input w-full text-xs"
              />
            </div>

            <div>
              <label className="gov-label">Baseline Official Standard Rule Set</label>
              <select
                value={baseConfigId}
                onChange={(e) => setBaseConfigId(e.target.value)}
                className="gov-input w-full text-xs"
              >
                {ruleConfigs.map((r) => (
                  <option key={`base-${r.id}`} value={r.id}>
                    {r.version} : {r.name} {r.isActive ? '(Active Official)' : ''}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-gov-sand-500 mt-1 block">
                Rule set under which historical certificates were originally evaluated.
              </span>
            </div>

            <div>
              <label className="gov-label text-[#006c51] font-bold">
                Candidate / Draft Rule Set to Simulate (Impact Sandbox)
              </label>
              <select
                value={simulatedConfigId}
                onChange={(e) => setSimulatedConfigId(e.target.value)}
                className="gov-input w-full text-xs font-semibold text-[#006c51] border-[#006c51]"
                required
              >
                {ruleConfigs.map((r) => (
                  <option key={`sim-${r.id}`} value={r.id}>
                    {r.version} : {r.name} {r.isDraft ? '(Candidate Draft)' : ''}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-gov-sand-500 mt-1 block">
                Select draft or tightened standard to compute potential verdict flips.
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-600 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={running}
              className="btn-gov-primary text-xs px-6 py-2.5"
            >
              {running ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Executing Metrological Sandbox Simulation...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 fill-current" /> Run Impact Simulation Against Historical Ledger
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Latest Simulation Results Banner */}
      {latestResult && (
        <div className="gov-card overflow-hidden border-2 border-[#006c51] animate-fadeIn">
          <div className="bg-[#006c51] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-white/20 rounded font-bold">
                  Simulation Output
                </span>
                <span className="text-emerald-200 text-xs font-mono">
                  {new Date(latestResult.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <h2 className="text-base font-bold font-serif mt-1">
                {latestResult.name}
              </h2>
            </div>

            <div className="flex items-center space-x-4 bg-white/10 px-4 py-2 rounded">
              <div className="text-center">
                <div className="text-xl font-bold font-mono">{latestResult.totalEvaluations}</div>
                <div className="text-[10px] text-emerald-100 uppercase">Evaluations Analyzed</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <div className={`text-xl font-bold font-mono ${latestResult.flippedCount > 0 ? 'text-amber-300' : 'text-white'}`}>
                  {latestResult.flippedCount}
                </div>
                <div className="text-[10px] text-emerald-100 uppercase">Verdicts Flipped</div>
              </div>
            </div>
          </div>

          {/* Flipped Verdicts Breakdown */}
          <div className="p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5dfd1]">
              <h3 className="font-bold text-gov-sand-900 uppercase tracking-wider text-[11px]">
                Impact on Historical Evaluations ({latestResult.results?.length || 0})
              </h3>
              <span className="text-[11px] text-gov-sand-500">
                Rule: {latestResult.simulatedRuleConfig?.version || 'Simulated Candidate'}
              </span>
            </div>

            {latestResult.results && latestResult.results.length > 0 ? (
              <div className="divide-y divide-[#ece7d8] border border-[#ded7c4] rounded overflow-hidden">
                {latestResult.results.map((item: any, idx: number) => {
                  const isFlipped = item.verdictFlipped || item.originalVerdict !== item.simulatedVerdict;
                  return (
                    <div
                      key={idx}
                      className={`p-4 transition-colors ${
                        isFlipped ? 'bg-amber-50/60' : 'bg-white'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#006c51]">
                              {item.evaluationNumber}
                            </span>
                            <span className="text-gov-sand-400">•</span>
                            <span className="font-medium text-gov-sand-900">
                              {item.instrumentModel || item.instrumentName || 'NAWI Scale'}
                            </span>
                            <span className="text-[10px] font-mono text-gov-sand-500">
                              ({item.manufacturer})
                            </span>
                          </div>
                        </div>

                        {/* Verdict Flip Pill */}
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Original: {item.originalVerdict || 'PASS'}
                          </span>

                          <ArrowRight className="w-3.5 h-3.5 text-gov-sand-400" />

                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isFlipped
                              ? 'bg-red-100 text-red-800 border border-red-300 font-mono'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            Simulated: {item.simulatedVerdict || 'PASS'}
                          </span>
                        </div>
                      </div>

                      {/* Explanation of change */}
                      <div className="mt-2 text-[11px] text-gov-sand-700 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-gov-sand-400 shrink-0 mt-0.5" />
                        <span>
                          {item.reason || item.impactNotes || (isFlipped
                            ? 'Maximum observed error exceeds proposed tighter tolerance under simulated configuration.'
                            : 'Within acceptable tolerance limits under both baseline and simulated configurations.')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gov-sand-500 italic p-4 text-center">
                No evaluations recorded in database to simulate against.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Historical Simulation Runs Table */}
      <div className="gov-card overflow-hidden">
        <div className="gov-card-header">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-[#006c51]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-sand-900">
              Past Simulation Runs ({simulationRuns.length})
            </h3>
          </div>
        </div>

        {simulationRuns.length === 0 ? (
          <div className="p-8 text-center text-xs text-gov-sand-500 italic">
            No past simulations recorded. Launch a simulation above to evaluate regulatory impact.
          </div>
        ) : (
          <div className="divide-y divide-[#ece7d8] text-xs">
            {simulationRuns.map((run) => (
              <div key={run.id} className="p-4 hover:bg-[#fcfbf9] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gov-sand-900">{run.name}</span>
                    <span className="text-[10px] font-mono text-gov-sand-400">
                      {new Date(run.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[11px] text-gov-sand-600">{run.description}</p>
                  <div className="text-[10px] text-gov-sand-500">
                    Executed by: {run.runByName}
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-[#006c51]">
                      {run.totalEvaluations} evaluated
                    </span>
                    <span className={`block text-[10px] font-semibold ${run.flippedCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {run.flippedCount} verdicts shifted
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Draft Rule Configuration Modal */}
      {isCreateConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#ded7c4] w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-[#faf8f2] border-b border-[#e5dfd1] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-[#006c51]" />
                <h3 className="text-sm font-bold font-serif text-gov-sand-900">
                  Define Candidate OIML Rule Set
                </h3>
              </div>
              <button
                onClick={() => setIsCreateConfigModalOpen(false)}
                className="text-gov-sand-500 hover:text-gov-sand-800 text-xs font-semibold px-2 py-0.5 rounded border border-gov-sand-300"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateDraftConfig} className="p-6 space-y-4 text-xs">
              <p className="text-gov-sand-600">
                Register a candidate rule configuration for testing in the impact simulator. Saved as draft; existing evaluations and legally issued certificates remain untouched.
              </p>

              <div>
                <label className="gov-label">Rule Version Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OIML-R76-2027-DRAFT"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  className="gov-input w-full text-xs font-mono"
                />
              </div>

              <div>
                <label className="gov-label">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OIML R-76 Proposed Stricter Class III Tolerances"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="gov-input w-full text-xs"
                />
              </div>

              <div>
                <label className="gov-label">MPE Tolerance Multiplier</label>
                <select
                  value={newToleranceMultiplier}
                  onChange={(e) => setNewToleranceMultiplier(Number(e.target.value))}
                  className="gov-input w-full text-xs"
                >
                  <option value={0.9}>0.9x (10% Stricter Tolerances)</option>
                  <option value={0.8}>0.8x (20% Stricter Tolerances)</option>
                  <option value={0.7}>0.7x (30% Stricter Tolerances)</option>
                  <option value={0.5}>0.5x (50% Stricter Tolerances)</option>
                  <option value={1.2}>1.2x (20% Relaxed Tolerances)</option>
                </select>
                <span className="text-[10px] text-gov-sand-500 mt-1 block">
                  Simulates what percentage of instruments fail if maximum permissible errors are tightened.
                </span>
              </div>

              <div className="pt-3 border-t border-[#e5dfd1] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateConfigModalOpen(false)}
                  className="btn-gov-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingConfig}
                  className="btn-gov-primary text-xs"
                >
                  {creatingConfig ? 'Saving...' : 'Register Candidate Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
