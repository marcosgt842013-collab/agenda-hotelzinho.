import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Baby, Calendar, Utensils, Clock, Droplets, Moon, Smile, Frown, Meh, 
  Save, LogOut, UserCircle, ClipboardList, Bath, Plus, Trash2, HeartPulse, 
  Sparkles, Apple, History, FileText, ChevronRight, AlertCircle, UserPlus, 
  X, MapPin, User, School, Users, Briefcase, ArrowLeft, BarChart2, Activity
} from 'lucide-react';

// --- Configuração Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCMYwOKtdhbQMKDkJh8UGpzFYwG3ZGLZYA",
  authDomain: "agenda-hotelzinho.firebaseapp.com",
  projectId: "agenda-hotelzinho",
  storageBucket: "agenda-hotelzinho.firebasestorage.app",
  messagingSenderId: "831201732536",
  appId: "1:831201732536:web:56adf531c9c4f336fdd14d",
  measurementId: "G-FDM0BQSBSP"
};

// Inicialização Segura
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Tenta iniciar analytics, mas não quebra se falhar (comum em ambientes restritos)
try { getAnalytics(app); } catch(e) { console.log("Analytics not supported in this env"); }

const appId = 'agenda-hotelzinho';

export default function App() {
  // --- ESTADOS GLOBAIS ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState({ role: null, schoolName: '', schoolId: '' });
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Dados e Listas
  const [childrenList, setChildrenList] = useState([
    { id: '1', name: 'João Miguel', parentEmail: 'joao@pai.com' },
    { id: '2', name: 'Maria Alice', parentEmail: 'maria@mae.com' },
    { id: '3', name: 'Pedro Henrique', parentEmail: 'pedro@pai.com' }
  ]);
  
  const [teachersList, setTeachersList] = useState([
    { id: 'admin', name: 'Marco', email: 'marcosgt842013@gmail.com' },
    { id: 't1', name: 'Tia Joana', email: 'joana@escola.com' }
  ]);
  
  const [currentChildId, setCurrentChildId] = useState('1'); 
  const [historyList, setHistoryList] = useState([]);

  // --- MODAIS ---
  const [showRegisterModal, setShowRegisterModal] = useState(false); 
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [viewingHistoryItem, setViewingHistoryItem] = useState(null); 
  const [showSummaryModal, setShowSummaryModal] = useState(false); 
  const [statsRange, setStatsRange] = useState(30); 
  
  // --- FORMS ---
  const [newChildData, setNewChildData] = useState({
    name: '', birthDate: '', parentName: '', parentEmail: '', 
    parentType: 'Mãe', parentPhone: '',
    address: { street: '', number: '', neighborhood: '', city: '' }
  });
  const [newTeacherData, setNewTeacherData] = useState({ name: '', email: '' });

  // --- RELATÓRIO DIÁRIO (ESTADO) ---
  const [reportData, setReportData] = useState({
    meals: [
      { id: 1, type: 'Lanche da Manhã', time: '09:00', status: '' },
      { id: 6, type: 'Lanche da Tarde', time: '15:00', status: '' },
      { id: 2, type: 'Fruta no dia', time: '10:00', status: '' },
      { id: 4, type: 'Almoço', time: '11:30', status: '' },
      { id: 5, type: 'Jantar', time: '16:00', status: '' },
      { id: 3, type: 'Mamadeira', time: '17:20', status: '' },
    ],
    extras: { fruitName: '', bath: false, water: false },
    observations: {
      diaperChange: 0, evacuation: false, evacuationCount: 0, 
      evacuationType: '', sleep: false, sleepCount: 0, 
      sleepTime: '', feltSick: false, feltSickDetails: '',
    },
    disposition: 'normal', 
    notes: '',
  });

  const isReadOnly = session.role === 'parent';
  const canEdit = session.role === 'teacher' || session.role === 'manager';

  // --- EFEITOS: MOCK DATA ---
  useEffect(() => {
    const generateMockHistory = () => {
      const list = [];
      const today = new Date();
      const mealTypes = ['Lanche da Manhã', 'Lanche da Tarde', 'Fruta no dia', 'Almoço', 'Jantar', 'Mamadeira'];
      const statuses = ['otimo', 'regular', 'recusou'];
      const dispositions = ['normal', 'quieto', 'agitado'];
      
      for (let i = 1; i <= 60; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const isSick = Math.random() > 0.9; 
        const disposition = dispositions[Math.floor(Math.random() * dispositions.length)];
        
        const dailyMeals = mealTypes.map((type, idx) => ({
            id: idx, type, time: '12:00',
            status: statuses[Math.floor(Math.random() * statuses.length)]
        }));
        const hasSleep = Math.random() > 0.2;
        const hasWater = Math.random() > 0.1;
        const hasEvacuation = Math.random() > 0.3;

        list.push({
          id: `mock_${i}`, date: dateStr, disposition: disposition, 
          feltSick: isSick, sickDetails: isSick ? 'Febre' : '',
          mealsSummary: 'Resumo automático', 
          sleepSummary: hasSleep ? 'Dormiu' : 'Não dormiu', 
          childName: 'João Miguel',
          fullData: { 
            meals: dailyMeals, 
            extras: { fruitName: 'Banana', bath: true, water: hasWater },
            observations: { 
              diaperChange: 3, evacuation: hasEvacuation, 
              evacuationCount: 1, evacuationType: 'normal', 
              sleep: hasSleep, sleepCount: 1, sleepTime: '13:00', 
              feltSick: isSick, feltSickDetails: isSick ? 'Febre' : '' 
            },
            disposition: disposition, notes: 'Dia tranquilo.'
          }
        });
      }
      setHistoryList(list);
    };
    generateMockHistory();
  }, []);

  // --- EFEITOS: AUTH ---
  useEffect(() => {
    const initAuth = async () => { 
        try { await signInAnonymously(auth); } catch(e) {} 
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { 
        setUser(u); setAuthLoading(false); 
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE LOGIN ---
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;
      const isTeacher = teachersList.some(t => t.email === loggedUser.email);
      
      if (isTeacher) simulateLogin('teacher');
      else simulateLogin('parent');
    } catch (error) { 
        console.error("Erro Google:", error); 
        alert("Erro ao autenticar. Verifique domínios autorizados no Firebase."); 
    }
  };

  const simulateLogin = (roleType) => {
    const schoolData = { name: 'Berçário Rayo de Sol', id: 'school_123' };
    let finalRole = roleType;
    // Lógica para forçar Gestor se for o seu email
    if (roleType === 'teacher' && user?.email === 'marcosgt842013@gmail.com') { 
        finalRole = 'manager'; 
    }
    setSession({ role: finalRole, schoolName: schoolData.name, schoolId: schoolData.id });
    setActiveTab('daily');
  };

  // --- FIRESTORE LISTENERS ---
  useEffect(() => {
    if (!user || !session.role) return;
    const currentChild = childrenList.find(c => c.id === currentChildId)?.name || 'Unknown';
    const docId = `${selectedDate}_${currentChild.replace(/\s+/g, '')}`;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
      const currentReport = reports.find(r => r.reportId === docId);
      if (currentReport) setReportData(currentReport.data); 
      else resetReportData();
    }, (error) => console.error("Erro dados:", error));

    return () => unsubscribe();
  }, [user, selectedDate, currentChildId, session.role, childrenList]);

  const resetReportData = () => {
     setReportData({
      meals: [
        { id: 1, type: 'Lanche da Manhã', time: '09:00', status: '' },
        { id: 6, type: 'Lanche da Tarde', time: '15:00', status: '' },
        { id: 2, type: 'Fruta no dia', time: '10:00', status: '' },
        { id: 4, type: 'Almoço', time: '11:30', status: '' },
        { id: 5, type: 'Jantar', time: '16:00', status: '' },
        { id: 3, type: 'Mamadeira', time: '17:20', status: '' },
      ],
      extras: { fruitName: '', bath: false, water: false },
      observations: {
        diaperChange: 0, evacuation: false, evacuationCount: 0, 
        evacuationType: '', sleep: false, sleepCount: 0, 
        sleepTime: '', feltSick: false, feltSickDetails: '',
      },
      disposition: 'normal', notes: '',
    });
  };

  const handleSave = async () => {
    if (!session.role && !user) return;
    setLoading(true);
    const currentChild = childrenList.find(c => c.id === currentChildId)?.name || 'Unknown';
    try {
      const docId = `${selectedDate}_${currentChild.replace(/\s+/g, '')}`;
      const authorEmail = user ? user.email : 'simulado';
      const authorRole = session.role || 'teacher';

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', docId), {
        reportId: docId, date: selectedDate, 
        childName: currentChild, schoolId: session.schoolId,
        data: reportData, updatedAt: serverTimestamp(), 
        updatedBy: authorEmail, updatedByRole: authorRole, 
        deviceInfo: navigator.userAgent
      });
      alert('Salvo com sucesso!');
    } catch (error) { alert('Erro ao salvar.'); } 
    finally { setLoading(false); }
  };

  // --- ACTIONS ---
  const handleRegisterChild = () => {
    if (!newChildData.name || !newChildData.parentEmail) { alert("Preencha os dados."); return; }
    const newId = Date.now().toString();
    const newChild = { id: newId, ...newChildData };
    setChildrenList([...childrenList, newChild]); setCurrentChildId(newId); setShowRegisterModal(false);
    alert(`Aluno cadastrado!`);
  };

  const handleRegisterTeacher = () => {
    if (!newTeacherData.name || !newTeacherData.email) return;
    const newT = { id: Date.now().toString(), ...newTeacherData };
    setTeachersList([...teachersList, newT]); setShowTeacherModal(false);
    alert(`Professor adicionado!`);
  };

  const handleDeleteTeacher = (id) => {
    if(window.confirm("Remover professor?")) { setTeachersList(teachersList.filter(t => t.id !== id)); }
  };

  // --- UPDATERS ---
  const updateAddress = (field, value) => { setNewChildData({...newChildData, address: {...newChildData.address, [field]: value}}); };
  const updateMeal = (id, field, value) => { 
    if (session.role === 'parent') return; 
    const newMeals = reportData.meals.map(meal => meal.id === id ? { ...meal, [field]: value } : meal); 
    setReportData({ ...reportData, meals: newMeals }); 
  };
  const addBottle = () => { 
    if (session.role === 'parent') return; 
    const newBottle = { id: Date.now(), type: 'Mamadeira', time: '', status: '' }; 
    setReportData({ ...reportData, meals: [...reportData.meals, newBottle] }); 
  };
  const removeMeal = (id) => { 
    if (session.role === 'parent') return; 
    setReportData({ ...reportData, meals: reportData.meals.filter(meal => meal.id !== id) }); 
  };
  const updateExtra = (field, value) => { if (session.role === 'parent') return; setReportData({ ...reportData, extras: { ...reportData.extras, [field]: value } }); };
  const updateObs = (field, value) => { if (session.role === 'parent') return; setReportData({ ...reportData, observations: { ...reportData.observations, [field]: value } }); };

  // --- SORTERS & STATS ---
  const getSortedMeals = (meals) => {
    const orderMap = { 'Lanche da Manhã': 1, 'Lanche da Tarde': 2, 'Fruta no dia': 3, 'Almoço': 4, 'Jantar': 5, 'Mamadeira': 6 };
    return [...meals].sort((a, b) => {
        const pA = orderMap[a.type] || 99, pB = orderMap[b.type] || 99;
        return pA !== pB ? pA - pB : a.id - b.id;
    });
  };

  const getDetailedStats = () => {
    const now = new Date();
    const limitDate = new Date();
    limitDate.setDate(now.getDate() - statsRange);
    const filtered = historyList.filter(item => new Date(item.date) >= limitDate);
    const total = filtered.length || 1;
    const stats = {
      totalDays: total, sickDays: 0, meals: {},
      booleanStats: { water: { sim: 0, nao: 0 }, sleep: { sim: 0, nao: 0 }, evacuation: { sim: 0, nao: 0 }, feltSick: { sim: 0, nao: 0 } },
      disposition: { normal: 0, quieto: 0, agitado: 0 }
    };
    ['Lanche da Manhã', 'Lanche da Tarde', 'Fruta no dia', 'Almoço', 'Jantar', 'Mamadeira'].forEach(type => {
      stats.meals[type] = { otimo: 0, regular: 0, recusou: 0, total: 0 };
    });
    filtered.forEach(day => {
      if (day.feltSick) stats.sickDays++;
      const full = day.fullData;
      if (!full) return;
      full.meals.forEach(m => {
        if (stats.meals[m.type] && m.status && stats.meals[m.type][m.status] !== undefined) {
          stats.meals[m.type][m.status]++;
          stats.meals[m.type].total++;
        }
      });
      const b = stats.booleanStats;
      b.water[full.extras.water ? 'sim' : 'nao']++;
      b.sleep[full.observations.sleep ? 'sim' : 'nao']++;
      b.evacuation[full.observations.evacuation ? 'sim' : 'nao']++;
      b.feltSick[full.observations.feltSick ? 'sim' : 'nao']++;
      if (full.disposition && stats.disposition[full.disposition] !== undefined) stats.disposition[full.disposition]++;
    });
    return stats;
  };

  const stats = getDetailedStats();

  // --- SUB-COMPONENTES VISUAIS ---
  const StatsBar = ({ label, value, total, color }) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <div className="flex flex-col w-full mb-1">
        <div className="flex justify-between text-[10px] text-gray-500"><span>{label}</span><span className="font-bold">{value} ({pct}%)</span></div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div></div>
      </div>
    );
  };

  const ReportRenderer = ({ data, readOnlyMode }) => {
    const rSortedMeals = getSortedMeals(data.meals);
    return (
      <div className="space-y-4">
        {/* Box Alimentação */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="bg-orange-50 px-4 py-2 border-b border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-2"><Utensils className="w-4 h-4 text-orange-500" /><h2 className="font-semibold text-gray-700 text-sm">Alimentação</h2></div>
          </div>
          <div className="divide-y divide-gray-100">
            {rSortedMeals.map((meal) => (
              <div key={meal.id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 text-sm">{meal.type}</span>
                    {!readOnlyMode && meal.type === 'Mamadeira' && data.meals.filter(m => m.type === 'Mamadeira').length > 1 && (
                      <button onClick={() => removeMeal(meal.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                    )}
                  </div>
                  <div className="relative">
                    <Clock className="w-3 h-3 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input type="time" disabled={readOnlyMode} value={meal.time} onChange={(e) => !readOnlyMode && updateMeal(meal.id, 'time', e.target.value)} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 pl-6 py-1 w-24 focus:ring-1 focus:ring-orange-500 outline-none" />
                  </div>
                </div>
                <div className="flex gap-1">
                  {[{ val: 'otimo', label: 'Ótimo', icon: Smile, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' }, { val: 'regular', label: 'Regular', icon: Meh, color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' }, { val: 'recusou', label: 'Recusou', icon: Frown, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' }].map((opt) => (
                    <button key={opt.val} disabled={readOnlyMode} onClick={() => !readOnlyMode && updateMeal(meal.id, 'status', opt.val)} className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${meal.status === opt.val ? `${opt.bg} ${opt.border} ring-1 ring-offset-1 ring-${opt.color.split('-')[1]}-400` : 'bg-white border-gray-100 opacity-60 hover:opacity-100'}`}><opt.icon className={`w-5 h-5 ${meal.status === opt.val ? opt.color : 'text-gray-400'}`} /><span className="text-[10px] text-gray-500 mt-1 font-medium">{opt.label}</span></button>
                  ))}
                </div>
                {meal.type === 'Fruta no dia' && (meal.status === 'otimo' || meal.status === 'regular') && (<div className="mt-2 animate-fadeIn"><div className="flex items-center gap-2 bg-orange-50 p-2 rounded-lg border border-orange-100"><Apple className="w-4 h-4 text-orange-500" /><input type="text" disabled={readOnlyMode} value={data.extras.fruitName} onChange={(e) => !readOnlyMode && updateExtra('fruitName', e.target.value)} placeholder="Quais frutas?" className="w-full text-xs bg-transparent outline-none text-gray-700 placeholder-orange-300" /></div></div>)}
              </div>
            ))}
          </div>
          {!readOnlyMode && (<div className="p-3 bg-gray-50 border-t border-gray-100"><button onClick={addBottle} className="w-full py-2 bg-white border border-dashed border-orange-300 text-orange-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors"><Plus className="w-4 h-4" />Adicionar Mamadeira</button></div>)}
        </div>

        {/* Box Higiene */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-500" /><h2 className="font-semibold text-gray-700 text-sm">Higiene / Sono</h2></div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2"><div className="flex items-center gap-2 mb-1"><Bath className="w-4 h-4 text-blue-400" /><span className="text-sm font-medium text-gray-700">Banho</span></div><div className="flex gap-1"><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateExtra('bath', true)} className={`flex-1 py-1 text-xs rounded-l-lg border border-r-0 transition-colors ${data.extras.bath ? 'bg-blue-500 text-white border-blue-600' : 'text-gray-400 border-gray-200'}`}>Sim</button><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateExtra('bath', false)} className={`flex-1 py-1 text-xs rounded-r-lg border border-l-0 transition-colors ${!data.extras.bath ? 'bg-gray-200 text-gray-600 border-gray-300' : 'text-gray-400 border-gray-200'}`}>Não</button></div></div>
              <div className="flex flex-col gap-2"><div className="flex items-center gap-2 mb-1"><Droplets className="w-4 h-4 text-blue-400" /><span className="text-sm font-medium text-gray-700">Água</span></div><div className="flex gap-1"><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateExtra('water', true)} className={`flex-1 py-1 text-xs rounded-l-lg border border-r-0 transition-colors ${data.extras.water ? 'bg-blue-500 text-white border-blue-600' : 'text-gray-400 border-gray-200'}`}>Sim</button><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateExtra('water', false)} className={`flex-1 py-1 text-xs rounded-r-lg border border-l-0 transition-colors ${!data.extras.water ? 'bg-gray-200 text-gray-600 border-gray-300' : 'text-gray-400 border-gray-200'}`}>Não</button></div></div>
            </div>
            <div className="pt-2 border-t border-gray-50">
              <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Moon className="w-4 h-4 text-indigo-400" /><span className="text-sm text-gray-600">Dormiu</span></div><div className="flex items-center gap-2"><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateObs('sleep', !data.observations.sleep)} className={`text-xs px-2 py-1 rounded transition-colors ${data.observations.sleep ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-gray-100 text-gray-500'}`}>{data.observations.sleep ? 'SIM' : 'NÃO'}</button></div></div>
              {data.observations.sleep && (<div className="flex items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg"><div className="flex flex-col gap-1"><span className="text-[10px] text-gray-500 uppercase tracking-wide">Vezes</span><div className="flex items-center gap-2"><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateObs('sleepCount', Math.max(0, data.observations.sleepCount - 1))} className="w-6 h-6 bg-white rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100">-</button><span className="text-sm font-medium w-4 text-center">{data.observations.sleepCount}</span><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateObs('sleepCount', data.observations.sleepCount + 1)} className="w-6 h-6 bg-white rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100">+</button></div></div><div className="flex flex-col gap-1 flex-1"><span className="text-[10px] text-gray-500 uppercase tracking-wide">Horário(s)</span><div className="relative"><input type="time" disabled={readOnlyMode} value={data.observations.sleepTime} onChange={(e) => !readOnlyMode && updateObs('sleepTime', e.target.value)} className="w-full text-sm p-1.5 border border-gray-200 rounded bg-white focus:border-indigo-500 outline-none" /></div></div></div>)}
            </div>
          </div>
        </div>

        {/* Box Situação */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="bg-purple-50 px-4 py-2 border-b border-purple-100 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-purple-500" /><h2 className="font-semibold text-gray-700 text-sm">Situação</h2></div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3"><span className="text-sm text-gray-600">Troca de Fralda</span><div className="flex items-center gap-3"><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateObs('diaperChange', Math.max(0, data.observations.diaperChange - 1))} className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold hover:bg-gray-200">-</button><span className="text-sm font-bold w-4 text-center">{data.observations.diaperChange}</span><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateObs('diaperChange', data.observations.diaperChange + 1)} className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold hover:bg-purple-200">+</button><span className="text-xs text-gray-400">vezes</span></div></div>
            <div className="border-b border-gray-50 pb-3">
              <div className="flex items-center justify-between mb-2"><span className="text-sm text-gray-600">Evacuação</span><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateObs('evacuation', !data.observations.evacuation)} className={`text-xs px-2 py-1 rounded transition-colors ${data.observations.evacuation ? 'bg-purple-100 text-purple-700 font-bold' : 'bg-gray-100 text-gray-500'}`}>{data.observations.evacuation ? 'SIM' : 'NÃO'}</button></div>
              {data.observations.evacuation && (<div className="bg-gray-50 p-3 rounded-lg space-y-3"><div className="flex items-center justify-between"><span className="text-xs text-gray-500 uppercase tracking-wide">Quantidade</span><div className="flex items-center gap-2"><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateObs('evacuationCount', Math.max(0, data.observations.evacuationCount - 1))} className="w-5 h-5 rounded bg-white border border-gray-200 flex items-center justify-center shadow-sm">-</button><span className="text-xs font-bold">{data.observations.evacuationCount}</span><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateObs('evacuationCount', data.observations.evacuationCount + 1)} className="w-5 h-5 rounded bg-white border border-gray-200 flex items-center justify-center shadow-sm">+</button></div></div><div className="flex gap-2">{['normal', 'constipacao', 'diarreia'].map((type) => (<button key={type} disabled={readOnlyMode} onClick={() => !readOnlyMode && updateObs('evacuationType', type)} className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded border transition-all ${data.observations.evacuationType === type ? 'bg-purple-500 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}>{type === 'constipacao' ? 'Constipação' : type === 'diarreia' ? 'Diarreia' : 'Normal'}</button>))}</div></div>)}
            </div>
            <div className="flex flex-col gap-2 border-b border-gray-50 pb-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><HeartPulse className="w-4 h-4 text-red-400" /><span className="text-sm text-gray-600">Sentiu-se mal</span></div><div className="flex items-center gap-2"><button disabled={readOnlyMode} onClick={() => !readOnlyMode && updateObs('feltSick', !data.observations.feltSick)} className={`text-xs px-2 py-1 rounded transition-colors ${data.observations.feltSick ? 'bg-red-100 text-red-700 font-bold' : 'bg-gray-100 text-gray-500'}`}>{data.observations.feltSick ? 'SIM' : 'NÃO'}</button></div></div>{data.observations.feltSick && (<div className="bg-red-50 p-2 rounded-lg"><textarea disabled={readOnlyMode} placeholder="Descreva o que houve..." value={data.observations.feltSickDetails} onChange={(e) => !readOnlyMode && updateObs('feltSickDetails', e.target.value)} className="w-full text-xs p-2 border border-red-200 rounded bg-white outline-none resize-none h-16" /></div>)}</div>
            <div><span className="text-sm text-gray-600 block mb-2">Disposição</span><div className="flex gap-2">{[{ id: 'normal', label: 'Normal', icon: '😊' }, { id: 'quieto', label: 'Quieto', icon: '🍃' }, { id: 'agitado', label: 'Agitado', icon: '⚡' }].map((disp) => (<button key={disp.id} disabled={readOnlyMode} onClick={() => !readOnlyMode && setReportData({ ...data, disposition: disp.id })} className={`flex-1 py-2 rounded-lg border text-xs transition-all flex flex-col items-center justify-center gap-1 ${data.disposition === disp.id ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}><span className="text-lg">{disp.icon}</span>{disp.label}</button>))}</div></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100"><div className="bg-gray-50 px-4 py-2 border-b border-gray-100"><h2 className="font-semibold text-gray-700 text-sm">Recados</h2></div><textarea disabled={readOnlyMode} value={data.notes} onChange={(e) => !readOnlyMode && setReportData({ ...data, notes: e.target.value })} placeholder="Escreva algum recado importante..." className="w-full p-4 text-sm text-gray-600 min-h-[100px] outline-none resize-none" /></div>
      </div>
    );
  };

  // --- RENDERIZAÇÃO ---
  if (authLoading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;

  if (!user && !session.role) {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="flex justify-center mb-4"><div className="bg-blue-100 p-4 rounded-full"><Baby className="w-12 h-12 text-blue-600" /></div></div>
          <h1 className="text-2xl font-bold text-gray-800">Agenda Hotelzinho</h1>
          <div className="space-y-3 pt-4 text-left">
            <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 shadow-sm hover:bg-gray-50 transition-colors">
               <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
               Entrar com Google
            </button>
            <div className="relative flex py-4 items-center"><div className="flex-grow border-t border-gray-200"></div><span className="mx-4 text-gray-400 text-xs">TESTE</span><div className="flex-grow border-t border-gray-200"></div></div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => simulateLogin('manager')} className="bg-purple-50 text-purple-700 font-bold py-3 px-4 rounded-xl flex flex-col items-center gap-1 text-xs hover:bg-purple-100 transition-colors"><Briefcase className="w-5 h-5" /> Gestor</button>
              <button onClick={() => simulateLogin('teacher')} className="bg-blue-50 text-blue-700 font-bold py-3 px-4 rounded-xl flex flex-col items-center gap-1 text-xs hover:bg-blue-100 transition-colors"><ClipboardList className="w-5 h-5" /> Professor</button>
              <button onClick={() => simulateLogin('parent')} className="col-span-2 bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs hover:bg-gray-100 transition-colors border border-gray-200"><UserCircle className="w-5 h-5" /> Responsável</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative">
      {/* Modal Stats */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-0 shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-blue-600" /> Estatísticas ({statsRange} dias)</h3><button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button></div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex justify-center bg-gray-50 p-1 rounded-lg mb-4">{[7, 15, 30, 60].map(d => <button key={d} onClick={() => setStatsRange(d)} className={`flex-1 py-1 text-xs rounded-md font-semibold transition-colors ${statsRange === d ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>{d}d</button>)}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-xl text-center"><div className="text-2xl font-bold text-blue-600">{stats.totalDays}</div><div className="text-[10px] uppercase font-bold text-blue-400">Dias</div></div>
                <div className={`p-3 rounded-xl text-center ${stats.sickDays > 0 ? 'bg-red-50' : 'bg-green-50'}`}><div className={`text-2xl font-bold ${stats.sickDays > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.sickDays}</div><div className={`text-[10px] uppercase font-bold ${stats.sickDays > 0 ? 'text-red-400' : 'text-green-400'}`}>Saúde</div></div>
              </div>
              <div><h4 className="text-xs font-bold mb-2">Alimentação</h4>{Object.entries(stats.meals).map(([k, v]) => <div key={k} className="bg-gray-50 p-2 rounded mb-1"><div className="text-xs font-bold mb-1">{k}</div><StatsBar label="Ótimo" value={v.otimo} total={v.total} color="bg-green-500"/><StatsBar label="Recusou" value={v.recusou} total={v.total} color="bg-red-500"/></div>)}</div>
              <div><h4 className="text-xs font-bold mb-2 mt-4">Rotina</h4><div className="grid grid-cols-2 gap-2">{Object.entries(stats.booleanStats).map(([k,v]) => <div key={k} className="bg-gray-50 p-2 rounded"><div className="text-xs font-bold mb-1 capitalize">{k}</div><StatsBar label="Sim" value={v.sim} total={v.sim+v.nao} color="bg-blue-500"/></div>)}</div></div>
              <div><h4 className="text-xs font-bold mb-2 mt-4">Disposição</h4><div className="bg-gray-50 p-3 rounded space-y-2"><StatsBar label="Normal" value={stats.disposition.normal} total={stats.totalDays} color="bg-green-500"/><StatsBar label="Agitado" value={stats.disposition.agitado} total={stats.totalDays} color="bg-yellow-500"/></div></div>
            </div>
            <div className="p-5 border-t"><button onClick={() => setShowSummaryModal(false)} className="w-full bg-gray-800 text-white py-3 rounded">Fechar</button></div>
          </div>
        </div>
      )}

      {/* Cadastro Aluno */}
      {showRegisterModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-6"><h3 className="font-bold mb-4">Novo Aluno</h3><input className="w-full border p-2 mb-2 rounded" placeholder="Nome" value={newChildData.name} onChange={e=>setNewChildData({...newChildData, name:e.target.value})}/><input className="w-full border p-2 mb-2 rounded" placeholder="Email Pai" value={newChildData.parentEmail} onChange={e=>setNewChildData({...newChildData, parentEmail:e.target.value})}/><button onClick={handleRegisterChild} className="w-full bg-blue-600 text-white py-2 rounded">Salvar</button><button onClick={() => setShowRegisterModal(false)} className="w-full mt-2 text-gray-500">Cancelar</button></div></div>}

      {/* Cadastro Professor */}
      {showTeacherModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-6"><h3 className="font-bold mb-4">Novo Professor</h3><input className="w-full border p-2 mb-2 rounded" placeholder="Nome" value={newTeacherData.name} onChange={e=>setNewTeacherData({...newTeacherData, name:e.target.value})}/><input className="w-full border p-2 mb-2 rounded" placeholder="Email Google" value={newTeacherData.email} onChange={e=>setNewTeacherData({...newTeacherData, email:e.target.value})}/><button onClick={handleRegisterTeacher} className="w-full bg-purple-600 text-white py-2 rounded">Salvar</button><button onClick={() => setShowTeacherModal(false)} className="w-full mt-2 text-gray-500">Cancelar</button></div></div>}

      {/* Detalhe Histórico */}
      {viewingHistoryItem && <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col animate-slideUp"><div className="px-4 py-3 border-b bg-white flex gap-3 items-center"><button onClick={() => setViewingHistoryItem(null)}><ArrowLeft className="w-6 h-6"/></button><h2 className="font-bold">Detalhes {viewingHistoryItem.date}</h2></div><div className="flex-1 p-4 overflow-y-auto"><ReportRenderer data={viewingHistoryItem.fullData} readOnlyMode={true}/></div></div>}

      <header className="bg-white shadow-sm sticky top-0 z-10 p-4">
        <div className="flex justify-between items-center mb-3"><div className="flex gap-2 items-center font-bold"><School className="w-5 h-5"/> {session.schoolName}</div><button onClick={() => setSession({role: null})}><LogOut className="w-5 h-5"/></button></div>
        {activeTab !== 'team' && (
          <div className="flex gap-2">
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border rounded p-1" />
            <select value={currentChildId} onChange={e => setCurrentChildId(e.target.value)} className="border rounded p-1 flex-1">{childrenList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            {canEdit && <button onClick={() => setShowRegisterModal(true)} className="bg-blue-600 text-white p-1 rounded"><Plus className="w-4 h-4"/></button>}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {activeTab === 'daily' && <div><ReportRenderer data={reportData} readOnlyMode={!canEdit} />{canEdit && <button onClick={handleSave} disabled={loading} className="w-full bg-green-600 text-white py-3 rounded mt-4">Salvar Diário</button>}</div>}
        {activeTab === 'history' && (
          <div>
            <div className="flex justify-between mb-4"><h2 className="font-bold text-lg">Histórico</h2><button onClick={() => setShowSummaryModal(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Resumo</button></div>
            {historyList.map(item => (
              <div key={item.id} className="bg-white p-4 rounded shadow mb-2 flex justify-between items-center">
                <div><div className="font-bold">{item.date}</div><div className="text-xs text-gray-500">{item.mealsSummary}</div></div>
                <button onClick={() => setViewingHistoryItem(item)} className="text-blue-500 text-xs">Ver</button>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'team' && session.role === 'manager' && (
          <div>
            <div className="flex justify-between mb-4"><h2 className="font-bold">Equipe</h2><button onClick={() => setShowTeacherModal(true)} className="bg-purple-600 text-white px-2 py-1 rounded text-xs">Add</button></div>
            {teachersList.map(t => (
              <div key={t.id} className="bg-white p-3 rounded shadow mb-2 flex justify-between"><div>{t.name}<br/><span className="text-xs text-gray-500">{t.email}</span></div><button onClick={() => handleDeleteTeacher(t.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button></div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 w-full bg-white border-t flex justify-around p-3">
        <button onClick={() => setActiveTab('daily')}><FileText className={activeTab==='daily'?'text-blue-600':'text-gray-400'}/></button>
        <button onClick={() => setActiveTab('history')}><History className={activeTab==='history'?'text-blue-600':'text-gray-400'}/></button>
        {session.role === 'manager' && <button onClick={() => setActiveTab('team')}><Users className={activeTab==='team'?'text-purple-600':'text-gray-400'}/></button>}
      </div>
    </div>
  );
}
