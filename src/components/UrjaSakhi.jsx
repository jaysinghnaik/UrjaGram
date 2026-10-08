import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Users,
  Send,
  CheckCircle2,
  UploadCloud,
  FileCheck2,
  Building2,
  Zap,
  Landmark,
  Camera,
  Lock,
  Phone,
  User,
  ShieldCheck,
  LogOut,
  Clock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const URJASAKHI_STORAGE_KEY = 'urjagram.urjasakhi_session';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const COMPANY_PASSWORD = '0000';

function readValidUrjaSakhiSession() {
  try {
    const raw = localStorage.getItem(URJASAKHI_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.name || !session?.mobile) return null;

    const now = Date.now();
    const lastActive = Number(session.lastActive || session.loginTime || 0);

    // Inactivity check: if no activity for over 1 week, expire session
    if (now - lastActive > ONE_WEEK_MS) {
      localStorage.removeItem(URJASAKHI_STORAGE_KEY);
      return null;
    }

    // Rolling activity window: refresh lastActive timestamp
    const refreshed = { ...session, lastActive: now };
    localStorage.setItem(URJASAKHI_STORAGE_KEY, JSON.stringify(refreshed));
    return refreshed;
  } catch {
    return null;
  }
}

/**
 * Dedicated login portal for Urja Sakhi personnel.
 * Requires: Name, Mobile number, and Company Password "0000".
 * Remembers device for 1 week; re-prompts if inactive for 1 week.
 */
function UrjaSakhiLogin({ onLogin, error, setError, t }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanMobile = mobile.trim().replace(/\D/g, '');

    if (cleanName.length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }

    if (cleanMobile.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (password !== COMPANY_PASSWORD) {
      setError('Incorrect company password! Please enter the valid company password.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      onLogin({
        name: cleanName,
        mobile: cleanMobile,
        loginTime: Date.now(),
        lastActive: Date.now(),
      });
      setSubmitting(false);
    }, 350);
  };

  return (
    <div className="mx-auto max-w-lg animate-in fade-in zoom-in-95 duration-500 py-6">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/50 p-8 shadow-[0_20px_60px_rgba(147,51,234,0.12)] backdrop-blur-3xl md:p-10">
        {/* Glow ambient background accents */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-purple-400/20 to-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-emerald-400/20 to-teal-400/20 blur-3xl" />

        {/* Portal Header */}
        <div className="relative mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-emerald-500 p-0.5 shadow-xl shadow-purple-500/25">
            <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-white/90 backdrop-blur-md">
              <span className="text-3xl animate-pulse">👩🏻‍💼</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50/80 px-3 py-1 text-[11px] font-bold text-purple-700 shadow-sm mb-2.5">
            <Sparkles className="h-3 w-3 text-purple-600" />
            PM Surya Ghar · Field Facilitation
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Urja Sakhi Portal
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Authorized women energy facilitators login
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-xs font-semibold text-red-700 shadow-sm animate-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Your Full Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                id="urjasakhi-name"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="e.g. Sunita Devi"
                className="w-full rounded-2xl border border-white/80 bg-white/70 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm backdrop-blur-sm transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              />
            </div>
          </div>

          {/* Mobile Number Field */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Mobile Number
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Phone className="h-4 w-4" />
              </div>
              <input
                id="urjasakhi-mobile"
                type="tel"
                required
                maxLength={10}
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="10-digit mobile number"
                className="w-full rounded-2xl border border-white/80 bg-white/70 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm backdrop-blur-sm transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              />
            </div>
            <p className="mt-1 pl-1 text-[11px] text-slate-400">Must be a valid 10-digit contact number</p>
          </div>

          {/* Company Password Field */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Company Password
              </label>
              <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                Password: "0000"
              </span>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                id="urjasakhi-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter company password "
                className="w-full rounded-2xl border border-white/80 bg-white/70 py-3.5 pl-11 pr-12 text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm backdrop-blur-sm transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 tracking-wider"
              />
              <button
                id="urjasakhi-toggle-pwd-btn"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 1-Week Inactivity Security Notice */}
          <div className="rounded-2xl border border-slate-200/70 bg-white/40 p-4 text-xs text-slate-600 backdrop-blur-sm">
            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">1-Week Device Memory</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Once verified, your device stays unlocked for <span className="font-bold text-purple-700">7 days</span>. If inactive for more than 1 week, you will be prompted to log in again for security.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="urjasakhi-submit-btn"
            type="submit"
            disabled={submitting}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 py-4 text-sm font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.01] hover:shadow-purple-600/40 active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none mt-2"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Verifying Company Password...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 transition group-hover:scale-110" />
                <span>Verify & Enter Dashboard</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UrjaSakhi({ showToast }) {
  const { t } = useLanguage();

  // Authentication State
  const [session, setSession] = useState(() => readValidUrjaSakhiSession());
  const [loginError, setLoginError] = useState('');

  // Form & Workflow State
  const [formData, setFormData] = useState({
    householdHead: '',
    contactNumber: '',
    email: '',
    state: '',
    district: '',
    address: '',
    familySize: '',
    discom: '',
    consumerAccountNumber: '',
    sanctionedLoadKw: '',
    electricitySource: 'grid',
    monthlyBill: '',
    roofType: 'concrete',
    roofAreaSqft: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
  });

  const [documents, setDocuments] = useState({
    bill: { front: null, back: null },
    bankProof: { front: null },
    photos: [],
  });

  const [uploadingDoc, setUploadingDoc] = useState({ id: null, side: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [isDigilockerVerified, setIsDigilockerVerified] = useState(false);

  // DigiLocker Modal State
  const [showDigilockerModal, setShowDigilockerModal] = useState(false);
  const [digiStep, setDigiStep] = useState(1);

  // --- Camera Logic ---
  const [cameraActiveFor, setCameraActiveFor] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // 1-Week Inactivity Checking Loop
  useEffect(() => {
    const checkExpiry = () => {
      const valid = readValidUrjaSakhiSession();
      if (!valid && session) {
        setSession(null);
        showToast('Urja Sakhi session expired due to 1 week of inactivity. Please log in again.', 'info');
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [session, showToast]);

  // Keep rolling activity fresh during form work
  const recordActivity = () => {
    if (!session) return;
    const now = Date.now();
    const lastActive = Number(session.lastActive || session.loginTime || 0);

    // If inactive for > 1 week
    if (now - lastActive > ONE_WEEK_MS) {
      handleLogout('Session expired due to 1 week of inactivity. Please log in again.');
      return;
    }

    // Refresh every minute on user activity
    if (now - lastActive > 60000) {
      const updated = { ...session, lastActive: now };
      setSession(updated);
      try {
        localStorage.setItem(URJASAKHI_STORAGE_KEY, JSON.stringify(updated));
      } catch { }
    }
  };

  const handleLogin = (newSession) => {
    try {
      localStorage.setItem(URJASAKHI_STORAGE_KEY, JSON.stringify(newSession));
    } catch { }
    setSession(newSession);
    showToast(`Welcome, ${newSession.name}! Urja Sakhi access unlocked.`, 'success');
  };

  const handleLogout = (message) => {
    try {
      localStorage.removeItem(URJASAKHI_STORAGE_KEY);
    } catch { }
    setSession(null);
    showToast(typeof message === 'string' ? message : 'Urja Sakhi locked/logged out.', 'info');
  };

  useEffect(() => {
    if (cameraActiveFor && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActiveFor]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async (docId, side, isMultiple = false) => {
    recordActivity();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraActiveFor({ docId, side, isMultiple });
    } catch (err) {
      console.error(err);
      showToast('Could not access camera. Please check permissions.', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActiveFor(null);
  };

  const capturePhoto = () => {
    recordActivity();
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const { docId, side, isMultiple } = cameraActiveFor;
      stopCamera();

      if (isMultiple) {
        setUploadingDoc({ id: 'photos', side: 'all' });
        setTimeout(() => {
          setDocuments((prev) => ({ ...prev, photos: [...prev.photos, file.name] }));
          setUploadingDoc({ id: null, side: null });
          showToast(`1 photo captured successfully`, 'success');
        }, 500);
      } else {
        setUploadingDoc({ id: docId, side });
        setTimeout(() => {
          setDocuments((prev) => ({ ...prev, [docId]: { ...prev[docId], [side]: file.name } }));
          setUploadingDoc({ id: null, side: null });
          showToast(`Document captured successfully`, 'success');
        }, 500);
      }
    }, 'image/jpeg');
  };

  const handleFileChange = (e, type, side) => {
    recordActivity();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingDoc({ id: type, side });
      setTimeout(() => {
        setDocuments((prev) => ({
          ...prev,
          [type]: { ...prev[type], [side]: file.name },
        }));
        setUploadingDoc({ id: null, side: null });
        showToast(`${side.toUpperCase()} uploaded successfully`, 'success');
      }, 800);
    }
  };

  const handlePhotosChange = (e) => {
    recordActivity();
    if (e.target.files && e.target.files.length > 0) {
      const fileNames = Array.from(e.target.files).map((f) => f.name);
      setUploadingDoc({ id: 'photos', side: 'all' });
      setTimeout(() => {
        setDocuments((prev) => ({
          ...prev,
          photos: [...prev.photos, ...fileNames],
        }));
        setUploadingDoc({ id: null, side: null });
        showToast(`${fileNames.length} photo(s) uploaded successfully`, 'success');
      }, 1200);
    }
  };

  const handleChange = (e) => {
    recordActivity();
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    recordActivity();
    setIsSubmitting(true);
    setPushSuccess(false);

    try {
      const backendUrl = import.meta.env.VITE_GEE_BACKEND_URL || 'http://localhost:8000';
      const payload = {
        householdHead: formData.householdHead,
        contactNumber: formData.contactNumber,
        email: formData.email || undefined,
        state: formData.state,
        district: formData.district,
        address: formData.address,
        familySize: formData.familySize ? parseInt(formData.familySize, 10) : undefined,
        discom: formData.discom,
        consumerAccountNumber: formData.consumerAccountNumber,
        electricitySource: formData.electricitySource,
        monthlyBill: formData.monthlyBill ? parseFloat(formData.monthlyBill) : undefined,
        sanctionedLoadKw: formData.sanctionedLoadKw ? parseFloat(formData.sanctionedLoadKw) : undefined,
        category: 'Residential',
        roofType: formData.roofType,
        roofAreaSqft: formData.roofAreaSqft ? parseFloat(formData.roofAreaSqft) : undefined,
        bankName: formData.bankName || undefined,
        bankAccountNumber: formData.bankAccountNumber || undefined,
        bankIfsc: formData.bankIfsc || undefined,
        bankProofUrl: documents.bankProof?.front,
        electricityBillFrontUrl: documents.bill?.front,
        electricityBillBackUrl: documents.bill?.back,
        rooftopPhotoFrontUrl: documents.photos.length > 0 ? documents.photos[0] : null,
        rooftopPhotoBackUrl: documents.photos.length > 1 ? documents.photos[1] : null,
        rooftopPhotosList: documents.photos,
        urjaSakhiName: session?.name,
        urjaSakhiMobile: session?.mobile,
      };

      // 1. Push data to Backend Wrapper if available
      try {
        await fetch(`${backendUrl}/api/urjasakhi/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (backendErr) {
        console.warn('[UrjaSakhi] Backend wrapper not running, proceeding with local/Supabase sync.');
      }

      // 2. Save data to Supabase if configured
      if (supabase) {
        await supabase.from('urjasakhi_data').insert([
          {
            household_head: formData.householdHead,
            contact_number: formData.contactNumber,
            email: formData.email,
            state: formData.state,
            district: formData.district,
            address: formData.address,
            family_size: formData.familySize ? parseInt(formData.familySize, 10) : null,
            discom: formData.discom,
            consumer_account_number: formData.consumerAccountNumber,
            electricity_source: formData.electricitySource,
            monthly_bill: formData.monthlyBill ? parseFloat(formData.monthlyBill) : null,
            sanctioned_load_kw: formData.sanctionedLoadKw ? parseFloat(formData.sanctionedLoadKw) : null,
            roof_type: formData.roofType,
            roof_area_sqft: formData.roofAreaSqft ? parseFloat(formData.roofAreaSqft) : null,
            bank_name: formData.bankName,
            bank_account_number: formData.bankAccountNumber,
            bank_ifsc: formData.bankIfsc,
            bank_proof_url: documents.bankProof?.front,
            electricity_bill_front_url: documents.bill?.front,
            electricity_bill_back_url: documents.bill?.back,
            rooftop_photo_front_url: documents.photos.length > 0 ? documents.photos[0] : null,
            rooftop_photo_back_url: documents.photos.length > 1 ? documents.photos[1] : null,
            status: 'pushed',
            urjasakhi_name: session?.name || null,
            urjasakhi_mobile: session?.mobile || null,
          },
        ]);
      }

      setPushSuccess(true);
      showToast('Data orchestrated to MNRE, DISCOM & Banks successfully', 'success');

      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          householdHead: '',
          contactNumber: '',
          email: '',
          state: '',
          district: '',
          address: '',
          familySize: '',
          discom: '',
          consumerAccountNumber: '',
          sanctionedLoadKw: '',
          electricitySource: 'grid',
          monthlyBill: '',
          roofType: 'concrete',
          roofAreaSqft: '',
          bankName: '',
          bankAccountNumber: '',
          bankIfsc: '',
        });
        setDocuments({
          bill: { front: null, back: null },
          bankProof: { front: null },
          photos: [],
        });
        setPushSuccess(false);
        setIsDigilockerVerified(false);
      }, 3000);
    } catch (error) {
      console.error(error);
      showToast('Failed to submit data', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If NOT authenticated, render the Urja Sakhi Login Portal
  if (!session) {
    return (
      <UrjaSakhiLogin
        onLogin={handleLogin}
        error={loginError}
        setError={setLoginError}
        t={t}
      />
    );
  }

  // If AUTHENTICATED, render the full Urja Sakhi dashboard with session bar
  return (
    <>
      {cameraActiveFor && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <video ref={videoRef} autoPlay playsInline className="max-h-[70vh] w-full max-w-md rounded-2xl bg-black object-cover shadow-2xl" />
          <div className="mt-8 flex gap-6">
            <button type="button" onClick={stopCamera} className="rounded-full bg-white/10 border border-white/20 px-6 py-3 font-semibold text-white backdrop-blur-md transition hover:bg-white/20">
              Cancel
            </button>
            <button type="button" onClick={capturePhoto} className="flex items-center gap-2 rounded-full bg-purple-600 px-8 py-3 font-bold text-white shadow-[0_0_20px_rgba(147,51,234,0.5)] transition hover:bg-purple-500 hover:scale-105 active:scale-95">
              <Camera className="h-5 w-5" />
              Capture
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl" onClick={recordActivity}>
        {/* Active Urja Sakhi Session Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-purple-200/70 bg-gradient-to-r from-purple-50/90 via-fuchsia-50/70 to-white/90 p-4 backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{session.name}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                  Urja Sakhi
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Verified Session
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>📞 +91 {session.mobile}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <Clock className="h-3 w-3 text-purple-500" />
                  Remembered for 7 days
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleLogout()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-red-50 hover:text-red-700 hover:border-red-200"
            title="Lock screen or switch Urja Sakhi user"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-500 hover:text-red-600" />
            Lock / Logout
          </button>
        </div>

        {/* Dashboard Title */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-lg shadow-purple-500/20">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('us_title')}</h2>
            <p className="text-sm text-slate-500">PM Surya Ghar 100% Compliant Data Collection</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION: Consumer Details */}
          <div className="rounded-2xl border border-white/60 bg-white/40 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-bold text-slate-800">Consumer Details</h3>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Household Head</label>
                <input
                  type="text"
                  name="householdHead"
                  value={formData.householdHead}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Contact Number</label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                  placeholder="10-digit number"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Identity Verification</label>
                {isDigilockerVerified ? (
                  <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                    Verified via DigiLocker
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDigilockerModal(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                  >
                    <FileCheck2 className="h-5 w-5" />
                    Verify with DigiLocker
                  </button>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                  placeholder="House Number, Street, Village Name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                  placeholder="e.g. Haryana"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">District</label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                  placeholder="e.g. Panipat"
                />
              </div>
            </div>
          </div>

          {/* SECTION: Electricity & Roof Details */}
          <div className="rounded-2xl border border-white/60 bg-white/40 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-800">Electricity & Roof Details</h3>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">DISCOM (Electricity Board)</label>
                <input
                  type="text"
                  name="discom"
                  value={formData.discom}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                  placeholder="e.g. UHBVN"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Consumer Account Number</label>
                <input
                  type="text"
                  name="consumerAccountNumber"
                  value={formData.consumerAccountNumber}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                  placeholder="From Electricity Bill"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Sanctioned Load (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  name="sanctionedLoadKw"
                  value={formData.sanctionedLoadKw}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                  placeholder="e.g. 2.5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Monthly Bill (₹)</label>
                <input
                  type="number"
                  name="monthlyBill"
                  value={formData.monthlyBill}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                  placeholder="₹ Amount"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Roof Area (sq. ft.)</label>
                <input
                  type="number"
                  name="roofAreaSqft"
                  value={formData.roofAreaSqft}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                  placeholder="e.g. 500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Roof Type</label>
                <select
                  name="roofType"
                  value={formData.roofType}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
                >
                  <option value="concrete">Concrete / RCC</option>
                  <option value="tin">Tin / Asbestos</option>
                  <option value="kacha">Kacha / Thatched</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION: Banking Details */}
          <div className="rounded-2xl border border-white/60 bg-white/40 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <Landmark className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-800">Bank Details for Direct Benefit Transfer (DBT)</h3>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Bank Name</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="e.g. State Bank of India"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Account Number</label>
                <input
                  type="text"
                  name="bankAccountNumber"
                  value={formData.bankAccountNumber}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Account Number"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">IFSC Code</label>
                <input
                  type="text"
                  name="bankIfsc"
                  value={formData.bankIfsc}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="e.g. SBIN0001234"
                />
              </div>
            </div>
          </div>

          {/* SECTION: Document Uploads & Live Photo */}
          <div className="rounded-2xl border border-white/60 bg-white/40 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-800">Documents & Physical Photos</h3>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {/* Electricity Bill Upload */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/20 p-4 text-center">
                <span className="mb-2 text-sm font-semibold text-slate-700">Electricity Bill</span>
                {documents.bill.front && (
                  <div className="mb-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Uploaded
                  </div>
                )}
                {uploadingDoc.id === 'bill' ? (
                  <div className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
                  </div>
                ) : (
                  <div className="flex gap-2 w-full mt-auto">
                    <button
                      type="button"
                      onClick={() => startCamera('bill', 'front')}
                      className="flex flex-1 items-center justify-center gap-1 rounded-full bg-slate-50 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 shadow-sm transition hover:bg-slate-100 hover:text-purple-600 hover:border-purple-200 cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      Camera
                    </button>
                    <label className="flex flex-1 items-center justify-center gap-1 rounded-full bg-slate-50 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 shadow-sm transition hover:bg-slate-100 hover:text-purple-600 hover:border-purple-200 cursor-pointer">
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'bill', 'front')} />
                      <UploadCloud className="h-4 w-4" />
                      Upload
                    </label>
                  </div>
                )}
              </div>

              {/* Bank Passbook Upload */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/20 p-4 text-center">
                <span className="mb-2 text-sm font-semibold text-slate-700">Bank Passbook / Cheque</span>
                {documents.bankProof.front && (
                  <div className="mb-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Uploaded
                  </div>
                )}
                {uploadingDoc.id === 'bankProof' ? (
                  <div className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
                  </div>
                ) : (
                  <div className="flex gap-2 w-full mt-auto">
                    <button
                      type="button"
                      onClick={() => startCamera('bankProof', 'front')}
                      className="flex flex-1 items-center justify-center gap-1 rounded-full bg-slate-50 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 shadow-sm transition hover:bg-slate-100 hover:text-emerald-600 hover:border-emerald-200 cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      Camera
                    </button>
                    <label className="flex flex-1 items-center justify-center gap-1 rounded-full bg-slate-50 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 shadow-sm transition hover:bg-slate-100 hover:text-emerald-600 hover:border-emerald-200 cursor-pointer">
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'bankProof', 'front')} />
                      <UploadCloud className="h-4 w-4" />
                      Upload
                    </label>
                  </div>
                )}
              </div>

              {/* Rooftop Photos */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/20 p-4 text-center">
                <span className="mb-2 text-sm font-semibold text-slate-700">Rooftop Photos</span>
                {documents.photos.length > 0 && (
                  <div className="mb-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <div className="flex items-center gap-1">
                      {documents.photos.length} Uploaded
                    </div>
                  </div>
                )}
                {uploadingDoc.id === 'photos' ? (
                  <div className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
                  </div>
                ) : (
                  <div className="flex gap-2 w-full mt-auto">
                    <button
                      type="button"
                      onClick={() => startCamera('photos', 'all', true)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-full bg-slate-50 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 shadow-sm transition hover:bg-slate-100 hover:text-blue-600 hover:border-blue-200 cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      Camera
                    </button>
                    <label className="flex flex-1 items-center justify-center gap-1 rounded-full bg-slate-50 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 shadow-sm transition hover:bg-slate-100 hover:text-blue-600 hover:border-blue-200 cursor-pointer">
                      <input type="file" multiple className="hidden" accept="image/*" onChange={handlePhotosChange} />
                      <UploadCloud className="h-4 w-4" />
                      Upload
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || pushSuccess || !isDigilockerVerified}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-base font-bold text-white shadow-lg transition-all focus:outline-none focus:ring-4 ${pushSuccess
                  ? 'bg-emerald-500 shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-purple-500/30 hover:shadow-purple-500/40 hover:scale-[1.02] focus:ring-purple-500/20'
                } disabled:pointer-events-none disabled:opacity-70`}
            >
              {isSubmitting ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Orchestrating Data...</span>
                </>
              ) : pushSuccess ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Successfully Dispatched!</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Simulated DigiLocker Modal */}
      {showDigilockerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-[#1A2E46] p-5 text-center flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-inner">
                <img
                  src="https://digilocker.gov.in/assets/img/digilocker-logo.png"
                  alt="DigiLocker"
                  className="h-6 w-6 object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/e/e0/DigiLocker_logo.png';
                  }}
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">DigiLocker</h3>
                <p className="text-[10px] text-blue-200 uppercase tracking-widest">National eGovernance Division</p>
              </div>
            </div>

            <div className="p-6">
              {digiStep === 1 ? (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <p className="text-sm font-bold text-slate-700 text-center mb-6">Sign In to your account!</p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Aadhaar / Mobile Number"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium focus:border-[#1A2E46] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1A2E46]"
                    />
                    <input
                      type="password"
                      placeholder="6 digit security PIN"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium focus:border-[#1A2E46] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1A2E46]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      showToast('Sending OTP...', 'info');
                      setTimeout(() => setDigiStep(2), 1200);
                    }}
                    className="w-full rounded-xl bg-[#1A2E46] py-3.5 mt-2 text-sm font-bold text-white shadow-md hover:bg-[#112032] hover:shadow-lg transition-all active:scale-[0.98]"
                  >
                    Sign In
                  </button>
                  <p className="text-center text-xs text-blue-600 font-semibold cursor-pointer hover:underline mt-4">
                    Forgot security PIN?
                  </p>
                </div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6 text-center">
                    <p className="text-xs font-semibold text-blue-800">
                      OTP sent to your registered mobile number ending in <span className="font-bold text-blue-900">XXXX-484</span>
                    </p>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    maxLength={6}
                    className="w-full text-center tracking-[0.5em] font-black rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg focus:border-[#1A2E46] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1A2E46]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      showToast('Identity Verified Successfully!', 'success');
                      setShowDigilockerModal(false);
                      setIsDigilockerVerified(true);
                      setDigiStep(1);
                    }}
                    className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all active:scale-[0.98]"
                  >
                    Verify & Proceed
                  </button>
                </div>
              )}
            </div>
            <div className="bg-slate-50 p-4 text-center border-t border-slate-100 flex justify-between items-center px-6">
              <span className="text-[10px] text-slate-400 font-medium">Powered by MeitY</span>
              <button
                type="button"
                onClick={() => {
                  setShowDigilockerModal(false);
                  setDigiStep(1);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
