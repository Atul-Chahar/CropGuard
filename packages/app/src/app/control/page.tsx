'use client';

import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { Shield, ArrowLeft, CloudRain, Zap } from 'lucide-react';

const WEATHER_ADAPTER_ABI = [
  "function setWeather(string location, bool isAdverse) external",
  "function isAdverse(string location) external view returns (bool)"
];

const POLICY_MANAGER_ABI = [
  "function policyCount() public view returns (uint256)",
  "function getPolicy(uint256 _id) external view returns (tuple(address farmer, string location, string cropType, uint256 insuredAmount, uint256 premium, address premiumToken, uint256 startTime, uint256 endTime, bool active, bool paidOut))"
];

const PAYOUT_ABI = [
  "function checkAndPayout(uint256 _policyId) external"
];

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
  const [location, setLocation] = useState<string>('Bangalore');
  const [isAdverse, setIsAdverse] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [latestPolicyId, setLatestPolicyId] = useState<number | null>(null);
  const [policyInfo, setPolicyInfo] = useState<any>(null);
  const [adapterStatus, setAdapterStatus] = useState<string>('Unknown');

  const rpcProvider = useMemo(() => new ethers.JsonRpcProvider(CONFIG.rpcUrl), []);

  useEffect(() => {
    if ((window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) setAccount(accounts[0]);
        });
    }
  }, []);

  useEffect(() => {
    loadPolicy();
  }, [location]);

  const loadPolicy = async () => {
    try {
      const policyContract = new ethers.Contract(CONFIG.policyManager, POLICY_MANAGER_ABI, rpcProvider);
      const adapter = new ethers.Contract(CONFIG.weatherAdapter, WEATHER_ADAPTER_ABI, rpcProvider);
      const count: bigint = await policyContract.policyCount();
      if (count > BigInt(0)) {
        const id = Number(count);
        setLatestPolicyId(id);
        const p = await policyContract.getPolicy(id);
        setPolicyInfo(p);
        const adverse: boolean = await adapter.isAdverse(p.location);
        setAdapterStatus(adverse ? 'Adverse' : 'Normal');
      } else {
        setLatestPolicyId(null);
        setPolicyInfo(null);
        setAdapterStatus('No policies');
      }
    } catch (err) {
      console.error(err);
      setStatus('Error loading policy data');
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
      await loadPolicy();
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
    if (!latestPolicyId) {
      setStatus('No policy to payout');
      return;
    }
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const payout = new ethers.Contract(CONFIG.payoutModule, PAYOUT_ABI, signer);
      const tx = await payout.checkAndPayout(latestPolicyId);
      setStatus(`Payout tx: ${tx.hash}`);
      await tx.wait();
      setStatus('Payout attempted (check status on dashboard)');
      await loadPolicy();
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
            <WalletIcon />
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
                <label className="text-sm text-gray-400">Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff9d]/50 transition"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setWeather(false)}
                  className="flex-1 bg-white/5 text-white border border-white/10 px-4 py-3 rounded-xl font-semibold hover:bg-white/10 transition"
                >
                  Set Normal
                </button>
                <button
                  onClick={() => setWeather(true)}
                  className="flex-1 bg-[#00ff9d] text-black px-4 py-3 rounded-xl font-semibold hover:shadow-[0_0_12px_rgba(0,255,157,0.4)] transition"
                >
                  Set Adverse
                </button>
              </div>
              <p className="text-sm text-gray-400">
                Adapter status: <span className="text-white">{adapterStatus}</span>
              </p>
              {!isAuthorized && (
                <p className="text-xs text-red-400">Connect with the oracle submitter address to change weather.</p>
              )}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Zap className="w-5 h-5 text-yellow-400 mr-2" /> Policy & Payout
            </h2>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Latest Policy</span>
                <span className="text-white">{latestPolicyId ? `#${latestPolicyId}` : 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span>Location</span>
                <span className="text-white">{policyInfo?.location || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="text-white">{policyInfo ? (policyInfo.paidOut ? 'Paid out' : policyInfo.active ? 'Active' : 'Inactive') : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Adverse (adapter)</span>
                <span className="text-white">{adapterStatus}</span>
              </div>
            </div>
            <button
              onClick={triggerPayout}
              className="mt-4 w-full bg-white/5 text-white border border-white/10 px-4 py-3 rounded-xl font-semibold hover:bg-white/10 transition"
            >
              Trigger Payout for Latest Policy
            </button>
            <button
              onClick={setAdverseAndPayout}
              className="mt-3 w-full bg-[#00ff9d] text-black px-4 py-3 rounded-xl font-semibold hover:shadow-[0_0_12px_rgba(0,255,157,0.4)] transition"
            >
              Set Adverse + Trigger Payout (Latest Policy)
            </button>
            <p className="mt-2 text-xs text-gray-400">
              Make sure CollateralPool has FLR liquidity staked; otherwise payout will revert.
            </p>
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

function WalletIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#00ff9d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7h18v10H3z" />
      <path d="M16 12h2" />
    </svg>
  );
}
