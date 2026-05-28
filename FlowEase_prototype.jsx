import { useState, useRef, useEffect } from "react";

/* ── Tokens ─────────────────────────────────────────────────── */
const T={light:{appBg:"#F8F7F4",cardBg:"#FFF",navBg:"#FFF",headerBg:"#FFF",border:"#E8E6DE",borderSub:"#F1EFE8",text1:"#2C2C2A",text2:"#5F5E5A",text3:"#888780",text4:"#B4B2A9",chip:"#F1EFE8",chipBorder:"#D3D1C7",surfaceVar:"#F1EFE8",inputBg:"#FFF"},dark:{appBg:"#141412",cardBg:"#1E1D1A",navBg:"#1A1917",headerBg:"#1A1917",border:"#2E2D28",borderSub:"#252420",text1:"#F0EFE8",text2:"#B8B6AE",text3:"#7A7872",text4:"#4E4D48",chip:"#252420",chipBorder:"#36352E",surfaceVar:"#252420",inputBg:"#1E1D1A"}};
const C={teal:"#0F6E56",coral:"#D85A30",amber:"#BA7517",blue:"#378ADD"};
const FD={low:{bg:"#E1F5EE",b:"#5DCAA5",t:"#085041",dot:"#1D9E75",dBg:"#0D2B1E",dB:"#1D6B48",dT:"#5DCAA5"},medium:{bg:"#FAEEDA",b:"#FAC775",t:"#854F0B",dot:"#EF9F27",dBg:"#271A04",dB:"#7A5010",dT:"#FAC775"},high:{bg:"#FAECE7",b:"#F0997B",t:"#993C1D",dot:"#D85A30",dBg:"#2B1108",dB:"#7A2E14",dT:"#F0997B"},unknown:{bg:"#F1EFE8",b:"#D3D1C7",t:"#5F5E5A",dot:"#B4B2A9",dBg:"#252420",dB:"#36352E",dT:"#7A7872"}};
const fd=(lv,m)=>{const f=FD[lv]||FD.unknown;return m==="dark"?{bg:f.dBg,border:f.dB,text:f.dT,dot:f.dot}:{bg:f.bg,border:f.b,text:f.t,dot:f.dot};};
const sc=v=>v===0?"#D3D1C7":v<=3?FD.low.dot:v<=6?FD.medium.dot:FD.high.dot;

/* ── Shared atoms ───────────────────────────────────────────── */
const s=m=>T[m];
function Fr({children,mode}){const t=s(mode);return <div style={{width:390,minHeight:720,background:t.appBg,borderRadius:16,overflow:"hidden",border:`0.5px solid ${t.border}`,display:"flex",flexDirection:"column",position:"relative",fontFamily:"'DM Sans',system-ui,sans-serif",boxShadow:"0 8px 40px rgba(0,0,0,.18)"}}>{children}</div>;}
function Hdr({mode,title,sub,left,right}){const t=s(mode);return <div style={{background:t.headerBg,borderBottom:`0.5px solid ${t.border}`,padding:sub?"12px 16px 8px":"14px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>{left&&<div style={{flexShrink:0}}>{left}</div>}<div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:t.text1,lineHeight:1}}>{title}</div>{sub&&<div style={{fontSize:11,color:t.text3,marginTop:3}}>{sub}</div>}</div>{right&&<div style={{flexShrink:0}}>{right}</div>}</div>;}
function IBtn({icon,label,onClick,mode}){return <button onClick={onClick} aria-label={label} style={{width:40,height:40,borderRadius:20,background:"none",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:20,color:s(mode).text3}}>{icon}</button>;}
function Chip({name,level,mode,onRemove,sm}){const f=fd(level,mode);return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:sm?"3px 8px":"5px 11px",borderRadius:20,fontSize:sm?11:12,fontWeight:500,background:f.bg,border:`0.5px solid ${f.border}`,color:f.text}}><span style={{width:7,height:7,borderRadius:"50%",background:f.dot,display:"inline-block",flexShrink:0}}/>{name}{onRemove&&<button onClick={onRemove} style={{background:"none",border:"none",cursor:"pointer",color:f.text,fontSize:14,padding:0,lineHeight:1,opacity:.6,marginLeft:2}}>×</button>}</span>;}
function Crd({mode,children,style={}}){return <div style={{background:s(mode).cardBg,border:`0.5px solid ${s(mode).border}`,borderRadius:14,overflow:"hidden",...style}}>{children}</div>;}
function Sec({mode,children}){return <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".8px",color:s(mode).text4,marginBottom:8}}>{children}</div>;}
function PBtn({mode,onClick,children,color=C.teal,disabled}){return <button onClick={disabled?undefined:onClick} style={{width:"100%",padding:"14px",borderRadius:12,background:disabled?s(mode).chipBorder:color,color:"white",border:"none",fontSize:15,fontWeight:700,cursor:disabled?"default":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{children}</button>;}
function Nav({mode,active,go}){const t=s(mode);const it=[{k:"journal",i:"📓",l:"Journal"},{k:"analyse",i:"📊",l:"Analyse"},{k:"rapport",i:"📄",l:"Rapport"},{k:"coach",i:"💬",l:"Coach"},{k:"settings",i:"⚙️",l:"Paramètres"}];return <div style={{position:"absolute",bottom:0,left:0,right:0,background:t.navBg,borderTop:`0.5px solid ${t.border}`,display:"flex",padding:"8px 0 16px",zIndex:20}}>{it.map(x=><button key={x.k} onClick={()=>go(x.k)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",padding:"4px 0"}}><span style={{fontSize:20}}>{x.i}</span><span style={{fontSize:10,fontWeight:active===x.k?600:400,color:active===x.k?C.teal:t.text3}}>{x.l}</span>{active===x.k&&<div style={{width:4,height:4,borderRadius:2,background:C.teal,marginTop:-2}}/>}</button>)}</div>;}
function Sheet({mode,children,onClose}){const t=s(mode);return <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"flex-end",zIndex:50}} onClick={onClose}><div style={{width:"100%",background:t.cardBg,borderRadius:"16px 16px 0 0",border:`0.5px solid ${t.border}`,paddingBottom:8}} onClick={e=>e.stopPropagation()}><div style={{width:32,height:4,borderRadius:2,background:t.chipBorder,margin:"12px auto 16px"}}/>{children}</div></div>;}
function FodPill({mode}){return <div style={{display:"flex",gap:12,alignItems:"center",margin:"4px 0"}}>{[["low","Faible"],["medium","Moyen"],["high","Élevé"]].map(([k,l])=><div key={k} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:4,background:FD[k].dot}}/><span style={{fontSize:11,color:s(mode).text3}}>{l}</span></div>)}</div>;}

/* ── Data ───────────────────────────────────────────────────── */
const MEALS_J=[{type:"Petit-déjeuner",time:"07:45",items:[{n:"Flocons d'avoine",f:"medium"},{n:"Banane",f:"high"},{n:"Lait d'amande",f:"low"}]},{type:"Déjeuner",time:"12:30",items:[{n:"Riz basmati",f:"low"},{n:"Poulet grillé",f:"low"},{n:"Courgette",f:"low"},{n:"Oignon",f:"high"}]}];
const SYM=[{k:"bloating",l:"Ballonnements",cat:"digestif",e:"🫧"},{k:"pain",l:"Douleurs abdominales",cat:"digestif",e:"🫀"},{k:"nausea",l:"Nausées",cat:"digestif",e:"🤢"},{k:"reflux",l:"Reflux",cat:"digestif",e:"🔥"},{k:"transit",l:"Transit",cat:"digestif",e:"⚡",bristol:true},{k:"fatigue",l:"Fatigue",cat:"systémique",e:"🪫"},{k:"fog",l:"Brouillard mental",cat:"systémique",e:"🌫️"},{k:"anxiety",l:"Anxiété",cat:"systémique",e:"😰"},{k:"energy",l:"Énergie",cat:"bien-être",e:"⚡"},{k:"sleep",l:"Sommeil",cat:"bien-être",e:"😴"},{k:"mood",l:"Humeur",cat:"bien-être",e:"😊"}];
const AI_SC={bloating:7,pain:4,nausea:2,reflux:0,transit:3,fatigue:5,fog:3,anxiety:1,energy:6,sleep:5,mood:7};
const AI_CHIPS=[{name:"Riz basmati",fodmap:"low"},{name:"Poulet grillé",fodmap:"low"},{name:"Courgette",fodmap:"low"},{name:"Oignon",fodmap:"high"},{name:"Huile d'olive",fodmap:"low"}];
const INSIGHTS=[{type:"alert",title:"Ballonnements post-prandials",desc:"3× plus élevés dans les 2h après les repas avec oignon ou blé.",conf:.87},{type:"correlation",title:"Corrélation oignon → douleurs (0.82)",desc:"11 occurrences sur 14 suivies de douleurs dans 90 min.",conf:.82},{type:"pattern",title:"Fatigue systématique le lundi",desc:"Fatigue à 7.2/10 le lundi vs 4.1/10 les autres jours.",conf:.71},{type:"recommendation",title:"Low-FODMAP strict 2 semaines",desc:"Votre profil est cohérent avec une sensibilité FODMAP élevée.",conf:.68}];
const CTX=[{key:"today",icon:"📅",l:"Aujourd'hui",d:"Données de la journée",est:"~500 tokens"},{key:"7d",icon:"📆",l:"7 derniers jours",d:"Tendances sur une semaine",est:"~2 000 tokens"},{key:"14d",icon:"🗓️",l:"14 derniers jours",d:"Analyse bi-hebdomadaire",est:"~4 000 tokens"},{key:"30d",icon:"📅",l:"30 derniers jours",d:"Vue mensuelle complète",est:"~8 000 tokens"},{key:"profile_only",icon:"👤",l:"Profil uniquement",d:"Sans données de santé",est:"~200 tokens"}];
const TREATS=[{id:"1",name:"Rifaximin 550mg",dose:"550mg",freq:"2×/j"},{id:"2",name:"Prokinétique 10mg",dose:"10mg",freq:"3×/j"},{id:"3",name:"Probiotiques",dose:"2 gél.",freq:"1×/j"},{id:"4",name:"Vit. D3",dose:"1000UI",freq:"1×/j"}];
const SET_IT=[{i:"👤",l:"Mon profil",d:"Conditions médicales, protocole"},{i:"🔑",l:"Clé API Claude",d:"Accès aux fonctions IA"},{i:"💊",l:"Traitements",d:"Médicaments et rappels"},{i:"🫀",l:"Symptômes",d:"Personnaliser le suivi"},{i:"🤖",l:"Préférences Coach",d:"Mode et contexte IA"},{i:"🛡️",l:"Données & confidentialité",d:"Export, import, suppression"},{i:"ℹ️",l:"À propos",d:"Version 1.0.0 · GitHub"}];
const BRISTOL_DATA=[
  {t:1,l:"Séparées",c:"#D85A30",bg:"#FAECE7",br:"#F0997B"},
  {t:2,l:"Bosselées",c:"#D85A30",bg:"#FAECE7",br:"#F0997B"},
  {t:3,l:"Craquelées",c:"#BA7517",bg:"#FAEEDA",br:"#FAC775"},
  {t:4,l:"Lisse & souple",c:"#1D9E75",bg:"#E1F5EE",br:"#5DCAA5"},
  {t:5,l:"Bords nets",c:"#EF9F27",bg:"#FAEEDA",br:"#FAC775"},
  {t:6,l:"Floconneuse",c:"#D85A30",bg:"#FAECE7",br:"#F0997B"},
  {t:7,l:"Liquide",c:"#993C1D",bg:"#FAECE7",br:"#F0997B"},
];
function BristolSvg({t}){
  const svgs={
    1: () => (<svg width="44" height="28" viewBox="0 0 44 28"><circle cx="8" cy="14" r="6" fill="#D85A30" opacity=".85"/><circle cx="22" cy="14" r="6" fill="#D85A30" opacity=".85"/><circle cx="36" cy="14" r="6" fill="#D85A30" opacity=".85"/></svg>),
    2: () => (<svg width="44" height="28" viewBox="0 0 44 28"><ellipse cx="22" cy="14" rx="19" ry="8" fill="#D85A30" opacity=".8"/><circle cx="9" cy="11" r="5" fill="#BA4A1E" opacity=".4"/><circle cx="22" cy="9" r="5" fill="#BA4A1E" opacity=".4"/><circle cx="36" cy="11" r="5" fill="#BA4A1E" opacity=".4"/></svg>),
    3: () => (<svg width="44" height="28" viewBox="0 0 44 28"><ellipse cx="22" cy="14" rx="19" ry="8" fill="#BA7517" opacity=".85"/><line x1="11" y1="10" x2="13" y2="18" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/><line x1="22" y1="9" x2="24" y2="19" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/><line x1="33" y1="10" x2="35" y2="18" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>),
    4: () => (<svg width="44" height="28" viewBox="0 0 44 28"><ellipse cx="22" cy="14" rx="19" ry="8" fill="#1D9E75" opacity=".85"/><ellipse cx="22" cy="14" rx="12" ry="4" fill="#17835F" opacity=".3"/></svg>),
    5: () => (<svg width="44" height="28" viewBox="0 0 44 28"><rect x="3" y="10" width="11" height="9" rx="3" fill="#EF9F27" opacity=".85"/><rect x="17" y="10" width="11" height="9" rx="3" fill="#EF9F27" opacity=".85"/><rect x="31" y="10" width="11" height="9" rx="3" fill="#EF9F27" opacity=".85"/></svg>),
    6: () => (<svg width="44" height="28" viewBox="0 0 44 28"><ellipse cx="22" cy="14" rx="19" ry="8" fill="#D85A30" opacity=".6"/><ellipse cx="9" cy="13" rx="7" ry="5" fill="#D85A30" opacity=".85"/><ellipse cx="22" cy="11" rx="8" ry="6" fill="#D85A30" opacity=".85"/><ellipse cx="35" cy="13" rx="7" ry="5" fill="#D85A30" opacity=".85"/></svg>),
    7: () => (<svg width="44" height="28" viewBox="0 0 44 28"><path d="M3 16 Q11 8 22 15 Q33 22 41 13" stroke="#993C1D" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".85"/></svg>),
  };
  const fn=svgs[t];
  return fn ? fn() : null;
}
const SYM_OPTS=[{k:"abdominal_pain",l:"Douleurs"},{k:"bloating",l:"Ballonnements"},{k:"nausea",l:"Nausées"},{k:"fatigue",l:"Fatigue"},{k:"brain_fog",l:"Brouillard"},{k:"transit",l:"Transit"}];

function genT(d,k){const seed=k.charCodeAt(0);let v=4+(seed%3);const p=[];for(let i=0;i<d;i++){if(Math.random()>.15){v=Math.max(0,Math.min(10,v+(Math.random()-.48)*2));p.push({d:i,v:Math.round(v*10)/10,ok:true});}else p.push({d:i,v:null,ok:false});}return p;}
function genW(d){let v=6;const p=[];for(let i=0;i<d;i++){if(Math.random()>.2){v=Math.max(1,Math.min(10,v+(Math.random()-.45)*1.5));p.push({d:i,v:Math.round(v*10)/10});}else p.push({d:i,v:null});}return p;}

/* ════════════════════════════════════════════════════════════
   JOURNAL HOME
════════════════════════════════════════════════════════════ */
function JournalHome({mode,go,goSub}){
  const t=s(mode);const [wb,setWb]=useState(null);const [showWb,setShowWb]=useState(false);

  const QC=({icon,label,btns,extra})=>(
    <div style={{background:t.cardBg,border:`0.5px solid ${mode==="light"?"#B0AEA5":t.chipBorder}`,borderRadius:14,padding:"11px 12px",display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:16}}>{icon}</span>
        <span style={{fontSize:13,fontWeight:600,color:t.text1}}>{label}</span>
      </div>
      <div style={{display:"flex",gap:6}}>
        {btns.map((b,i)=>(
          <button key={i} onClick={b.fn} style={{flex:1,padding:"6px 4px",borderRadius:20,background:t.surfaceVar,border:`0.5px solid ${t.chipBorder}`,color:t.text2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
            <span>{b.icon}</span><span>{b.label}</span>
          </button>
        ))}
      </div>
      {extra}
    </div>
  );

  return (
    <Fr mode={mode}>
      <div style={{background:t.headerBg,borderBottom:`0.5px solid ${t.border}`,padding:"14px 16px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.text3}}>‹</button>
        <span style={{fontSize:15,fontWeight:600,color:t.text1}}>Lundi 25 mai</span>
        <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:t.text3}}>›</button>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
        <div style={{padding:"14px 16px 12px"}}><Sec mode={mode}>Saisie rapide</Sec>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <QC icon="🍽️" label="Repas"
              btns={[
                {icon:"🎤",label:"Vocal",  fn:()=>goSub("meal","voice")},
                {icon:"📷",label:"Photo",  fn:()=>goSub("meal","photo")},
              ]}
              extra={<button onClick={()=>goSub("meal","text")} style={{padding:"4px 0",borderRadius:20,background:"transparent",border:`0.5px solid ${t.chipBorder}`,color:t.text3,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>＋ Saisir manuellement</button>}
            />
            <QC icon="🫀" label="Symptômes"
              btns={[
                {icon:"🎤",label:"Vocal",  fn:()=>goSub("symptom","voice")},
                {icon:"✏️",label:"Saisir", fn:()=>goSub("symptom","form")},
              ]}
            />
            <QC icon="💊" label="Médicaments"
              btns={[
                {icon:"🎤",label:"Vocal",   fn:()=>{}},
                {icon:"✓", label:"Valider", fn:()=>go("intake")},
              ]}
            />
            <QC icon="📝" label="Note"
              btns={[
                {icon:"🎤",label:"Vocal",  fn:()=>{}},
                {icon:"✏️",label:"Texte",  fn:()=>go("note")},
              ]}
            />
          </div>
        </div>
        <div style={{margin:"0 16px 14px"}}>
          {!showWb
            ?<div style={{background:t.cardBg,border:`0.5px solid ${mode==="light"?"#B0AEA5":t.chipBorder}`,borderRadius:14,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div><div style={{fontSize:12,fontWeight:600,color:t.text1}}>Bien-être global du jour</div><div style={{fontSize:11,color:t.text3,marginTop:2}}>Comment vous sentez-vous ?</div></div>
              <button onClick={()=>setShowWb(true)} style={{padding:"6px 14px",borderRadius:20,background:C.teal,color:"white",border:"none",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Saisir</button>
            </div>
            :<div style={{background:t.cardBg,border:`0.5px solid ${mode==="light"?"#B0AEA5":t.chipBorder}`,borderRadius:14,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:600,color:t.text1,marginBottom:10}}>Comment vous sentez-vous ?</div>
              <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
                {[1,2,3,4,5,6,7,8,9,10].map(n=><button key={n} onClick={()=>{setWb(n);setShowWb(false);}} style={{width:34,height:34,borderRadius:17,background:wb===n?C.teal:t.chip,color:wb===n?"white":t.text2,border:`0.5px solid ${wb===n?C.teal:t.chipBorder}`,fontSize:13,fontWeight:600,cursor:"pointer"}}>{n}</button>)}
              </div>
            </div>
          }
          {wb&&!showWb&&<div style={{background:t.cardBg,border:`0.5px solid ${mode==="light"?"#B0AEA5":t.chipBorder}`,borderRadius:14,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8}}>
            <div><div style={{fontSize:12,fontWeight:600,color:t.text1}}>Bien-être global du jour</div><div style={{fontSize:11,color:t.text3}}>Saisi à 15:56</div></div>
            <div style={{display:"flex",alignItems:"baseline",gap:4}}><span style={{fontSize:28,fontWeight:700,color:C.teal}}>{wb}</span><span style={{fontSize:12,color:t.text3}}>/10</span></div>
          </div>}
        </div>
        <div style={{padding:"0 16px 12px"}}><Sec mode={mode}>Repas</Sec>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {MEALS_J.map((meal,mi)=>{
              const hasH=meal.items.some(i=>i.f==="high");
              return <Crd key={mi} mode={mode}><div style={{padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`0.5px solid ${t.borderSub}`}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:6,height:6,borderRadius:3,background:hasH?FD.high.dot:FD.low.dot}}/><span style={{fontSize:13,fontWeight:600,color:t.text1}}>{meal.type}</span>{hasH&&<span style={{fontSize:12}}>⚠️</span>}</div><span style={{fontSize:11,color:t.text4}}>{meal.time}</span></div><div style={{padding:"8px 14px",display:"flex",flexWrap:"wrap",gap:5}}>{meal.items.map((it,j)=><Chip key={j} name={it.n} level={it.f} mode={mode} sm/>)}</div></Crd>;
            })}
          </div>
        </div>
        <div style={{padding:"0 16px 12px"}}><Sec mode={mode}>Symptômes</Sec><div style={{background:t.surfaceVar,border:`0.5px dashed ${t.chipBorder}`,borderRadius:14,padding:"18px 16px",textAlign:"center"}}><div style={{fontSize:22,marginBottom:4}}>🫀</div><div style={{fontSize:13,color:t.text3}}>Aucun symptôme saisi</div></div></div>
      </div>
      <Nav mode={mode} active="journal" go={k=>k!=="journal"&&go(k)}/>
    </Fr>
  );
}


function MealEntry({mode,srcMode,onBack}){
  const t=s(mode);
  const [phase,setPhase]=useState(srcMode==="text"?"form":"processing");
  const [step,setStep]=useState(0);
  const [chips,setChips]=useState(AI_CHIPS);
  const [mChips,setMChips]=useState([]);
  const [input,setInput]=useState("");
  const [mInput,setMInput]=useState("");
  const [mealType,setMealType]=useState("Déjeuner");
  const [done,setDone]=useState(false);

  useEffect(()=>{
    if(phase!=="processing")return;
    const t1=setTimeout(()=>setStep(1),1800);
    const t2=setTimeout(()=>{setStep(2);setTimeout(()=>setPhase("validation"),400);},3200);
    return()=>{clearTimeout(t1);clearTimeout(t2);};
  },[phase]);

  const addChip=()=>{if(input.trim()){setChips(c=>[...c,{name:input.trim(),fodmap:"unknown"}]);setInput("");}};
  const addM=()=>{if(mInput.trim()){setMChips(c=>[...c,{name:mInput.trim(),fodmap:"unknown"}]);setMInput("");}};

  const TypeSel=()=><select value={mealType} onChange={e=>setMealType(e.target.value)} style={{fontSize:12,fontWeight:600,color:C.teal,background:fd("low",mode).bg,border:`0.5px solid ${fd("low",mode).border}`,borderRadius:8,padding:"4px 8px",cursor:"pointer",fontFamily:"inherit"}}>{["Petit-déjeuner","Déjeuner","Dîner","Collation"].map(x=><option key={x}>{x}</option>)}</select>;

  if(done)return <Fr mode={mode}><div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:32}}><div style={{width:72,height:72,borderRadius:36,background:fd("low",mode).bg,border:`2px solid ${fd("low",mode).border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34}}>✅</div><div style={{fontSize:18,fontWeight:700,color:t.text1}}>Repas enregistré !</div><div style={{fontSize:13,color:t.text3}}>{chips.length||mChips.length} aliments · {mealType}</div><button onClick={onBack} style={{marginTop:8,padding:"12px 32px",borderRadius:12,background:C.teal,color:"white",border:"none",fontSize:14,fontWeight:600,cursor:"pointer"}}>← Retour au journal</button></div></Fr>;

  if(phase==="processing")return(
    <Fr mode={mode}>
      <Hdr mode={mode} title="Saisir un repas" left={<IBtn icon="←" label="Retour" onClick={onBack} mode={mode}/>}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,padding:32}}>
        <div style={{width:80,height:80,borderRadius:40,background:step===0?fd("low",mode).bg:fd("medium",mode).bg,border:`2px solid ${step===0?fd("low",mode).border:fd("medium",mode).border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,transition:"all .4s"}}>{step===0?(srcMode==="photo"?"📷":"🎤"):"✨"}</div>
        <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:t.text1,marginBottom:6}}>{step===0?(srcMode==="photo"?"Traitement de la photo…":"Enregistrement vocal…"):"Analyse IA en cours…"}</div>{step===0&&<div style={{fontSize:13,color:t.text3,fontStyle:"italic"}}>« riz basmati, poulet grillé et courgettes »</div>}</div>
        <div style={{display:"flex",gap:8}}>{[0,1,2].map(i=><div key={i} style={{width:i===step?20:8,height:8,borderRadius:4,background:i<=step?C.teal:t.chipBorder,transition:"all .3s"}}/>)}</div>
        <div style={{display:"flex",gap:8}}><button onClick={()=>setPhase("empty")} style={{fontSize:10,padding:"4px 8px",borderRadius:8,background:t.surfaceVar,border:`0.5px solid ${t.chipBorder}`,color:t.text4,cursor:"pointer",fontFamily:"inherit"}}>⚠️ Non reconnu</button><button onClick={()=>setPhase("network")} style={{fontSize:10,padding:"4px 8px",borderRadius:8,background:t.surfaceVar,border:`0.5px solid ${t.chipBorder}`,color:t.text4,cursor:"pointer",fontFamily:"inherit"}}>📶 Réseau</button></div>
      </div>
    </Fr>
  );

  if(phase==="empty")return(
    <Fr mode={mode}><Hdr mode={mode} title={srcMode==="photo"?"Photo non reconnue":"Dictée incomprise"} left={<IBtn icon="←" label="Retour" onClick={onBack} mode={mode}/>}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,padding:"32px 24px"}}>
        <div style={{width:72,height:72,borderRadius:20,background:fd("medium",mode).bg,border:`1.5px solid ${fd("medium",mode).border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34}}>{srcMode==="photo"?"🖼️":"🎙️"}</div>
        <div style={{textAlign:"center"}}><div style={{fontSize:15,fontWeight:700,color:t.text1,marginBottom:8}}>{srcMode==="photo"?"Aucun aliment détecté":"Dictée incomprise"}</div><div style={{fontSize:13,color:t.text3,lineHeight:1.5}}>{srcMode==="photo"?"Essayez une photo de face, bien éclairée.":"Réessayez ou saisissez directement."}</div></div>
        <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%"}}><button onClick={()=>{setStep(0);setPhase("processing");}} style={{width:"100%",padding:"13px",borderRadius:12,background:C.teal,color:"white",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{srcMode==="photo"?"📷 Reprendre une photo":"🎤 Réessayer"}</button><button onClick={()=>setPhase("form")} style={{width:"100%",padding:"13px",borderRadius:12,background:t.cardBg,color:t.text2,border:`0.5px solid ${t.chipBorder}`,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>✏️ Saisir manuellement</button></div>
      </div>
    </Fr>
  );

  if(phase==="network")return(
    <Fr mode={mode}><div style={{background:t.surfaceVar,borderBottom:`0.5px solid ${t.chipBorder}`,padding:"6px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}><span>📶</span><span style={{fontSize:11,color:t.text2}}>Analyse IA indisponible · saisie locale, analyse dès reconnexion</span></div>
      <Hdr mode={mode} title="Vérifier le repas" sub="Saisie locale · IA en attente" left={<IBtn icon="←" label="Retour" onClick={onBack} mode={mode}/>}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,padding:"32px 24px"}}>
        <div style={{width:72,height:72,borderRadius:20,background:t.surfaceVar,border:`1.5px solid ${t.chipBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34}}>📶</div>
        <div style={{textAlign:"center"}}><div style={{fontSize:15,fontWeight:700,color:t.text1,marginBottom:8}}>Analyse indisponible</div><div style={{fontSize:13,color:t.text3,lineHeight:1.5}}>Votre enregistrement est conservé. Vous pouvez saisir manuellement.</div></div>
        <button onClick={()=>setPhase("form")} style={{width:"100%",padding:"13px",borderRadius:12,background:C.teal,color:"white",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✏️ Saisir manuellement</button>
      </div>
    </Fr>
  );

  if(phase==="form")return(
    <Fr mode={mode}><Hdr mode={mode} title="Saisir un repas" left={<IBtn icon="←" label="Retour" onClick={onBack} mode={mode}/>} right={<TypeSel/>}/>
      <div style={{flex:1,overflowY:"auto",paddingBottom:90}}>
        <div style={{padding:"12px 16px 8px"}}><Sec mode={mode}>Aliments ajoutés</Sec><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{mChips.map((c,i)=><Chip key={i} name={c.name} level={c.fodmap} mode={mode} onRemove={()=>setMChips(x=>x.filter((_,j)=>j!==i))}/>)}</div></div>
        <div style={{padding:"0 16px 12px"}}><div style={{display:"flex",gap:8}}><input value={mInput} onChange={e=>setMInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addM()} placeholder="Nom d'un aliment…" style={{flex:1,border:`0.5px solid ${t.border}`,borderRadius:10,padding:"10px 14px",fontSize:13,background:t.inputBg,color:t.text1,outline:"none",fontFamily:"inherit"}}/><button onClick={addM} style={{width:40,height:40,borderRadius:10,background:fd("low",mode).bg,border:`0.5px solid ${fd("low",mode).border}`,color:C.teal,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button></div></div>
        <div style={{padding:"0 16px"}}><Sec mode={mode}>Récents</Sec><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{["Riz blanc","Poulet","Saumon","Courgettes","Tomate","Huile d'olive","Œuf"].filter(r=>!mChips.find(c=>c.name===r)).map(r=><button key={r} onClick={()=>setMChips(x=>[...x,{name:r,fodmap:"unknown"}])} style={{padding:"6px 12px",borderRadius:20,background:t.cardBg,border:`0.5px solid ${t.chipBorder}`,color:t.text2,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{r}</button>)}</div></div>
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 16px 24px",background:t.navBg,borderTop:`0.5px solid ${t.border}`}}><PBtn mode={mode} onClick={()=>setDone(true)} disabled={mChips.length===0}>✓ Enregistrer{mChips.length>0?` — ${mChips.length} aliment${mChips.length>1?"s":""}`:""}  </PBtn></div>
    </Fr>
  );

  // Validation IA
  return(
    <Fr mode={mode}><Hdr mode={mode} title="Vérifier le repas" sub={`IA · ${chips.length} aliments identifiés`} left={<IBtn icon="←" label="Retour" onClick={onBack} mode={mode}/>} right={<TypeSel/>}/>
      <div style={{flex:1,overflowY:"auto",paddingBottom:90}}>
        {chips.some(c=>c.fodmap==="high")&&<div style={{margin:"12px 16px 0",background:fd("high",mode).bg,border:`0.5px solid ${fd("high",mode).border}`,borderRadius:10,padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}><span>⚠️</span><span style={{fontSize:12,color:fd("high",mode).text}}>{chips.filter(c=>c.fodmap==="high").length} aliment(s) à FODMAP élevé</span></div>}
        <div style={{padding:"12px 16px 8px"}}><Sec mode={mode}>Aliments — × pour retirer</Sec><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{chips.map((c,i)=><Chip key={i} name={c.name} level={c.fodmap} mode={mode} onRemove={()=>setChips(x=>x.filter((_,j)=>j!==i))}/>)}</div></div>
        <div style={{margin:"4px 16px 12px"}}><FodPill mode={mode}/></div>
        <div style={{margin:"0 16px 14px",display:"flex",gap:8}}><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addChip()} placeholder="Ajouter un aliment manquant…" style={{flex:1,border:`0.5px solid ${t.border}`,borderRadius:10,padding:"10px 14px",fontSize:13,background:t.inputBg,color:t.text1,outline:"none",fontFamily:"inherit"}}/><button onClick={addChip} style={{width:40,height:40,borderRadius:10,background:fd("low",mode).bg,border:`0.5px solid ${fd("low",mode).border}`,color:C.teal,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button></div>
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 16px 24px",background:t.navBg,borderTop:`0.5px solid ${t.border}`}}><PBtn mode={mode} onClick={()=>setDone(true)}>✓ Enregistrer — {chips.length} aliment{chips.length>1?"s":""}</PBtn></div>
    </Fr>
  );
}

/* ════════════════════════════════════════════════════════════
   SYMPTOM ENTRY + CONFIRM
════════════════════════════════════════════════════════════ */
function SymptomEntry({mode,srcMode,onBack}){
  const t=s(mode);
  const initScores=()=>srcMode==="voice"?{...AI_SC}:Object.fromEntries(SYM.map(d=>[d.k,0]));
  const [scores,setScores]=useState(initScores);
  const [bristol,setBristol]=useState(srcMode==="voice"?6:null);
  const [bOpen,setBOpen]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [newLbl,setNewLbl]=useState("");
  const [extras,setExtras]=useState([]);
  const [done,setDone]=useState(false);

  const allSym=[...SYM,...extras];
  const totalActive=Object.values(scores).filter(v=>v>0).length+(bristol?1:0);
  const avgScore=allSym.length>0?Math.round(allSym.reduce((a,d)=>a+(scores[d.k]||0),0)/allSym.length*10)/10:0;
  const avgSev=avgScore>6?"high":avgScore>3?"medium":"low";
  const avgF=fd(avgSev,mode);

  const addCustom=()=>{if(!newLbl.trim())return;const k="c_"+Date.now();setExtras(p=>[...p,{k,l:newLbl.trim(),cat:"personnalisé",e:"➕"}]);setScores(sc=>({...sc,[k]:0}));setNewLbl("");setShowAdd(false);};

  if(done)return <SymptomConfirm mode={mode} scores={scores} symptoms={allSym} bristol={bristol} onBack={onBack}/>;

  const bInfo=bristol?BRISTOL_DATA.find(b=>b.t===bristol):null;

  const renderGrp=(cat)=>{
    const list=allSym.filter(d=>d.cat===cat);if(!list.length)return null;
    const catL=cat==="digestif"?"Digestifs":cat==="systémique"?"Systémiques":cat==="bien-être"?"Bien-être":"Personnalisés";
    return <div key={cat} style={{padding:"12px 16px 0"}}><Sec mode={mode}>{catL}</Sec>
      <Crd mode={mode}>{list.map((d,i,arr)=>{
        const v=scores[d.k]||0;const c=sc(v);const isB=d.bristol;
        return <div key={d.k} style={{padding:"12px 14px",borderBottom:i<arr.length-1?`0.5px solid ${t.borderSub}`:"none"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:15}}>{d.e}</span><span style={{fontSize:13,fontWeight:500,color:t.text1}}>{d.l}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:700,color:v>0?c:t.text4,minWidth:36,textAlign:"right"}}>{v>0?`${v}/10`:"—"}</span>{d.cat==="personnalisé"&&<button onClick={()=>{setExtras(p=>p.filter(x=>x.k!==d.k));setScores(sc=>{const n={...sc};delete n[d.k];return n;});}} style={{background:"none",border:"none",cursor:"pointer",color:t.text4,fontSize:15,padding:0}}>×</button>}</div>
          </div>
          <input type="range" min={0} max={10} step={1} value={v} onChange={e=>setScores(sc=>({...sc,[d.k]:Number(e.target.value)}))} style={{width:"100%",accentColor:c,cursor:"pointer"}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:t.text4,marginTop:2}}><span>Absent</span><span>Modéré</span><span>Intense</span></div>
          {isB&&<div style={{marginTop:10}}>
            <div style={{fontSize:11,color:t.text3,marginBottom:6}}>Type de selles :</div>
            {!bOpen?<button onClick={()=>setBOpen(true)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:10,border:`0.5px solid ${t.border}`,background:t.cardBg,cursor:"pointer",width:"100%",fontFamily:"inherit"}}>
              {bInfo?<><div style={{flexShrink:0}}><BristolSvg t={bInfo.t}/></div><div style={{textAlign:"left"}}><div style={{fontSize:12,fontWeight:700,color:bInfo.c}}>Type {bInfo.t} — {bInfo.l}</div></div><span style={{marginLeft:"auto",fontSize:11,color:C.teal}}>Modifier ▼</span></>:<><span style={{fontSize:12,color:t.text3,flex:1,textAlign:"left"}}>Non renseigné</span><span style={{fontSize:11,color:C.teal}}>Sélectionner ▼</span></>}
            </button>:<div style={{background:t.cardBg,border:`0.5px solid ${t.border}`,borderRadius:12,padding:"10px 8px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
                {BRISTOL_DATA.map(b=><button key={b.t} onClick={()=>{setBristol(b.t);setBOpen(false);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"5px 2px",borderRadius:8,cursor:"pointer",background:bristol===b.t?b.bg:t.surfaceVar,border:`${bristol===b.t?"1.5px":"0.5px"} solid ${bristol===b.t?b.br:t.border}`,fontFamily:"inherit"}}><BristolSvg t={b.t}/><span style={{fontSize:9,fontWeight:700,color:bristol===b.t?b.c:t.text4}}>{b.t}</span></button>)}
              </div>
              <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                {[["1–2","Constipation",FD.high.dot],["3–4","Normal",FD.low.dot],["5–7","Diarrhée",FD.high.dot]].map(([r,l,c])=><div key={r} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:c}}/><span style={{fontSize:9,color:t.text3}}>{r} · {l}</span></div>)}
              </div>
            </div>}
          </div>}
        </div>;
      })}</Crd>
    </div>;
  };

  return(
    <Fr mode={mode}>
      <Hdr mode={mode} title={srcMode==="voice"?"Vérifier les symptômes":"Saisir les symptômes"} sub={srcMode==="voice"?"Dictée analysée · ajustez si besoin":"Faites glisser les curseurs"} left={<IBtn icon="←" label="Retour" onClick={onBack} mode={mode}/>} right={avgScore>0&&<div style={{padding:"4px 12px",borderRadius:20,background:avgF.bg,border:`0.5px solid ${avgF.border}`}}><span style={{fontSize:13,fontWeight:700,color:avgF.text}}>{avgScore}/10</span></div>}/>
      {srcMode==="voice"&&<div style={{background:fd("low",mode).bg,borderBottom:`0.5px solid ${fd("low",mode).border}`,padding:"8px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}><span>✨</span><span style={{fontSize:12,color:fd("low",mode).text}}>Ballonnements intenses et fatigue notable détectés.</span></div>}
      <div style={{flex:1,overflowY:"auto",paddingBottom:90}}>
        {["digestif","systémique","bien-être","personnalisé"].map(c=>renderGrp(c))}
        <div style={{padding:"12px 16px 4px"}}>
          {!showAdd?<button onClick={()=>setShowAdd(true)} style={{width:"100%",padding:"10px",borderRadius:12,background:t.cardBg,border:`0.5px dashed ${t.chipBorder}`,color:t.text3,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>＋ Ajouter un symptôme</button>:<div style={{display:"flex",gap:8}}><input value={newLbl} onChange={e=>setNewLbl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCustom()} placeholder="Ex : maux de tête…" style={{flex:1,border:`1px solid ${fd("high",mode).border}`,borderRadius:10,padding:"10px 14px",fontSize:13,background:t.inputBg,color:t.text1,outline:"none",fontFamily:"inherit"}}/><button onClick={addCustom} style={{width:44,height:44,borderRadius:10,background:C.coral,border:"none",color:"white",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button><button onClick={()=>{setShowAdd(false);setNewLbl("");}} style={{width:44,height:44,borderRadius:10,background:t.chip,border:`0.5px solid ${t.chipBorder}`,color:t.text3,fontSize:18,cursor:"pointer"}}>×</button></div>}
        </div>
        <div style={{height:16}}/>
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 16px 24px",background:t.navBg,borderTop:`0.5px solid ${t.border}`}}><PBtn mode={mode} color={C.coral} onClick={()=>setDone(true)}>✓ Enregistrer{totalActive>0?` — ${totalActive} élément${totalActive>1?"s":""}`:""}
      </PBtn></div>
    </Fr>
  );
}

function SymptomConfirm({mode,scores,symptoms,bristol,onBack}){
  const t=s(mode);const [expanded,setExpanded]=useState(false);
  const active=symptoms.filter(d=>(scores[d.k]||0)>0);
  const avgScore=symptoms.length>0?Math.round(active.reduce((a,d)=>a+(scores[d.k]||0),0)/symptoms.length*10)/10:0;
  const avgSev=avgScore>6?"high":avgScore>3?"medium":"low";
  const avgF=fd(avgSev,mode);
  const bInfo=bristol?BRISTOL_DATA.find(b=>b.t===bristol):null;
  const LM={type:"Déjeuner",time:"12:30",deltaMin:95,items:[{n:"Oignon",f:"high"},{n:"Riz basmati",f:"low"},{n:"Poulet grillé",f:"low"}]};
  const highIt=LM.items.filter(i=>i.f==="high");
  const dL=LM.deltaMin<60?`${LM.deltaMin} min`:`${Math.round(LM.deltaMin/60*10)/10}h`;
  const corrS=avgScore>=4&&highIt.length>0&&LM.deltaMin>=45&&LM.deltaMin<=240;
  const topSym=[...active].sort((a,b)=>(scores[b.k]||0)-(scores[a.k]||0))[0];
  const hF=fd("high",mode);const lF=fd("low",mode);
  return(
    <Fr mode={mode}>
      <Hdr mode={mode} title="Symptômes enregistrés" sub={`15:47 · ${active.length} symptôme${active.length>1?"s":""} saisi${active.length>1?"s":""}`} right={avgScore>0&&<div style={{padding:"5px 14px",borderRadius:20,background:avgF.bg,border:`0.5px solid ${avgF.border}`}}><span style={{fontSize:15,fontWeight:700,color:avgF.text}}>{avgScore}/10</span></div>}/>
      <div style={{flex:1,overflowY:"auto",paddingBottom:90}}>
        <div style={{padding:"12px 16px 0"}}><Sec mode={mode}>Récapitulatif</Sec>
          <Crd mode={mode} style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
            {active.length===0&&!bInfo&&<div style={{fontSize:13,color:t.text3,textAlign:"center",padding:"8px 0"}}>Aucun symptôme noté — bonne journée 🎉</div>}
            {active.map(d=>{const v=scores[d.k]||0;const c=sc(v);return <div key={d.k}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>{d.e||"🫀"}</span><span style={{fontSize:12,fontWeight:500,color:t.text1}}>{d.l}</span></div><span style={{fontSize:13,fontWeight:700,color:c}}>{v}/10</span></div><div style={{height:6,borderRadius:3,background:t.surfaceVar,overflow:"hidden"}}><div style={{height:"100%",width:`${v*10}%`,borderRadius:3,background:c}}/></div></div>;})}
            {bInfo&&<div style={{borderTop:active.length>0?`0.5px solid ${t.borderSub}`:"none",paddingTop:active.length>0?10:0}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".6px",color:t.text4,marginBottom:6}}>Selles</div><div style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:10,background:bInfo.bg,border:`0.5px solid ${bInfo.br}`}}><div style={{flexShrink:0}}><BristolSvg t={bInfo.t}/></div><div style={{fontSize:12,fontWeight:700,color:bInfo.c}}>Type {bInfo.t} — {bInfo.l}</div></div></div>}
          </Crd>
        </div>
        <div style={{padding:"12px 16px 0"}}><Sec mode={mode}>Corrélation avec le dernier repas</Sec>
          <Crd mode={mode} style={{border:`0.5px solid ${corrS?hF.border:t.border}`}}>
            <div style={{background:corrS?hF.bg:lF.bg,padding:"8px 14px",borderBottom:`0.5px solid ${corrS?hF.border:lF.border}`,display:"flex",alignItems:"center",gap:8}}><span>{corrS?"⚠️":"ℹ️"}</span><span style={{fontSize:12,fontWeight:500,color:corrS?hF.text:lF.text}}>{corrS?`Signal fort — symptômes survenus ${dL} après le repas`:`Survenu ${dL} après le ${LM.type.toLowerCase()}`}</span></div>
            <div style={{padding:"10px 14px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,fontWeight:600,color:t.text1}}>{LM.type} · {LM.time}</span><button onClick={()=>setExpanded(e=>!e)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.teal,fontWeight:600,fontFamily:"inherit"}}>{expanded?"Réduire ▲":"Détail ▼"}</button></div>
              {highIt.length>0&&<div style={{marginBottom:expanded?8:0}}><div style={{fontSize:10,color:t.text4,textTransform:"uppercase",letterSpacing:".6px",marginBottom:5}}>FODMAP élevé</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{highIt.map((it,i)=><Chip key={i} name={it.n} level={it.f} mode={mode} sm/>)}</div></div>}
              {expanded&&<div style={{borderTop:`0.5px solid ${t.borderSub}`,paddingTop:8}}><div style={{fontSize:10,color:t.text4,textTransform:"uppercase",letterSpacing:".6px",marginBottom:5}}>Tous les aliments</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{LM.items.map((it,i)=><Chip key={i} name={it.n} level={it.f} mode={mode} sm/>)}</div></div>}
            </div>
            {corrS&&topSym&&<div style={{background:t.surfaceVar,borderTop:`0.5px solid ${t.borderSub}`,padding:"10px 14px",display:"flex",gap:8}}><span style={{flexShrink:0}}>💡</span><span style={{fontSize:12,color:t.text2,lineHeight:1.5}}>{topSym.l} ({scores[topSym.k]}/10) après de l'oignon — pattern visible dans vos analyses.</span></div>}
          </Crd>
        </div>
        <div style={{height:16}}/>
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 16px 24px",background:t.navBg,borderTop:`0.5px solid ${t.border}`}}><PBtn mode={mode} onClick={onBack}>← Retour au journal</PBtn></div>
    </Fr>
  );
}

/* ════════════════════════════════════════════════════════════
   INTAKE ENTRY
════════════════════════════════════════════════════════════ */
function IntakeEntry({mode,onBack}){
  const t=s(mode);
  const [states,setStates]=useState(TREATS.map(x=>({...x,confirmed:false,skipped:false})));
  const [detailId,setDetailId]=useState(null);
  const [lpTimer,setLpTimer]=useState(null);
  const [didLong,setDidLong]=useState(false);
  const detailSt=states.find(x=>x.id===detailId);
  const confirmed=states.filter(x=>x.confirmed||x.skipped).length;
  const onDown=id=>{setDidLong(false);const tt=setTimeout(()=>{setDidLong(true);setDetailId(id);},500);setLpTimer(tt);};
  const onUp=id=>{clearTimeout(lpTimer);if(!didLong)setStates(p=>p.map(x=>x.id===id&&!x.confirmed&&!x.skipped?{...x,confirmed:true}:x));};
  const confDetail=st=>{setStates(p=>p.map(x=>x.id===detailId?{...x,confirmed:st==="taken",skipped:st==="skipped"}:x));setDetailId(null);};
  return(
    <Fr mode={mode}><Hdr mode={mode} title="Saisir des prises" left={<IBtn icon="←" label="Retour" onClick={onBack} mode={mode}/>}/>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px 100px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"6px 14px",marginBottom:14,width:"fit-content",margin:"0 auto 14px",background:t.surfaceVar,borderRadius:20,fontSize:12,color:t.text3}}>👆 Court = pris <span style={{color:t.chipBorder}}>·</span> ✋ Long = détail</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {states.map(st=>{
            const tk=st.confirmed;const sk=st.skipped;const f=tk?fd("low",mode):sk?fd("high",mode):null;
            return <div key={st.id} onPointerDown={()=>onDown(st.id)} onPointerUp={()=>onUp(st.id)} style={{background:f?f.bg:t.cardBg,border:`0.5px solid ${f?f.border:t.border}`,borderRadius:14,padding:"13px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",userSelect:"none",transition:"all .15s"}}>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:f?f.text:t.text1}}>{st.name}</div><div style={{fontSize:12,color:f?f.text:t.text3,marginTop:2,opacity:.8}}>{st.dose} · {st.freq}</div></div>
              <div style={{width:32,height:32,borderRadius:16,background:tk?FD.low.dot:sk?FD.high.dot:t.surfaceVar,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:"white",flexShrink:0}}>{tk?"✓":sk?"✕":"○"}</div>
            </div>;
          })}
        </div>
      </div>
      {detailSt&&<Sheet mode={mode} onClose={()=>setDetailId(null)}><div style={{padding:"0 16px 16px"}}><div style={{fontSize:16,fontWeight:700,color:t.text1,marginBottom:4}}>{detailSt.name}</div><div style={{fontSize:12,color:t.text3,marginBottom:14}}>{detailSt.dose} · {detailSt.freq}</div><div style={{display:"flex",gap:10,marginBottom:14}}><div style={{flex:1,background:t.surfaceVar,borderRadius:10,padding:"8px 12px"}}><div style={{fontSize:10,color:t.text4,marginBottom:3}}>Heure</div><div style={{fontSize:14,fontWeight:600,color:t.text1}}>{new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</div></div><div style={{flex:1,background:t.surfaceVar,borderRadius:10,padding:"8px 12px"}}><div style={{fontSize:10,color:t.text4,marginBottom:3}}>Dose</div><div style={{fontSize:14,fontWeight:600,color:t.text1}}>{detailSt.dose}</div></div></div><div style={{display:"flex",gap:8}}><button onClick={()=>confDetail("taken")} style={{flex:2,padding:"12px",borderRadius:12,background:C.teal,color:"white",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ Pris</button><button onClick={()=>confDetail("skipped")} style={{flex:1,padding:"12px",borderRadius:12,background:t.surfaceVar,border:`0.5px solid ${t.chipBorder}`,color:t.text2,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Sauté</button></div></div></Sheet>}
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:t.navBg,borderTop:`0.5px solid ${t.border}`,padding:"12px 16px 24px"}}><div style={{fontSize:12,color:t.text3,textAlign:"center",marginBottom:10}}>{confirmed} traitement{confirmed>1?"s":""} confirmé{confirmed>1?"s":""} sur {states.length}</div><PBtn mode={mode} onClick={onBack} disabled={confirmed===0}>✓ Terminer</PBtn></div>
    </Fr>
  );
}

/* ════════════════════════════════════════════════════════════
   NOTE ENTRY
════════════════════════════════════════════════════════════ */
function NoteEntry({mode,onBack}){
  const t=s(mode);const [nm,setNm]=useState("text");const [content,setContent]=useState("");const [linked,setLinked]=useState(0);const [tags,setTags]=useState([]);const [showLink,setShowLink]=useState(false);const [saved,setSaved]=useState(false);
  const modes=[{k:"text",i:"✏️",l:"Texte"},{k:"voice",i:"🎤",l:"Vocal"},{k:"photo",i:"📷",l:"Photo"}];
  const canSub=content.trim().length>0||nm==="photo";const tF=fd("low",mode);
  const handleSub=()=>{setSaved(true);setTags(["ballonnements","post-prandial","oignon"]);};
  return(
    <Fr mode={mode}><Hdr mode={mode} title="Saisir une note" left={<IBtn icon="←" label="Retour" onClick={onBack} mode={mode}/>}/>
      <div style={{background:t.headerBg,borderBottom:`0.5px solid ${t.border}`,padding:"10px 16px",display:"flex",gap:6,flexShrink:0}}>
        {modes.map(m=><button key={m.k} onClick={()=>{setNm(m.k);setContent("");setSaved(false);setTags([]);}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",borderRadius:10,border:"0.5px solid",background:nm===m.k?tF.bg:t.surfaceVar,borderColor:nm===m.k?tF.border:t.border,cursor:"pointer",fontFamily:"inherit"}}><span style={{fontSize:18}}>{m.i}</span><span style={{fontSize:10,fontWeight:600,color:nm===m.k?tF.text:t.text3}}>{m.l}</span></button>)}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px 100px"}}>
        {nm==="text"&&<Crd mode={mode} style={{marginBottom:12}}><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder={"Écrivez votre observation…\nEx : ballonnements 2h après le déjeuner"} style={{width:"100%",minHeight:120,border:"none",resize:"none",background:"transparent",outline:"none",fontSize:14,color:t.text1,fontFamily:"inherit",padding:"12px 14px",lineHeight:1.6}}/></Crd>}
        {nm==="voice"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,padding:"24px 0",marginBottom:12}}>
          <button onClick={()=>setContent(c=>c?"":"J'ai des ballonnements importants 2h après le déjeuner, je suspecte l'oignon.")} style={{width:72,height:72,borderRadius:36,background:content?tF.bg:t.surfaceVar,border:`2px solid ${content?tF.border:t.chipBorder}`,fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{content?"⏹":"🎤"}</button>
          <div style={{fontSize:13,color:t.text3}}>{content?"Appuyez pour arrêter":"Appuyez pour dicter"}</div>
          {content&&<Crd mode={mode} style={{width:"100%",padding:"12px 14px"}}><div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".6px",color:t.text4,marginBottom:6}}>Transcription</div><div style={{fontSize:13,color:t.text1,lineHeight:1.5}}>{content}</div></Crd>}
        </div>}
        {nm==="photo"&&<Crd mode={mode} style={{padding:"28px 16px",textAlign:"center",marginBottom:12}}><div style={{fontSize:40,marginBottom:8}}>📷</div><div style={{fontSize:14,fontWeight:600,color:t.text1,marginBottom:4}}>Attacher une photo</div><div style={{fontSize:12,color:t.text3,marginBottom:14}}>Repas, symptôme ou autre observation visuelle</div><div style={{display:"flex",gap:8,justifyContent:"center"}}><button onClick={()=>setContent("photo")} style={{padding:"9px 18px",borderRadius:20,background:C.teal,color:"white",border:"none",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>📷 Caméra</button><button style={{padding:"9px 18px",borderRadius:20,background:t.surfaceVar,border:`0.5px solid ${t.chipBorder}`,color:t.text2,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>🖼️ Galerie</button></div></Crd>}
        {tags.length>0&&<div style={{marginBottom:12}}><Sec mode={mode}>Tags générés par l'IA</Sec><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{tags.map(tag=><span key={tag} style={{padding:"4px 10px",borderRadius:20,background:tF.bg,border:`0.5px solid ${tF.border}`,fontSize:12,color:tF.text}}>#{tag}</span>)}</div></div>}
        <button onClick={()=>setShowLink(true)} style={{width:"100%",padding:"11px 14px",borderRadius:12,background:t.surfaceVar,border:`0.5px solid ${t.chipBorder}`,color:t.text2,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}><span>🔗</span>Lier à…{linked>0&&<span style={{marginLeft:"auto",fontSize:12,color:tF.text}}>{linked} lié{linked>1?"s":""}</span>}</button>
      </div>
      {showLink&&<Sheet mode={mode} onClose={()=>setShowLink(false)}><div style={{padding:"0 16px 16px"}}><div style={{fontSize:15,fontWeight:700,color:t.text1,marginBottom:12}}>Lier à des entrées du jour</div>{[{i:"🍽️",l:"Déjeuner — 4 aliments"},{i:"🫀",l:"Ballonnements — 7/10"},{i:"💊",l:"Rifaximin — pris"}].map((e,i)=><button key={i} onClick={()=>{setLinked(1);setShowLink(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 0",background:"none",border:"none",borderBottom:i<2?`0.5px solid ${t.borderSub}`:"none",cursor:"pointer",fontFamily:"inherit"}}><span style={{fontSize:20}}>{e.i}</span><span style={{fontSize:13,color:t.text1}}>{e.l}</span></button>)}</div></Sheet>}
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:t.navBg,borderTop:`0.5px solid ${t.border}`,padding:"12px 16px 24px"}}><PBtn mode={mode} onClick={handleSub} disabled={!canSub}>✓ {saved?"Note enregistrée ✓":"Valider la note"}</PBtn></div>
    </Fr>
  );
}

/* ════════════════════════════════════════════════════════════
   ANALYSIS
════════════════════════════════════════════════════════════ */
function Analysis({mode,go}){
  const t=s(mode);const [wD,setWD]=useState(30);const [showDlg,setShowDlg]=useState(false);const [analyzing,setAnalyzing]=useState(false);const [lastA,setLastA]=useState(null);const [rKey,setRKey]=useState(0);const [prim,setPrim]=useState("abdominal_pain");const [sec,setSec]=useState(null);
  const pData=genT(wD,prim);const sData=sec?genT(wD,sec):[];const wbData=genW(wD);
  const W=320,H=100,PL=24,PB=20,PT=8,PR=8,CW=W-PL-PR,CH=H-PT-PB;
  const toXY=(i,v)=>({x:PL+(i/(wD-1))*CW,y:PT+(1-v/10)*CH});
  const bPath=data=>{const pts=data.map((d,i)=>d.ok?{...toXY(i,d.v),i}:null).filter(Boolean);if(pts.length<2)return"";let p=`M ${pts[0].x} ${pts[0].y}`;for(let k=1;k<pts.length;k++)p+=pts[k].i-pts[k-1].i===1?` L ${pts[k].x} ${pts[k].y}`:` M ${pts[k].x} ${pts[k].y}`;return p;};
  const xLbls=[0,Math.floor(wD/2),wD-1].map(i=>{const d=new Date();d.setDate(d.getDate()-(wD-1-i));return{x:PL+(i/(wD-1))*CW,l:`${d.getDate()}/${d.getMonth()+1}`};});
  const now=new Date();const month=now.toLocaleString("fr-FR",{month:"long",year:"numeric"});const firstDow=(new Date(now.getFullYear(),now.getMonth(),1).getDay()+6)%7;const dIM=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();const wStart=new Date(now);wStart.setDate(wStart.getDate()-wD);
  const wbMap=new Map(wbData.map((d,i)=>{const dt=new Date(now);dt.setDate(dt.getDate()-(wD-1-i));return[dt.toISOString().slice(0,10),d.v];}));
  const wbW=wbData.filter(d=>d.v!==null);const wbAvg=wbW.length?Math.round(wbW.reduce((a,d)=>a+d.v,0)/wbW.length*10)/10:null;
  const dayCells=[...Array(firstDow).fill(null),...Array.from({length:dIM},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth(),i+1);const inW=d>=wStart&&d<=now;const v=wbMap.get(d.toISOString().slice(0,10))??null;return{day:i+1,inW,v};})];
  const runA=days=>{setShowDlg(false);setAnalyzing(true);setTimeout(()=>{setAnalyzing(false);setLastA(new Date());setRKey(k=>k+1);},3000);};
  const lastAgo=lastA?(()=>{const d=Math.floor((Date.now()-lastA)/86400000);return d===0?"aujourd'hui":d===1?"hier":`il y a ${d} j`;})():null;
  const tF=fd("low",mode);const mF=fd("medium",mode);
  const SC=({title,icon,children,accent})=><div style={{background:t.cardBg,border:`0.5px solid ${t.border}`,borderRadius:14,margin:"0 12px 10px",overflow:"hidden"}}><div style={{padding:"10px 14px 8px",borderBottom:`0.5px solid ${t.borderSub}`,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:14}}>{icon}</span><span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".8px",color:accent||C.teal}}>{title}</span></div><div style={{padding:"12px 14px"}}>{children}</div></div>;
  return(
    <Fr mode={mode}>
      <div style={{background:t.headerBg,borderBottom:`0.5px solid ${t.border}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}><span style={{fontSize:18,fontWeight:600,color:t.text1}}>Analyse</span><div style={{display:"flex",background:t.chip,borderRadius:10,border:`0.5px solid ${t.chipBorder}`,padding:3,gap:2}}>{[7,30,90].map(d=><button key={d} onClick={()=>setWD(d)} style={{padding:"4px 12px",borderRadius:7,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:wD===d?C.teal:"transparent",color:wD===d?"white":t.text3,transition:"all .15s"}}>{d}j</button>)}</div></div>
      {lastA&&<div style={{background:tF.bg,borderBottom:`0.5px solid ${tF.border}`,padding:"7px 16px",display:"flex",alignItems:"center",gap:6,flexShrink:0}}><span>🕐</span><span style={{fontSize:12,color:tF.text,fontWeight:500}}>Dernière analyse IA : {lastAgo}</span></div>}
      {analyzing&&<div style={{background:mF.bg,borderBottom:`0.5px solid ${mF.border}`,padding:"8px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}><div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${C.amber}`,borderTopColor:"transparent",animation:"spin .8s linear infinite"}}/><span style={{fontSize:13,color:mF.text,fontWeight:500}}>Analyse IA en cours…</span></div>}
      <div style={{flex:1,overflowY:"auto",paddingTop:10,paddingBottom:80}}>
        <SC title="Évolution des symptômes" icon="📈">
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <select value={prim} onChange={e=>setPrim(e.target.value)} style={{flex:1,fontSize:12,fontWeight:600,color:C.teal,background:tF.bg,border:`0.5px solid ${tF.border}`,borderRadius:8,padding:"5px 8px",cursor:"pointer",fontFamily:"inherit"}}>{SYM_OPTS.map(o=><option key={o.k} value={o.k}>{o.l}</option>)}</select>
            <select value={sec||""} onChange={e=>setSec(e.target.value||null)} style={{flex:1,fontSize:12,color:t.text3,background:t.chip,border:`0.5px solid ${t.chipBorder}`,borderRadius:8,padding:"5px 8px",cursor:"pointer",fontFamily:"inherit"}}><option value="">+ Superposer</option>{SYM_OPTS.filter(o=>o.k!==prim).map(o=><option key={o.k} value={o.k}>{o.l}</option>)}</select>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}>
            <line x1={PL} y1={PT} x2={PL} y2={PT+CH} stroke={t.border} strokeWidth="1"/><line x1={PL} y1={PT+CH} x2={PL+CW} y2={PT+CH} stroke={t.border} strokeWidth="1"/><line x1={PL} y1={PT+CH/2} x2={PL+CW} y2={PT+CH/2} stroke={t.border} strokeWidth="0.5" strokeDasharray="2 4"/>
            {[10,5,0].map(v=><text key={v} x={PL-3} y={PT+(1-v/10)*CH+4} textAnchor="end" fontSize="9" fill={t.text4}>{v}</text>)}
            {xLbls.map((l,i)=><text key={i} x={l.x} y={H-2} textAnchor="middle" fontSize="9" fill={t.text4}>{l.l}</text>)}
            <path d={bPath(pData)} fill="none" stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {pData.filter(d=>d.ok).map((d,i)=>{const{x,y}=toXY(i,d.v);return <circle key={i} cx={x} cy={y} r="2.5" fill={C.teal}/>;})}
            {sec&&<><path d={bPath(sData)} fill="none" stroke={C.coral} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2"/>{sData.filter(d=>d.ok).map((d,i)=>{const{x,y}=toXY(i,d.v);return <circle key={i} cx={x} cy={y} r="2" fill={C.coral}/>;})}</>}
          </svg>
          <div style={{display:"flex",gap:14,marginTop:6}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:20,height:2,background:C.teal,borderRadius:1}}/><span style={{fontSize:11,color:t.text3}}>{SYM_OPTS.find(o=>o.k===prim)?.l}</span></div>{sec&&<div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:16,height:2,background:C.coral,borderRadius:1}}/><span style={{fontSize:11,color:t.text3}}>{SYM_OPTS.find(o=>o.k===sec)?.l}</span></div>}</div>
        </SC>
        <SC title="Bien-être quotidien" icon="💚">
          {wbAvg!==null&&<div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:10}}><span style={{fontSize:26,fontWeight:700,color:sc(wbAvg)}}>{wbAvg}</span><span style={{fontSize:13,color:t.text3}}>/10 · moyen sur {wD} j</span></div>}
          <div style={{fontSize:12,fontWeight:600,textAlign:"center",color:t.text3,marginBottom:8,textTransform:"capitalize"}}>{month}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
            {["L","M","M","J","V","S","D"].map((n,i)=><div key={i} style={{textAlign:"center",fontSize:9,fontWeight:600,color:t.text4,paddingBottom:3}}>{n}</div>)}
            {dayCells.map((cell,i)=>{const v=cell?.v??null;const inW=cell?.inW??false;const bg=cell===null?"transparent":!inW?t.surfaceVar:v===null?t.surfaceVar:v>=7?(mode==="dark"?"#0D2B1E":"#C8E6C9"):v>=4?(mode==="dark"?"#271A04":"#FFE0B2"):(mode==="dark"?"#2B1108":"#FFCDD2");const tc=cell===null?"transparent":!inW?t.text4:v===null?t.text4:v>=7?(mode==="dark"?"#5DCAA5":"#1B5E20"):v>=4?(mode==="dark"?"#FAC775":"#BF360C"):(mode==="dark"?"#F0997B":"#B71C1C");return <div key={i} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:5,fontSize:10,fontWeight:500,background:bg,color:tc,opacity:cell===null?0:!inW?.4:1}}>{cell?.day}</div>;})}</div>
        </SC>
        <SC title="Observance traitements" icon="💊" accent={C.amber}>
          <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:10}}><span style={{fontSize:26,fontWeight:700,color:FD.low.dot}}>76%</span><span style={{fontSize:13,color:t.text3}}>d'observance sur {wD} j</span></div>
          {[{n:"Rifaximin 550mg",r:.91},{n:"Prokinétique",r:.74},{n:"Probiotiques",r:.62}].map((x,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:i<2?8:0}}><span style={{fontSize:12,color:t.text2}}>{x.n}</span><span style={{fontSize:13,fontWeight:700,color:x.r>=.8?FD.low.dot:x.r>=.5?FD.medium.dot:FD.high.dot}}>{Math.round(x.r*100)}%</span></div>)}
        </SC>
        <SC title="Analyses IA" icon="✨" accent={C.blue}>
          {rKey===0?<div style={{textAlign:"center",padding:"16px 0"}}><div style={{fontSize:32,marginBottom:8,opacity:.4}}>🤖</div><div style={{fontSize:13,color:t.text3,marginBottom:4}}>Aucune analyse effectuée</div><div style={{fontSize:12,color:t.text4}}>Appuyez sur ✨ pour lancer votre première analyse IA</div></div>:<>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:6}}><span style={{fontSize:11,color:t.text4}}>Analysé le {new Date().toLocaleDateString("fr-FR")} · {wD} j</span><button style={{fontSize:11,padding:"5px 10px",borderRadius:8,border:`0.5px solid ${t.chipBorder}`,background:t.chip,color:t.text2,cursor:"pointer",fontFamily:"inherit"}}>📋 Copier</button></div>
            {[{label:"Alertes",icon:"⚠️",types:["alert"]},{label:"Corrélations",icon:"🔗",types:["correlation"]},{label:"Patterns",icon:"📊",types:["pattern"]},{label:"Recommandations",icon:"💡",types:["recommendation"]}].map(g=>{const cards=INSIGHTS.filter(c=>g.types.includes(c.type));if(!cards.length)return null;const cf=conf=>conf>=.8?fd("low",mode):conf>=.5?fd("medium",mode):fd("high",mode);return <div key={g.label} style={{marginBottom:12}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",color:t.text3,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><span>{g.icon}</span>{g.label}</div>{cards.map((card,i)=>{const f=cf(card.conf);return <div key={i} style={{background:t.chip,border:`0.5px solid ${t.chipBorder}`,borderRadius:12,padding:"10px 12px",marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:5}}><span style={{fontSize:13,fontWeight:600,color:t.text1,lineHeight:1.3}}>{card.title}</span><span style={{flexShrink:0,fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:10,background:f.bg,color:f.text}}>{Math.round(card.conf*100)}%</span></div><p style={{margin:0,fontSize:12,color:t.text3,lineHeight:1.5}}>{card.desc}</p></div>;})};</div>;})}
          </>}
        </SC>
      </div>
      <button onClick={()=>!analyzing&&setShowDlg(true)} style={{position:"absolute",bottom:80,right:16,width:analyzing?undefined:56,height:56,padding:analyzing?"0 20px":0,borderRadius:analyzing?28:"50%",background:analyzing?t.chip:C.teal,border:`0.5px solid ${analyzing?t.chipBorder:C.teal}`,color:analyzing?t.text3:"white",fontSize:analyzing?13:22,fontFamily:"inherit",fontWeight:600,cursor:analyzing?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:analyzing?"none":"0 4px 16px rgba(15,110,86,.4)",transition:"all .2s",zIndex:20}}>
        {analyzing?<><div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${t.text3}`,borderTopColor:"transparent",animation:"spin .8s linear infinite"}}/>Analyse…</>:"✨"}
      </button>
      {showDlg&&<Sheet mode={mode} onClose={()=>setShowDlg(false)}><div style={{padding:"0 16px 24px"}}><div style={{fontSize:16,fontWeight:700,color:t.text1,marginBottom:4}}>Lancer une analyse IA</div><div style={{fontSize:13,color:t.text3,marginBottom:16,lineHeight:1.5}}>Claude analysera vos données pour identifier corrélations et patterns.</div><div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>{[{d:7,e:"~500 tokens"},{d:14,e:"~1 000 tokens"},{d:30,e:"~2 500 tokens"},{d:90,e:"~7 000 tokens"}].map(o=><button key={o.d} onClick={()=>runA(o.d)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",borderRadius:12,border:`0.5px solid ${t.chipBorder}`,background:t.surfaceVar,cursor:"pointer",fontFamily:"inherit"}}><span style={{fontSize:14,fontWeight:600,color:t.text1}}>{o.d} jours</span><span style={{fontSize:11,color:t.text4}}>{o.e}</span></button>)}</div></div></Sheet>}
      <Nav mode={mode} active="analyse" go={go}/>
    </Fr>
  );
}

/* ════════════════════════════════════════════════════════════
   COACH CHAT
════════════════════════════════════════════════════════════ */
function CoachChat({mode,go}){
  const t=s(mode);const [msgs,setMsgs]=useState([]);const [input,setInput]=useState("");const [streaming,setStreaming]=useState(false);const [showPicker,setShowPicker]=useState(true);const [ctx,setCtx]=useState(null);const [tokens,setTokens]=useState(0);const [copiedIdx,setCopiedIdx]=useState(null);const botRef=useRef(null);
  const sugg=["Comment se passe mon protocole cette semaine ?","Quels aliments déclenchent mes symptômes ?","Mon observance est-elle satisfaisante ?"];
  const selCtx=opt=>{setCtx(opt);setShowPicker(false);};
  const send=(txt)=>{const msg=txt||input.trim();if(!msg||streaming||!ctx)return;setInput("");setMsgs(p=>[...p,{role:"user",content:msg},{role:"assistant",content:"",streaming:true}]);setStreaming(true);const resp="D'après vos données des 7 derniers jours, vos ballonnements sont surtout présents en après-midi, environ 90 min après le déjeuner. L'oignon apparaît dans 4 repas sur 5 précédant un pic de symptômes. Je vous recommande d'éliminer l'oignon pendant 2 semaines pour tester cette corrélation.";let i=0;const iv=setInterval(()=>{i+=6;setMsgs(p=>{const u=[...p];u[u.length-1]={role:"assistant",content:resp.slice(0,i),streaming:i<resp.length};return u;});if(i>=resp.length){clearInterval(iv);setStreaming(false);setTokens(tk=>tk+280);}},25);};
  useEffect(()=>{botRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const tF=fd("low",mode);
  return(
    <Fr mode={mode}>
      <Hdr mode={mode} title="Coach IA" sub={ctx?`Session · ${ctx.l}`:null} right={<div style={{display:"flex",gap:2}}><IBtn icon="📜" label="Historique" mode={mode}/><IBtn icon="✚" label="Nouvelle conv." mode={mode} onClick={()=>{setMsgs([]);setShowPicker(true);setCtx(null);setTokens(0);}}/></div>}/>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px 0"}}>
        {msgs.length===0&&!showPicker&&<div style={{marginBottom:16}}><Sec mode={mode}>Suggestions</Sec>{sugg.map((q,i)=><button key={i} onClick={()=>send(q)} style={{width:"100%",textAlign:"left",padding:"10px 14px",marginBottom:6,borderRadius:12,background:t.cardBg,border:`0.5px solid ${t.border}`,color:t.text2,fontSize:13,cursor:"pointer",fontFamily:"inherit",lineHeight:1.4}}>{q}</button>)}</div>}
        {msgs.map((msg,i)=><div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start",marginBottom:12}}>
          <div style={{maxWidth:"82%",padding:"10px 14px",borderRadius:msg.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:msg.role==="user"?C.teal:t.cardBg,border:msg.role==="user"?"none":`0.5px solid ${t.border}`,color:msg.role==="user"?"white":t.text1,fontSize:14,lineHeight:1.5}}>{msg.content||msg.streaming&&<span style={{opacity:.6,letterSpacing:4}}>···</span>}</div>
          {msg.role==="assistant"&&!msg.streaming&&msg.content&&<button onClick={()=>{setCopiedIdx(i);setTimeout(()=>setCopiedIdx(null),2000);}} style={{background:"none",border:"none",cursor:"pointer",color:t.text4,fontSize:11,marginTop:4,padding:"2px 4px",fontFamily:"inherit"}}>{copiedIdx===i?"✓ Copié":"📋 Copier"}</button>}
        </div>)}
        <div ref={botRef}/>
      </div>
      <div style={{background:t.navBg,borderTop:`0.5px solid ${t.border}`,padding:"8px 12px 24px",flexShrink:0}}>
        <div style={{fontSize:11,color:t.text4,textAlign:"right",marginBottom:6}}>~{tokens} tokens</div>
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())} placeholder={ctx?"Votre message…":"Choisissez un contexte d'abord"} disabled={!ctx||streaming} rows={2} style={{flex:1,border:`0.5px solid ${t.border}`,borderRadius:12,padding:"10px 12px",background:t.inputBg,color:t.text1,fontSize:14,fontFamily:"inherit",resize:"none",outline:"none",opacity:ctx?1:.5}}/>
          <button onClick={()=>send()} disabled={!input.trim()||streaming||!ctx} style={{width:44,height:44,borderRadius:22,background:!input.trim()||streaming||!ctx?t.surfaceVar:C.teal,border:"none",color:"white",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginBottom:2}}>➤</button>
        </div>
      </div>
      {showPicker&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"flex-end",zIndex:50}}><div style={{width:"100%",background:t.cardBg,borderRadius:"16px 16px 0 0",border:`0.5px solid ${t.border}`}}><div style={{width:32,height:4,borderRadius:2,background:t.chipBorder,margin:"12px auto 16px"}}/><div style={{padding:"0 16px 12px"}}><div style={{fontSize:16,fontWeight:700,color:t.text1,marginBottom:4}}>Choisir le contexte de données</div><div style={{fontSize:12,color:t.text3}}>Plus de contexte = réponses plus précises = plus de tokens</div></div>{CTX.map((opt,i)=><button key={opt.key} onClick={()=>selCtx(opt)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"none",border:"none",borderTop:`0.5px solid ${t.borderSub}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}><span style={{fontSize:20,flexShrink:0}}>{opt.icon}</span><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:t.text1}}>{opt.l}</div><div style={{fontSize:11,color:t.text3}}>{opt.d}</div></div><span style={{fontSize:11,color:t.text4,flexShrink:0}}>{opt.est}</span></button>)}<div style={{height:24}}/></div></div>}
      <Nav mode={mode} active="coach" go={go}/>
    </Fr>
  );
}

/* ════════════════════════════════════════════════════════════
   REPORT
════════════════════════════════════════════════════════════ */
function Report({mode,go}){
  const t=s(mode);const [w,setW]=useState(14);const [fmt,setFmt]=useState("text");const [aiSum,setAiSum]=useState(false);const [gen,setGen]=useState(false);const [done,setDone]=useState(false);const [copied,setCopied]=useState(false);
  const tF=fd("low",mode);const sects=[{ti:"Symptômes",c:"14 entrées · Score moyen 4.2/10 · Ballonnements dominants (6.8/10)"},{ti:"Repas & FODMAP",c:"42 repas · Oignon présent dans 68% des repas précédant les pics"},{ti:"Observance",c:"Rifaximin 91% · Prokinétique 74% · Probiotiques 62%"},{ti:"Bien-être",c:"Score moyen 5.8/10 · Tendance positive sur la période"}];
  const generate=()=>{setGen(true);setTimeout(()=>{setGen(false);setDone(true);},2500);};
  return(
    <Fr mode={mode}><Hdr mode={mode} title="Rapport médical" right={<IBtn icon="📜" label="Historique" mode={mode}/>}/>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px 90px"}}>
        <div style={{marginBottom:16}}><Sec mode={mode}>Période</Sec><div style={{display:"flex",gap:4,background:t.surfaceVar,borderRadius:10,padding:3}}>{[7,14,30,90].map(d=><button key={d} onClick={()=>setW(d)} style={{flex:1,padding:"7px 0",borderRadius:7,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:w===d?C.teal:"transparent",color:w===d?"white":t.text3,transition:"all .15s"}}>{d} j</button>)}</div></div>
        <div style={{marginBottom:16}}><Sec mode={mode}>Format</Sec><div style={{display:"flex",gap:8}}>{[{v:"text",i:"📄",l:"Texte"},{v:"pdf",i:"📋",l:"PDF"}].map(f=><button key={f.v} onClick={()=>setFmt(f.v)} style={{flex:1,padding:"11px 0",borderRadius:12,cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:fmt===f.v?tF.bg:t.cardBg,border:`${fmt===f.v?"1.5px":"0.5px"} solid ${fmt===f.v?tF.border:t.border}`,color:fmt===f.v?tF.text:t.text2}}>{f.i} {f.l}</button>)}</div></div>
        <div style={{marginBottom:16}}><button onClick={()=>setAiSum(a=>!a)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:t.cardBg,border:`0.5px solid ${t.border}`,borderRadius:12,cursor:"pointer",fontFamily:"inherit"}}><div style={{width:22,height:22,borderRadius:6,border:`2px solid ${aiSum?C.teal:t.chipBorder}`,background:aiSum?C.teal:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"white",fontSize:13,fontWeight:700}}>{aiSum?"✓":""}</div><div style={{flex:1,textAlign:"left"}}><div style={{fontSize:14,fontWeight:500,color:t.text1}}>Synthèse IA (Claude)</div><div style={{fontSize:11,color:t.text3,marginTop:1}}>~2 000 tokens · Clé API requise</div></div></button></div>
        {!done&&<button onClick={!gen?generate:undefined} style={{width:"100%",padding:"14px",borderRadius:12,background:gen?t.surfaceVar:C.teal,border:`0.5px solid ${gen?t.chipBorder:C.teal}`,color:gen?t.text3:"white",fontSize:15,fontWeight:700,cursor:gen?"default":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:16}}>{gen?<><div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${t.text3}`,borderTopColor:"transparent",animation:"spin .8s linear infinite"}}/>Génération en cours…</>:<>📄 Générer le rapport — {w} j</>}</button>}
        {done&&<Crd mode={mode} style={{marginBottom:16}}>
          <div style={{padding:"10px 14px",borderBottom:`0.5px solid ${t.borderSub}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:600,color:t.text1}}>Rapport · {w} jours</span><span style={{fontSize:11,color:t.text3}}>{new Date().toLocaleDateString("fr-FR")}</span></div>
          {aiSum&&<div style={{padding:"10px 14px",borderBottom:`0.5px solid ${t.borderSub}`,background:tF.bg}}><div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".6px",color:tF.text,marginBottom:5}}>✨ Synthèse IA</div><div style={{fontSize:12,color:t.text2,lineHeight:1.6}}>Corrélation forte entre oignon et symptômes digestifs (0.82). Observance satisfaisante pour Rifaximin. Phase d'élimination FODMAP stricte recommandée.</div></div>}
          {sects.map((sec,i)=><div key={i} style={{padding:"10px 14px",borderBottom:i<sects.length-1?`0.5px solid ${t.borderSub}`:"none"}}><div style={{fontSize:11,fontWeight:700,color:t.text4,textTransform:"uppercase",letterSpacing:".6px",marginBottom:3}}>{sec.ti}</div><div style={{fontSize:13,color:t.text2,lineHeight:1.5}}>{sec.c}</div></div>)}
          <div style={{padding:"10px 14px",display:"flex",gap:8,borderTop:`0.5px solid ${t.borderSub}`}}>
            {fmt==="pdf"&&<button style={{flex:1,padding:"9px 0",borderRadius:10,background:C.teal,color:"white",border:"none",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>⬇️ Télécharger PDF</button>}
            <button onClick={()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{flex:1,padding:"9px 0",borderRadius:10,background:t.surfaceVar,border:`0.5px solid ${t.chipBorder}`,color:t.text2,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{copied?"✓ Copié":"📋 Copier pour mon médecin"}</button>
          </div>
        </Crd>}
      </div>
      <Nav mode={mode} active="rapport" go={go}/>
    </Fr>
  );
}

/* ════════════════════════════════════════════════════════════
   SETTINGS
════════════════════════════════════════════════════════════ */
function Settings({mode,go}){
  const t=s(mode);const tF=fd("low",mode);
  return(
    <Fr mode={mode}><Hdr mode={mode} title="Paramètres"/>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px 90px"}}>
        <div style={{background:tF.bg,border:`0.5px solid ${tF.border}`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>✅</span><div><div style={{fontSize:12,fontWeight:600,color:tF.text}}>Clé API configurée</div><div style={{fontSize:11,color:t.text3}}>Claude IA disponible pour toutes les fonctions</div></div></div>
        <Crd mode={mode}>{SET_IT.map((item,i)=><button key={i} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:"none",border:"none",borderBottom:i<SET_IT.length-1?`0.5px solid ${t.borderSub}`:"none",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}><div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:t.surfaceVar,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{item.i}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:500,color:t.text1}}>{item.l}</div><div style={{fontSize:11,color:t.text3,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.d}</div></div><span style={{color:t.text4,fontSize:16,flexShrink:0}}>›</span></button>)}</Crd>
        <div style={{textAlign:"center",marginTop:20,fontSize:11,color:t.text4}}>FlowEase v1.0.0 · Propulsé par Claude (Anthropic)</div>
      </div>
      <Nav mode={mode} active="settings" go={go}/>
    </Fr>
  );
}

/* ════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════ */
export default function App(){
  const [mode,setMode]=useState("light");const [screen,setScreen]=useState("journal");const [mealMode,setMealMode]=useState("voice");const [symMode,setSymMode]=useState("form");
  const goMeal=m=>{setMealMode(m);setScreen("meal");};const goSym=m=>{setSymMode(m);setScreen("symptom");};const goJ=()=>setScreen("journal");
  const bg=mode==="dark"?"#0D0C0A":"#F1EFE8";const tc=mode==="dark"?"#4E4D48":"#888780";
  return(
    <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:14,minHeight:"100vh",background:bg,transition:"background .3s",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:390}}><span style={{fontSize:11,fontWeight:700,letterSpacing:".6px",textTransform:"uppercase",color:tc}}>FlowEase · Prototype complet</span><button onClick={()=>setMode(m=>m==="light"?"dark":"light")} style={{padding:"5px 14px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:mode==="dark"?"#1E1D1A":"white",border:`0.5px solid ${mode==="dark"?"#2E2D28":"#D3D1C7"}`,color:mode==="dark"?"#B8B6AE":"#5F5E5A"}}>{mode==="dark"?"☀️ Light":"🌙 Dark"}</button></div>
      {screen==="journal" && <JournalHome mode={mode} go={setScreen} goSub={(type,m)=>type==="meal"?goMeal(m):goSym(m)}/>}
      {screen==="meal"    && <MealEntry   mode={mode} srcMode={mealMode} onBack={goJ}/>}
      {screen==="symptom" && <SymptomEntry mode={mode} srcMode={symMode} onBack={goJ}/>}
      {screen==="intake"  && <IntakeEntry  mode={mode} onBack={goJ}/>}
      {screen==="note"    && <NoteEntry    mode={mode} onBack={goJ}/>}
      {screen==="analyse" && <Analysis     mode={mode} go={setScreen}/>}
      {screen==="rapport" && <Report       mode={mode} go={setScreen}/>}
      {screen==="coach"   && <CoachChat    mode={mode} go={setScreen}/>}
      {screen==="settings"&& <Settings     mode={mode} go={setScreen}/>}
      <div style={{fontSize:11,textAlign:"center",maxWidth:390,color:tc}}>Journal · Repas · Symptômes · Médicaments · Note · Analyse · Coach · Rapport · Paramètres</div>
    </div>
  );
}
