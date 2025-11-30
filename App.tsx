
import React, { useState, useEffect } from 'react';
import { AppState, ConciergeMood, User, MeetingConstraints, TimeSlot, MeetingDetails } from './types';
import { CURRENT_USER, MOCK_COWORKERS } from './constants';
import Concierge from './components/Concierge';
import * as geminiService from './services/geminiService';
import * as googleService from './services/googleService';
import * as utils from './utils';

// Icons
const ChevronRight = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const CalendarIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const EditIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const SearchIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const GoogleIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>;

export default function App() {
  // State
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [conciergeMood, setConciergeMood] = useState<ConciergeMood>(ConciergeMood.IDLE);
  
  // User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Data State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCoworker, setSelectedCoworker] = useState<User | null>(null);
  const [constraintInput, setConstraintInput] = useState("");
  const [constraints, setConstraints] = useState<MeetingConstraints | null>(null);
  const [suggestedSlots, setSuggestedSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [finalDetails, setFinalDetails] = useState<MeetingDetails | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize Google API on mount
  useEffect(() => {
    // Only attempt to init if we have keys, otherwise silence errors for preview mode
    if (process.env.REACT_APP_GOOGLE_CLIENT_ID) {
      googleService.initializeGoogleApi().catch(e => console.warn("Google API Init failed (likely missing keys)", e));
    }
  }, []);

  // Handlers
  const handleRealLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    setConciergeMood(ConciergeMood.THINKING);

    try {
      const user = await googleService.loginWithGoogle();
      setCurrentUser(user);
      setAppState(AppState.DASHBOARD);
      setConciergeMood(ConciergeMood.IDLE);
    } catch (e: any) {
      console.error("Login failed", e);
      // Fallback for demo if real login fails (common in preview environments)
      setAuthError("Auth failed (likely domain mismatch in preview). Entering Demo Mode.");
      setConciergeMood(ConciergeMood.CONFUSED);
      
      setTimeout(() => {
        // Fallback demo user
        setCurrentUser(CURRENT_USER);
        setAppState(AppState.DASHBOARD);
        setConciergeMood(ConciergeMood.IDLE);
        setAuthError(null);
      }, 2000);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const startNewMeeting = () => {
    // Reset flow
    setSelectedCoworker(null);
    setConstraintInput("");
    setConstraints(null);
    setSuggestedSlots([]);
    setSelectedSlot(null);
    setFinalDetails(null);
    setSearchTerm("");
    
    setAppState(AppState.SELECT_COWORKER);
    setConciergeMood(ConciergeMood.IDLE);
  };

  const selectUser = (user: User) => {
    setSelectedCoworker(user);
    setAppState(AppState.CONSTRAINTS);
    setConciergeMood(ConciergeMood.LISTENING);
  };

  const processConstraints = async () => {
    if (!constraintInput.trim()) return;

    setLoading(true);
    setAppState(AppState.LOADING_SLOTS);
    setConciergeMood(ConciergeMood.THINKING);

    try {
      // 1. Parse text with Gemini
      const parsed = await geminiService.parseConstraints(constraintInput, new Date());
      setConstraints(parsed);
      
      // 2. Try Real Google Calendar Slots
      let slots: TimeSlot[] = [];
      try {
        // This will only work if we are really logged in and have API permissions
        if (currentUser && selectedCoworker && currentUser.id !== 'u-current' && currentUser.id !== 'u1') {
           slots = await googleService.findRealFreeSlots(currentUser.email, selectedCoworker.email, parsed);
        }
      } catch (err) {
        console.warn("Real calendar lookup failed/skipped, using Gemini+Mock data");
      }

      // 3. Fallback to Gemini/Algorithmic Slots if real API returns empty (or we are in demo mode)
      if (slots.length === 0) {
        // Simulate API latency for effect if we fell back instantly
        await new Promise(r => setTimeout(r, 1500));
        slots = utils.findMockSlots(parsed);
      }

      setSuggestedSlots(slots);
      setAppState(AppState.SUGGESTIONS);
      setConciergeMood(slots.length > 0 ? ConciergeMood.POINTING : ConciergeMood.CONFUSED);

    } catch (e) {
      console.error(e);
      setConciergeMood(ConciergeMood.CONFUSED);
    } finally {
      setLoading(false);
    }
  };

  const confirmSlot = async (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setLoading(true);
    setConciergeMood(ConciergeMood.THINKING);

    // Generate details with Gemini
    if (selectedCoworker && currentUser) {
      const details = await geminiService.generateCreativeDetails(
        currentUser, 
        selectedCoworker, 
        slot, 
        constraintInput
      );
      setFinalDetails(details);
      setAppState(AppState.CONFIRMATION);
      setConciergeMood(ConciergeMood.POINTING);
      setLoading(false);
    }
  };

  const finalizeMeeting = async () => {
    if (!selectedSlot || !finalDetails || !currentUser || !selectedCoworker) return;

    setLoading(true);
    try {
      // Try to create REAL event
      if (currentUser.id !== 'u-current' && currentUser.id !== 'u1') {
        await googleService.createRealEvent(
          selectedSlot, 
          finalDetails, 
          [currentUser.email, selectedCoworker.email]
        );
      } else {
        // Simulate success for demo mode
        await new Promise(r => setTimeout(r, 1000));
      }

      setAppState(AppState.SUCCESS);
      setConciergeMood(ConciergeMood.CELEBRATING);
    } catch (e) {
      console.error("Failed to create event", e);
      setConciergeMood(ConciergeMood.CONFUSED);
      alert("Error creating Google Calendar event. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // --- Components for sections ---

  const LoginScreen = () => (
    <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in w-full max-w-md mx-auto">
      <div className="text-center space-y-2">
        <h1 className="font-retro text-5xl text-arcade-primary drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]">CMAC CONCIERGE</h1>
        <p className="text-slate-400">Internal Scheduling System v2.5</p>
      </div>

      <div className="w-full bg-slate-800 p-8 border-2 border-slate-700 shadow-2xl relative overflow-hidden">
        {isLoggingIn && (
            <div className="absolute inset-0 bg-slate-900/90 z-10 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-arcade-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="font-retro text-arcade-primary">CONNECTING TO GOOGLE...</div>
            </div>
        )}

        <div className="space-y-4">
            <button 
                onClick={handleRealLogin}
                className="w-full group relative px-8 py-4 bg-arcade-panel border-2 border-arcade-primary text-arcade-primary font-retro text-xl hover:bg-arcade-primary hover:text-slate-900 transition-all shadow-[4px_4px_0px_0px_rgba(45,212,191,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
                <span className="flex items-center justify-center gap-2">
                <GoogleIcon /> SIGN IN WITH GOOGLE
                </span>
            </button>
            
            {authError && (
              <div className="text-arcade-error text-xs text-center border border-arcade-error p-2 bg-red-900/20">
                {authError}
              </div>
            )}
        </div>
      </div>
      
      <p className="text-xs text-slate-600 text-center max-w-xs">
          Production Mode. Requires valid .env API keys and whitelisted domain.
      </p>
    </div>
  );

  const Dashboard = () => (
    <div className="h-full flex flex-col items-center justify-center space-y-6 animate-fade-in">
      <div className="text-center">
          <h2 className="font-retro text-3xl text-white">WELCOME, {currentUser?.name.toUpperCase()}</h2>
          <p className="text-slate-500 text-sm mt-1">{currentUser?.email}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        <button 
          onClick={startNewMeeting}
          className="p-6 bg-arcade-panel border-l-4 border-arcade-accent hover:bg-slate-700 transition flex flex-col items-start gap-2 group shadow-lg"
        >
          <span className="font-retro text-2xl text-arcade-accent group-hover:translate-x-1 transition-transform">SCHEDULE MEETING &rarr;</span>
          <span className="text-sm text-slate-400">Find mutual time with a coworker</span>
        </button>
        <div className="p-6 bg-arcade-panel border-l-4 border-slate-600 opacity-50 cursor-not-allowed flex flex-col items-start gap-2">
           <span className="font-retro text-2xl text-slate-400">VIEW UPCOMING (LOCKED)</span>
           <span className="text-sm text-slate-500">System maintenance in progress</span>
        </div>
      </div>
      
      <button onClick={() => setAppState(AppState.LOGIN)} className="text-xs text-slate-600 hover:text-arcade-error mt-8">
          LOGOUT
      </button>
    </div>
  );

  const CoworkerSelect = () => {
    const filtered = MOCK_COWORKERS.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="flex flex-col h-full space-y-6 animate-fade-in">
        <h3 className="font-retro text-2xl text-arcade-primary border-b border-slate-700 pb-2">SELECT PARTICIPANT</h3>
        
        {/* Search Input */}
        <div className="relative">
             <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 p-3 pl-10 text-slate-200 focus:border-arcade-primary focus:shadow-[0_0_10px_rgba(45,212,191,0.2)] outline-none transition-all font-sans"
             />
             <div className="absolute left-3 top-3.5 text-slate-500">
               <SearchIcon />
             </div>
        </div>

        <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1 content-start">
          {filtered.map(user => (
            <button 
              key={user.id} 
              onClick={() => selectUser(user)}
              className="flex items-center gap-4 p-4 bg-arcade-panel border border-slate-700 hover:border-arcade-secondary hover:shadow-[0_0_15px_rgba(192,132,252,0.2)] transition-all text-left group"
            >
              <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded bg-slate-800 pixelated grayscale group-hover:grayscale-0 transition-all" />
              <div>
                <div className="font-bold text-slate-200 group-hover:text-arcade-secondary">{user.name}</div>
                <div className="text-xs text-slate-500">{user.role}</div>
              </div>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-arcade-secondary font-retro">
                SELECT &gt;
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
             <div className="text-center text-slate-500 py-4 italic">No coworkers found.</div>
          )}
        </div>
      </div>
    );
  };

  const ConstraintForm = () => (
    <div className="flex flex-col h-full space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 border-b border-slate-700 pb-4">
        <img src={selectedCoworker?.avatar} className="w-10 h-10 rounded pixelated" />
        <div>
           <div className="text-xs text-slate-500">SCHEDULING WITH</div>
           <div className="font-bold text-white">{selectedCoworker?.name}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <label className="text-slate-300 text-sm">Tell Concierge what you need:</label>
        <textarea 
          value={constraintInput}
          onChange={(e) => setConstraintInput(e.target.value)}
          placeholder="e.g. I need an hour to discuss the Oak Ridge project sometime after Tuesday afternoon..."
          className="w-full h-32 bg-slate-900 border-2 border-slate-700 focus:border-arcade-primary p-4 text-slate-200 resize-none outline-none font-sans"
        />
        <div className="bg-slate-900/50 p-3 rounded text-xs text-slate-500 border border-slate-800">
          <strong className="text-arcade-accent">TIP:</strong> Be natural. Mention duration, dates, or time of day.
        </div>
      </div>

      <button 
        onClick={processConstraints}
        disabled={!constraintInput.trim()}
        className="w-full py-4 bg-arcade-primary text-slate-900 font-retro text-xl hover:bg-teal-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
      >
        SCAN CALENDARS
      </button>
    </div>
  );

  const SuggestionList = () => (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
       <div className="flex justify-between items-end border-b border-slate-700 pb-2">
         <h3 className="font-retro text-2xl text-arcade-primary">AVAILABLE SLOTS</h3>
       </div>
       
       <div className="flex justify-between items-center bg-slate-800 p-3 rounded border border-slate-700">
         <div className="text-xs text-slate-400 font-mono">
           {constraints?.durationMinutes}m | {constraints?.startDate} | {constraints?.timeOfDay}
         </div>
         <button 
            onClick={() => setAppState(AppState.CONSTRAINTS)} 
            className="text-xs text-arcade-primary hover:text-white flex items-center gap-1 font-bold"
         >
            <EditIcon /> EDIT RULES
         </button>
       </div>

       <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
         {suggestedSlots.map((slot) => (
           <button 
             key={slot.id}
             onClick={() => confirmSlot(slot)}
             className="w-full bg-arcade-panel p-4 border-l-4 border-transparent hover:border-arcade-secondary hover:bg-slate-700 text-left transition group"
           >
             <div className="flex justify-between items-center mb-1">
               <span className="font-retro text-xl text-white group-hover:text-arcade-secondary">
                 {utils.formatDate(new Date(slot.start))}
               </span>
               <span className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-400">
                 {constraints?.durationMinutes} MIN
               </span>
             </div>
             <p className="text-xs text-slate-400 font-mono">
               Reason: {slot.reason}
             </p>
           </button>
         ))}
         {suggestedSlots.length === 0 && (
           <div className="text-center py-10 text-slate-500">
             No slots found matching your criteria.
             <br/>
             <button onClick={() => setAppState(AppState.CONSTRAINTS)} className="text-arcade-primary mt-2 underline">Try adjusting your request</button>
           </div>
         )}
       </div>
    </div>
  );

  const Confirmation = () => (
    <div className="flex flex-col h-full space-y-6 animate-fade-in">
       <h3 className="font-retro text-2xl text-arcade-accent text-center">CONFIRM MEETING</h3>
       
       <div className="bg-slate-900 border-2 border-slate-700 p-6 space-y-4 relative overflow-hidden">
         {/* Decorative stripe */}
         <div className="absolute top-0 left-0 w-2 h-full bg-arcade-accent"></div>

         <div>
           <label className="text-xs text-slate-500 uppercase tracking-wider">Title</label>
           <div className="text-lg font-bold text-white">{finalDetails?.title}</div>
         </div>
         
         <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider">When</label>
              <div className="text-sm text-white">{selectedSlot && utils.formatDate(new Date(selectedSlot.start))}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider">Where</label>
              <div className="text-sm text-white">{finalDetails?.location}</div>
            </div>
         </div>

         <div>
           <label className="text-xs text-slate-500 uppercase tracking-wider">Description</label>
           <div className="text-sm text-slate-300 italic">"{finalDetails?.description}"</div>
         </div>

         <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
            <div className="flex -space-x-2">
              <img src={currentUser?.avatar} className="w-8 h-8 rounded-full border-2 border-slate-900" />
              <img src={selectedCoworker?.avatar} className="w-8 h-8 rounded-full border-2 border-slate-900" />
            </div>
            <span className="text-xs text-slate-500">Invites sent to {selectedCoworker?.email}</span>
         </div>
       </div>

       <div className="flex gap-4">
         <button onClick={() => setAppState(AppState.SUGGESTIONS)} className="flex-1 py-3 border border-slate-600 text-slate-400 hover:text-white hover:border-white font-retro">
           BACK
         </button>
         <button onClick={finalizeMeeting} className="flex-[2] py-3 bg-arcade-primary text-slate-900 font-retro text-xl hover:bg-teal-300 shadow-[4px_4px_0px_0px_rgba(20,184,166,1)]">
           SEND INVITE
         </button>
       </div>
    </div>
  );

  const SuccessScreen = () => (
    <div className="flex flex-col items-center justify-center h-full space-y-6 animate-fade-in text-center">
      <div className="text-6xl animate-bounce">📅</div>
      <h2 className="font-retro text-3xl text-arcade-secondary">INVITE SENT!</h2>
      <p className="text-slate-400 max-w-xs">The meeting has been added to your calendar and {selectedCoworker?.name} has been notified.</p>
      
      <button 
        onClick={() => setAppState(AppState.DASHBOARD)}
        className="mt-8 px-8 py-3 bg-slate-800 border border-slate-600 text-white hover:bg-slate-700 font-retro"
      >
        RETURN TO DASHBOARD
      </button>
    </div>
  );

  const LoadingOverlay = () => (
    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="font-retro text-arcade-primary text-2xl animate-pulse">PROCESSING...</div>
    </div>
  );

  // --- Main Layout ---

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-arcade-primary selection:text-slate-900 flex items-center justify-center p-4">
      
      {/* Main Container CRT Effect */}
      <div className="w-full max-w-5xl aspect-video bg-slate-900 border-4 border-slate-800 rounded-lg shadow-2xl overflow-hidden relative flex">
         
         {/* LEFT SIDE: The Concierge */}
         <div className="w-1/3 bg-slate-900 border-r-4 border-slate-800 relative flex flex-col items-center justify-center p-8 z-20 transition-all duration-500">
            <div className="absolute top-4 left-4 font-retro text-xs text-slate-600">CMAC // SYS.24</div>
            <Concierge mood={conciergeMood} />
         </div>

         {/* RIGHT SIDE: Interactive UI */}
         <div className="flex-1 relative z-20 p-8 flex flex-col">
            {/* Header (Breadcrumb mostly) */}
            {appState !== AppState.LOGIN && appState !== AppState.DASHBOARD && (
              <div className="absolute top-6 right-8 text-xs font-mono text-slate-600">
                {appState === AppState.SELECT_COWORKER && "STEP 1/4: PARTICIPANT"}
                {appState === AppState.CONSTRAINTS && "STEP 2/4: CRITERIA"}
                {(appState === AppState.SUGGESTIONS || appState === AppState.LOADING_SLOTS) && "STEP 3/4: SELECTION"}
                {appState === AppState.CONFIRMATION && "STEP 4/4: REVIEW"}
              </div>
            )}

            {/* Dynamic Content */}
            <div className="flex-1 relative">
              {loading && <LoadingOverlay />}
              
              {appState === AppState.LOGIN && <LoginScreen />}
              {appState === AppState.DASHBOARD && <Dashboard />}
              {appState === AppState.SELECT_COWORKER && <CoworkerSelect />}
              {appState === AppState.CONSTRAINTS && <ConstraintForm />}
              {(appState === AppState.SUGGESTIONS || appState === AppState.LOADING_SLOTS) && <SuggestionList />}
              {appState === AppState.CONFIRMATION && <Confirmation />}
              {appState === AppState.SUCCESS && <SuccessScreen />}
            </div>
         </div>

         {/* Overlay Scanlines (Visual Flair) */}
         <div className="absolute inset-0 pointer-events-none z-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      </div>
    </div>
  );
}
