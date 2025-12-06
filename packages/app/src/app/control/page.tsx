'use client';

import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { Shield, ArrowLeft, CloudRain, Zap, Wallet } from 'lucide-react';

const WEATHER_ADAPTER_ABI = [
  "function setWeather(string location, bool isAdverse) external",
  "function isAdverse(string location) external view returns (bool)"
];

const POLICY_MANAGER_ABI = [
  "function policyCount() public view returns (uint256)",
  "function getPolicy(uint256 _id) external view returns (tuple(address farmer, string location, string cropType, uint256 insuredAmount, uint256 premium, address premiumToken, uint256 startTime, uint256 endTime, bool active, bool paidOut))"
];

const PAYOUT_ABI = ["function checkAndPayout(uint256 _policyId) external"];

type Policy = {
  farmer: string;
  location: string;
  cropType: string;
  insuredAmount: bigint;
  premium: bigint;
  premiumToken: string;
  startTime: bigint;
  endTime: bigint;
  active: boolean;
  paidOut: boolean;
};

const CONFIG = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc",
  weatherAdapter: process.env.NEXT_PUBLIC_WEATHER_ADAPTER_ADDRESS || "0x0000000000000000000000000000000000000000",
  policyManager: process.env.NEXT_PUBLIC_POLICY_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000",
  payoutModule: process.env.NEXT_PUBLIC_PAYOUT_MODULE_ADDRESS || "0x0000000000000000000000000000000000000000",
  submitters: (process.env.NEXT_PUBLIC_ORACLE_SUBMITTERS || process.env.NEXT_PUBLIC_ORACLE_SUBMITTER_ADDRESS || "")
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};

export default function ControlPanel() {
  const [account, setAccount] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [isAdverse, setIsAdverse] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [policies, setPolicies] = useState<{ id: number; data: Policy }[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [adapterStatus, setAdapterStatus] = useState<string>('Unknown');

  const rpcProvider = useMemo(() => new ethers.JsonRpcProvider(CONFIG.rpcUrl), []);

  useEffect(() => {
    if ((window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) setAccount(accounts[0]);
        });
    }
    loadPolicies();
  }, []);

  useEffect(() => {
    if (selectedId && policies.length) {
      const p = policies.find(p => p.id === selectedId)?.data || null;
      setSelectedPolicy(p || null);
      if (p) {
        setLocation(p.location);
        refreshAdapterStatus(p.location);
      }
    }
  }, [selectedId, policies]);

  const loadPolicies = async () => {
    try {
      const pm = new ethers.Contract(CONFIG.policyManager, POLICY_MANAGER_ABI, rpcProvider);
      const adapter = new ethers.Contract(CONFIG.weatherAdapter, WEATHER_ADAPTER_ABI, rpcProvider);
      const count: bigint = await pm.policyCount();
      const list: { id: number; data: Policy }[] = [];
      for (let i = 1; i <= Number(count); i++) {
        const p: Policy = await pm.getPolicy(i);
        list.push({ id: i, data: p });
      }
      setPolicies(list);
      const latest = list.length ? list[list.length - 1] : null;
      const newSelected = latest ? latest.id : null;
      setSelectedId(newSelected);
      if (latest) {
        setSelectedPolicy(latest.data);
        setLocation(latest.data.location);
        try {
          const adv = await adapter.isAdverse(latest.data.location);
          setAdapterStatus(adv ? 'Adverse' : 'Normal');
        } catch (err) {
          setAdapterStatus('Unknown');
        }
      }
    } catch (err) {
      console.error(err);
      setStatus('Error loading policies');
    }
  };

  const refreshAdapterStatus = async (loc: string) => {
    try {
      const adapter = new ethers.Contract(CONFIG.weatherAdapter, WEATHER_ADAPTER_ABI, rpcProvider);
      const adv: boolean = await adapter.isAdverse(loc);
      setAdapterStatus(adv ? 'Adverse' : 'Normal');
      setIsAdverse(adv);
    } catch (err) {
      setAdapterStatus('Unknown');
    }
  };

  const connect = async () => {
    if (!(window as any).ethereum) {
      setStatus('Please install MetaMask');
      return;
    }
    const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[0]);
  };

  const setWeather = async (flag: boolean) => {
    if (!(window as any).ethereum) {
      setStatus('Please install MetaMask');
      return;
    }
    if (!location) {
      setStatus('No location found for selected policy');
      return;
    }
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const signerAddr = (await signer.getAddress()).toLowerCase();
      if (CONFIG.submitters.length > 0 && !CONFIG.submitters.includes(signerAddr)) {
        setStatus('Not authorized: connect with oracle submitter address');
        return;
      }
      const adapter = new ethers.Contract(CONFIG.weatherAdapter, WEATHER_ADAPTER_ABI, signer);
      const tx = await adapter.setWeather(location, flag);
      setStatus(`Set weather tx: ${tx.hash}`);
      await tx.wait();
      setStatus('Weather status updated');
      await refreshAdapterStatus(location);
    } catch (err: any) {
      console.error(err);
      setStatus('Error setting weather: ' + (err.reason || err.message || 'Unknown'));
    }
  };

  const triggerPayout = async () => {
    if (!(window as any).ethereum) {
      setStatus('Please install MetaMask');
      return;
    }
    if (!selectedId) {
      setStatus('No policy selected');
      return;
    }
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const payout = new ethers.Contract(CONFIG.payoutModule, PAYOUT_ABI, signer);
      const tx = await payout.checkAndPayout(selectedId);
      setStatus(`Payout tx: ${tx.hash}`);
      await tx.wait();
      setStatus('Payout attempted (check status on dashboard)');
      await loadPolicies();
    } catch (err: any) {
      console.error(err);
      setStatus('Error triggering payout: ' + (err.reason || err.message || 'Unknown'));
    }
  };

  const setAdverseAndPayout = async () => {
    await setWeather(true);
    await triggerPayout();
  };

  const isAuthorized = CONFIG.submitters.length === 0
    ? true
    : CONFIG.submitters.includes(account.toLowerCase());

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="border-b border-white/10 backdrop-blur-md fixed w-full z-50 bg-[#050505]/80">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Shield className="w-7 h-7 text-[#00ff9d]" />
            <span className="text-lg font-bold tracking-tight">CropGuard Control</span>
          </Link>
          <button
            onClick={connect}
            className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full transition-all"
          >
            <Wallet className="w-4 h-4 text-[#00ff9d]" />
            <span className="text-sm font-medium">
              {account ? `${account.substring(0, 6)}...${account.substring(38)}` : 'Connect Wallet'}
            </span>
          </button>
        </div>
      </nav>

      <main className="container mx-auto px-6 pt-28 pb-16 space-y-8">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to dashboard
        </Link>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <CloudRain className="w-5 h-5 text-blue-400 mr-2" /> Weather Control
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Select Policy</label>
                <select
                  value={selectedId || ''}
                  onChange={(e) => setSelectedId(Number(e.target.value) || null)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff9d]/50 transition [&>option]:bg-black"
                >
                  <option value="">Latest</option>
                  {policies.map(p => (
                    <option key={p.id} value={p.id}>
                      #{p.id} · {p.data.location} · {p.data.paidOut ? 'Paid' : p.data.active ? 'Active' : 'Inactive'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400">Location (from selected policy)</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff9d]/50 transition"
                  readOnly
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setWeather(false)}
                  className="flex-1 bg-white/5 text-white border border-white/10 px-4 py-3 rounded-xl font-semibold hover:bg-white/10 transition"
                  disabled={!isAuthorized}
                >
                  Set Normal
                </button>
                <button
                  onClick={() => setWeather(true)}
                  className="flex-1 bg-[#00ff9d] text-black px-4 py-3 rounded-xl font-semibold hover:shadow-[0_0_12px_rgba(0,255,157,0.4)] transition"
                  disabled={!isAuthorized}
                >
                  Set Adverse
                </button>
              </div>
              <p className="text-sm text-gray-400">Adapter status: <span className="text-white">{adapterStatus}</span></p>
              {!isAuthorized && (
                <p className="text-xs text-red-400">Connect with an authorized submitter to change weather.</p>
              )}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur space-y-4">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Zap className="w-5 h-5 text-yellow-400 mr-2" /> Policy & Payout
            </h2>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Selected Policy</span>
                <span className="text-white">{selectedId ? `#${selectedId}` : 'Latest/None'}</span>
              </div>
              <div className="flex justify-between">
                <span>Location</span>
                <span className="text-white">{selectedPolicy?.location || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="text-white">{selectedPolicy ? (selectedPolicy.paidOut ? 'Paid out' : selectedPolicy.active ? 'Active' : 'Inactive') : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Adverse (adapter)</span>
                <span className="text-white">{adapterStatus}</span>
              </div>
            </div>
            <button
              onClick={triggerPayout}
              className="mt-2 w-full bg-white/5 text-white border border-white/10 px-4 py-3 rounded-xl font-semibold hover:bg-white/10 transition"
            >
              Trigger Payout for Selected Policy
            </button>
            <button
              onClick={setAdverseAndPayout}
              className="w-full bg-[#00ff9d] text-black px-4 py-3 rounded-xl font-semibold hover:shadow-[0_0_12px_rgba(0,255,157,0.4)] transition"
            >
              Set Adverse + Trigger Payout
            </button>
            <p className="mt-2 text-xs text-gray-400">Make sure CollateralPool has FLR liquidity staked; otherwise payout will revert.</p>
          </div>
        </div>

        {status && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-200">
            {status}
          </div>
        )}
      </main>
    </div>
  );
}
