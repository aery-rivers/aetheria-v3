// ── AETHERIA CLIENT ───────────────────────────────────────────────
const ELEM_COLORS={pyro:0xFF4400,hydro:0x0088FF,cryo:0x88DDFF,electro:0xAA44FF,anemo:0x44FFAA,geo:0xFFAA00,dendro:0x44FF44};
const ELEM_HEX={pyro:'#FF4400',hydro:'#0088FF',cryo:'#88DDFF',electro:'#AA44FF',anemo:'#44FFAA',geo:'#FFAA00',dendro:'#44FF44'};
const CHAR_CFG={
  solara:{bodyCol:0xFF6644,hairCol:0xFFAA22,skinCol:0xFFD5B0,accentCol:0xFF4400,element:'pyro'},
  marina:{bodyCol:0x0066CC,hairCol:0x0044AA,skinCol:0xFFD5B0,accentCol:0x0088FF,element:'hydro'},
  kairos:{bodyCol:0x442288,hairCol:0x221144,skinCol:0xDDB890,accentCol:0xAA44FF,element:'electro'},
  frostine:{bodyCol:0x224466,hairCol:0x88CCFF,skinCol:0xF0E8FF,accentCol:0x88DDFF,element:'cryo'},
  zephyr:{bodyCol:0x224433,hairCol:0x44AA88,skinCol:0xFFD5B0,accentCol:0x44FFAA,element:'anemo'},
  terra:{bodyCol:0x554422,hairCol:0x332211,skinCol:0xCC9966,accentCol:0xFFAA00,element:'geo'},
  briar:{bodyCol:0x224422,hairCol:0x116611,skinCol:0xFFD5B0,accentCol:0x44FF44,element:'dendro'},
  rex:{bodyCol:0x662222,hairCol:0x441111,skinCol:0xCC9966,accentCol:0xFF6600,element:'pyro'},
  lyra:{bodyCol:0x3322AA,hairCol:0x1100CC,skinCol:0xFFD5B0,accentCol:0xAA44FF,element:'electro'},
  seraphine:{bodyCol:0x0055BB,hairCol:0x88CCFF,skinCol:0xFFE8E0,accentCol:0x0088FF,element:'hydro'},
  kael:{bodyCol:0x882200,hairCol:0x441100,skinCol:0xCC9966,accentCol:0xFF4400,element:'pyro'},
  voss:{bodyCol:0x224466,hairCol:0xAADDFF,skinCol:0xDDE8F0,accentCol:0x88DDFF,element:'cryo'},
  nara:{bodyCol:0x336622,hairCol:0x224411,skinCol:0xFFD5B0,accentCol:0x44FF44,element:'dendro'},
  gaius:{bodyCol:0x554422,hairCol:0x443311,skinCol:0xBB9966,accentCol:0xFFAA00,element:'geo'},
  mira:{bodyCol:0x225544,hairCol:0x44AA88,skinCol:0xFFD5B0,accentCol:0x44FFAA,element:'anemo'},
  raze:{bodyCol:0x662222,hairCol:0x441111,skinCol:0xCC9966,accentCol:0xFF6600,element:'electro'},
  flora:{bodyCol:0x224422,hairCol:0x116611,skinCol:0xFFD5B0,accentCol:0x44FF44,element:'dendro'},
  sol:{bodyCol:0x442288,hairCol:0x221144,skinCol:0xDDB890,accentCol:0xAA44FF,element:'electro'},
};

let ws=null,myId=null,playerName='';
let scene,camera,renderer2,clock;
let yaw=0,pitch=-0.15,camDist=6;
let velY=0,onGround=true,isClimbing=false,isGliding=false,isSwimming=false;
let playerX=0,playerY=0,playerZ=0;
let keys={};
let gameData=null,playerData=null;
let activeCharIdx=0,activeCharData=null;
let skillCds={skill:0,burst:0};
let burstEnergy=0,burstMaxEnergy=80;
let hp=10000,maxHp=10000,stamina=240,maxStamina=240;
let mora=10000,primogems=300,ar=1;
let lastAttack=0,sendTimer=0,camShakeAmt=0;
let dialogueLines=[],dialogueIdx=0;
let activeQuests=[],completedQuests=[],unlockedWaypoints=['wp_0'];
let enemyStates=[],myMesh=null;
const enemyMeshes={},chestMeshes={},crystalMeshes={},waypointMeshes={},playerMeshes={},worldObjects={};
const particles=[];
let timeOfDay=0.3,daySpeed=0.00008;
let sunLight,moonLight,ambientLight,hemiLight,skyMat,skyUniforms;
let isNight=false;
let inDomain=false,domainData=null,domainFloor=0,domainEnemiesLeft=0;
let domainScene=null,domainCamera=null;
let climbTarget=null,swimDepth=0,breathTimer=240;
const SWIM_SURFACES=[];
let audioCtx=null,masterGain=null,bgmNode=null,bgmGain=null;
let ambientNodes=[];

function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));const el=document.getElementById(id);if(el)el.classList.add('active');}
function startGame(){playerName=document.getElementById('name-input').value.trim()||'Traveller';showScreen('');document.getElementById('hud').classList.add('active');initThree();initAudio();connectWS();}

function initAudio(){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();masterGain=audioCtx.createGain();masterGain.gain.value=0.5;masterGain.connect(audioCtx.destination);bgmGain=audioCtx.createGain();bgmGain.gain.value=0.18;bgmGain.connect(masterGain);playBGM(false);}catch(e){console.warn('Audio unavailable');}}
function resumeAudio(){if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();}
function noise(dur=0.1){if(!audioCtx)return null;const buf=audioCtx.createBuffer(1,Math.ceil(audioCtx.sampleRate*dur),audioCtx.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=audioCtx.createBufferSource();s.buffer=buf;return s;}
function tone(freq,type='sine',dur=0.15,vol=0.2,detune=0,dest=null){if(!audioCtx)return;const osc=audioCtx.createOscillator(),g=audioCtx.createGain();osc.type=type;osc.frequency.value=freq;osc.detune.value=detune;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+dur);osc.connect(g);g.connect(dest||masterGain);osc.start();osc.stop(audioCtx.currentTime+dur);}
function sfxAttack(element){if(!audioCtx)return;resumeAudio();const freqs={pyro:220,hydro:440,cryo:660,electro:880,anemo:550,geo:180,dendro:330};const f=freqs[element]||330;tone(f,'sine',0.08,0.3);tone(f*1.5,'sine',0.06,0.15,200);const s=noise(0.06);if(!s)return;const g=audioCtx.createGain(),fl=audioCtx.createBiquadFilter();fl.type='bandpass';fl.frequency.value=f*2;g.gain.setValueAtTime(0.3,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.06);s.connect(fl);fl.connect(g);g.connect(masterGain);s.start();}
function sfxHit(){if(!audioCtx)return;resumeAudio();tone(150,'sawtooth',0.08,0.4,-200);const s=noise(0.05);if(!s)return;const g=audioCtx.createGain();g.gain.setValueAtTime(0.2,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.05);s.connect(g);g.connect(masterGain);s.start();}
function sfxLoot(){if(!audioCtx)return;resumeAudio();[523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,'sine',0.15,0.2),i*60));}
function sfxLevelUp(){if(!audioCtx)return;resumeAudio();[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,'sine',0.2,0.25),i*80));}
function sfxQuestComplete(){if(!audioCtx)return;resumeAudio();[440,550,660,880,1100].forEach((f,i)=>setTimeout(()=>tone(f,'sine',0.25,0.2),i*100));}
function sfxWaypointUnlock(){if(!audioCtx)return;resumeAudio();[330,440,550,660,880].forEach((f,i)=>setTimeout(()=>tone(f,'sine',0.3,0.18),i*80));}
function sfxDomainEnter(){if(!audioCtx)return;resumeAudio();[220,277,330,440].forEach((f,i)=>setTimeout(()=>tone(f,'sawtooth',0.4,0.15,-100),i*120));}

function playBGM(night=false){if(!audioCtx||!bgmGain)return;stopBGM();const notes=night?[220,277,330,415,493]:[261,329,392,493,587];const bgmNodes=[];notes.forEach((freq,i)=>{const osc=audioCtx.createOscillator(),g=audioCtx.createGain();osc.type=i%2===0?'sine':'triangle';osc.frequency.value=freq*(1+i*0.002);osc.detune.value=(Math.random()-.5)*8;g.gain.value=0.06/(i+1);const lfo=audioCtx.createOscillator(),lfoG=audioCtx.createGain();lfo.frequency.value=0.3+i*0.1;lfoG.gain.value=0.015;lfo.connect(lfoG);lfoG.connect(g.gain);osc.connect(g);g.connect(bgmGain);osc.start();lfo.start();bgmNodes.push(osc,lfo,g,lfoG);});const bass=audioCtx.createOscillator(),bassG=audioCtx.createGain();bass.type='sine';bass.frequency.value=night?55:65;bassG.gain.value=0.04;bass.connect(bassG);bassG.connect(bgmGain);bass.start();bgmNodes.push(bass,bassG);bgmNode=bgmNodes;}
function stopBGM(){if(!bgmNode)return;bgmNode.forEach(n=>{try{n.stop&&n.stop();n.disconnect&&n.disconnect();}catch(e){}});bgmNode=null;}
function startAmbient(night){stopAmbient();if(!audioCtx)return;const w=noise(3);if(!w)return;w.loop=true;const wg=audioCtx.createGain(),wf=audioCtx.createBiquadFilter();wf.type='bandpass';wf.frequency.value=night?150:350;wf.Q.value=0.4;wg.gain.value=night?0.06:0.03;w.connect(wf);wf.connect(wg);wg.connect(masterGain);w.start();ambientNodes.push(w,wg,wf);}
function stopAmbient(){ambientNodes.forEach(n=>{try{n.stop&&n.stop();n.disconnect&&n.disconnect();}catch(e){}});ambientNodes=[];}

function connectWS(){const proto=location.protocol==='https:'?'wss':'ws';ws=new WebSocket(`${proto}://${location.host}`);ws.onopen=()=>ws.send(JSON.stringify({type:'init',name:playerName}));ws.onmessage=ev=>{try{handleMsg(JSON.parse(ev.data));}catch(e){console.warn('WS parse error',e);}};ws.onclose=()=>showAnnounce('Disconnected — reload to reconnect');ws.onerror=e=>console.warn('WS error',e);}
function send(msg){if(ws&&ws.readyState===1)ws.send(JSON.stringify(msg));}

function handleMsg(msg){
  switch(msg.type){
    case 'initOk': onInitOk(msg); break;
    case 'init': onInit(msg); break;
    case 'worldEntered': onWorldEntered(msg); break;
    case 'worldState': onWorldState(msg); break;
    case 'damage': onDamage(msg); break;
    case 'playerDead': onPlayerDead(); break;
    case 'respawned': onRespawned(msg); break;
    case 'healed': hp=Math.min(maxHp,msg.hp||hp);updateHPUI();break;
    case 'enemyHit': onEnemyHit(msg); break;
    case 'enemyDead': onEnemyDead(msg); break;
    case 'reaction': onReaction(msg); break;
    case 'charSwapped': onCharSwapped(msg); break;
    case 'charSwitched': onCharSwitched(msg); break;
    case 'wishResults': onWishResults(msg); break;
    case 'gachaResults': onGachaResults(msg); break;
    case 'moraGain': mora=msg.mora;document.getElementById('mora-val').textContent=mora.toLocaleString();break;
    case 'chestOpened': onChestOpened(msg); break;
    case 'chestNearby': showInteract(`Press F — ${msg.quality} chest`);break;
    case 'crystalCollected': onCrystalCollected(msg); break;
    case 'npcDialogue': openDialogue(msg); break;
    case 'questProgress': renderQuestTracker();break;
    case 'questComplete': onQuestComplete(msg); break;
    case 'questAssigned': activeQuests.push(msg.quest);renderQuestTracker();showAnnounce(`New Quest: ${msg.quest.title}`);break;
    case 'waypointUnlocked': onWaypointUnlocked(msg); break;
    case 'teleported': onTeleported(msg); break;
    case 'rankUp': case 'arLevelUp': ar=msg.rank||msg.adventureRank||ar;document.getElementById('ar-val').textContent=ar;showAnnounce(`Adventure Rank ${ar}!`);sfxLevelUp();break;
    case 'charLevelUp': case 'charUpgraded': showAnnounce(`${msg.charId} → Lv.${msg.charData?.level||'?'}`);break;
    case 'partyUpdated': if(playerData)playerData.party=msg.party;renderPartyBar();break;
    case 'inventoryUpdate': if(playerData&&msg.inventory){playerData.inventory=msg.inventory;mora=msg.inventory.mora||mora;primogems=msg.inventory.primogems||primogems;document.getElementById('mora-val').textContent=mora.toLocaleString();document.getElementById('primo-val').textContent=primogems.toLocaleString();}break;
    case 'attackResult': if(msg.damage)spawnDamageNumber(msg.damage,msg.crit,msg.element);break;
  }
}

function onInitOk(msg){
  const p=msg.player; myId=p.id;
  const worldData=generateClientWorldData();
  const characters=Object.values(msg.characters||{}).map(ch=>({id:ch.id,name:ch.name,rarity:ch.rarity||4,element:ch.element,weapon:ch.weapon,hp:ch.baseHP||8000,skill:{name:ch.skills?.skill?.name||'Skill',cost:ch.skills?.skill?.cd||8000},burst:{name:ch.skills?.burst?.name||'Burst',cost:ch.skills?.burst?.cost||80}}));
  playerData={id:p.id,name:p.name,mora:p.inventory?.mora??p.mora??10000,primogems:p.inventory?.primogems??p.primogems??300,adventureRank:p.adventureRank||1,party:(p.team||['lyra',null,null,null]).slice(0,4),roster:p.roster||['lyra'],charData:p.charData||{},activeQuests:p.activeQuests||[],completedQuests:p.completedQuests||[],unlockedWaypoints:['wp_0'],pity5:p.gachaPity?.standard?.count||0,pity4:0};
  gameData={playerId:p.id,playerData,characters,worldData};
  mora=playerData.mora; primogems=playerData.primogems; ar=playerData.adventureRank;
  activeQuests=playerData.activeQuests; unlockedWaypoints=playerData.unlockedWaypoints;
  document.getElementById('mora-val').textContent=mora.toLocaleString();
  document.getElementById('primo-val').textContent=primogems.toLocaleString();
  document.getElementById('ar-val').textContent=ar;
  buildWorld(worldData); initWeather(); setActiveChar(0); renderPartyBar(); renderQuestTracker();
  playerX=0;playerY=2;playerZ=0;
  showAnnounce('Welcome to Aetheria'); startAmbient(false); playBGM(false);
}

function generateClientWorldData(){
  const rng=(()=>{let s=99887;return()=>{s=(s*1664525+1013904223)&0xffffffff;return(s>>>0)/0xffffffff;};})();
  const objects=[];
  for(let i=0;i<180;i++){const t=rng()<0.6?'tree':rng()<0.5?'rock':'flower';objects.push({type:t,x:(rng()-.5)*500,z:(rng()-.5)*500,scale:0.7+rng()*.8,rot:rng()*Math.PI*2});}
  return{objects,chests:[{id:'c1',x:18,z:12,quality:'common'},{id:'c2',x:-35,z:28,quality:'exquisite'},{id:'c3',x:60,z:-45,quality:'common'},{id:'c4',x:-80,z:60,quality:'precious'},{id:'c5',x:120,z:30,quality:'common'}],crystals:[{id:'cr1',x:25,z:-18,element:'pyro'},{id:'cr2',x:-40,z:35,element:'hydro'},{id:'cr3',x:55,z:50,element:'electro'},{id:'cr4',x:-60,z:-40,element:'cryo'},{id:'cr5',x:10,z:80,element:'anemo'}],npcs:[{id:'elder',name:'Elder Voss',x:8,z:5},{id:'merchant',name:'Merchant',x:-12,z:8},{id:'guard',name:'Guard',x:15,z:-5}],waypoints:[{id:'wp_0',name:'Aetheria Plains',x:0,z:0},{id:'wp_1',name:'Windveil Village',x:-120,z:30},{id:'wp_2',name:'Stoneback Ridge',x:180,z:-60},{id:'wp_3',name:'Starfall Hollow',x:0,z:-200}],domains:[{id:'domain_1',name:'Domain of Forsaken Ruins',level:1,x:80,z:-80},{id:'domain_2',name:'Cecilia Garden',level:2,x:-150,z:-100}]};
}

function onCharSwitched(msg){if(!playerData||!gameData)return;const idx=playerData.party.indexOf(msg.charId);if(idx>=0){activeCharIdx=idx;setActiveChar(idx);showAnnounce(`→ ${msg.charId}`);}}
function onGachaResults(msg){const results=(msg.results||[]).map(r=>({rarity:r.rarity||3,charId:r.charId||null,isNew:r.isNew||false,charData:r.charId&&gameData?.characters?gameData.characters.find(c=>c.id===r.charId):null}));primogems=msg.inventory?.primogems??primogems;if(playerData){playerData.pity5=msg.pity?.standard?.count||0;if(msg.inventory)playerData.inventory=msg.inventory;}document.getElementById('primo-val').textContent=primogems.toLocaleString();closeMenu('gacha-menu');const el=document.getElementById('gacha-result');el.classList.add('show');document.getElementById('gacha-pity-info').textContent=`Pity: ${playerData?.pity5||0}/90 (5★)`;const cards=document.getElementById('result-cards');cards.innerHTML='';results.forEach((r,i)=>{const div=document.createElement('div');div.className=`result-card r${r.rarity}`;div.style.animationDelay=(i*.1)+'s';const cfg=r.charId?CHAR_CFG[r.charId]:null;div.innerHTML=`<canvas id="rc-${i}" width="92" height="115"></canvas>${r.isNew?'<div class="rc-new">NEW</div>':''}<div class="rc-name">${r.charData?.name||r.charId||'Enhancement Ore'}</div><div class="rc-stars" style="color:${r.rarity===5?'#FFD700':r.rarity===4?'#AA88FF':'#8888aa'}">${'★'.repeat(r.rarity)}</div>`;cards.appendChild(div);if(cfg)setTimeout(()=>drawResultCard(document.getElementById('rc-'+i),cfg,r.rarity),80+i*100);});}

function onInit(msg){myId=msg.playerId;gameData=msg;playerData=msg.playerData;mora=msg.playerData.mora;primogems=msg.playerData.primogems;ar=msg.playerData.adventureRank;activeQuests=msg.playerData.activeQuests||[];unlockedWaypoints=msg.playerData.unlockedWaypoints||['wp_0'];document.getElementById('mora-val').textContent=mora.toLocaleString();document.getElementById('primo-val').textContent=primogems.toLocaleString();document.getElementById('ar-val').textContent=ar;buildWorld(msg.worldData);initWeather();setActiveChar(0);renderPartyBar();renderQuestTracker();send({type:'enterWorld'});startAmbient(false);playBGM(false);}
function onWorldEntered(msg){playerX=msg.x;playerY=msg.y;playerZ=msg.z;showAnnounce('Welcome to Aetheria');}
function onWorldState(msg){enemyStates=msg.enemies||[];updateEnemyMeshes(msg.enemies);updatePlayerMeshes(msg.players||[]);}
function onDamage(msg){hp=Math.max(0,hp-msg.amount);updateHPUI();camShakeAmt=0.5;sfxHit();showAnnounce(`-${Math.round(msg.amount)} HP from ${msg.from}`);}
function onPlayerDead(){document.getElementById('death-overlay').classList.add('show');}
function onRespawned(msg){hp=msg.hp;playerX=msg.x;playerY=msg.y;playerZ=msg.z;document.getElementById('death-overlay').classList.remove('show');updateHPUI();}
function onEnemyHit(msg){sfxHit();const m=enemyMeshes[msg.enemyId];if(m&&m._hpSprite)updateHpBar3D(m._hpSprite,msg.hp,msg.maxHp);spawnDamageNumber(msg.dmg,msg.crit,msg.element);document.getElementById('crosshair')?.classList.add('hit');setTimeout(()=>document.getElementById('crosshair')?.classList.remove('hit'),120);}
function onEnemyDead(msg){if(enemyMeshes[msg.enemyId]){scene.remove(enemyMeshes[msg.enemyId]);delete enemyMeshes[msg.enemyId];}spawnDeathBurst(msg.x,msg.z,msg.element);showAnnounce(`+${msg.mora} Mora`);if(inDomain){domainEnemiesLeft--;if(domainEnemiesLeft<=0)onDomainFloorClear();}}
function onReaction(msg){showReactionPopup(msg.name,msg.color);const m=enemyMeshes[msg.enemyId];if(m)spawnReactionEffect(m.position,msg.color);}
function onCharSwapped(msg){activeCharIdx=msg.idx;hp=msg.hp;maxHp=msg.maxHp;setActiveChar(msg.idx);updateHPUI();showAnnounce(`→ ${msg.charId}`);}
function onChestOpened(msg){mora=msg.mora;primogems=msg.primogems;document.getElementById('mora-val').textContent=mora.toLocaleString();document.getElementById('primo-val').textContent=primogems.toLocaleString();if(chestMeshes[msg.chestId]){scene.remove(chestMeshes[msg.chestId]);delete chestMeshes[msg.chestId];}sfxLoot();showAnnounce('Chest opened! '+Object.entries(msg.rewards).map(([k,v])=>`${v}x ${k.replace(/_/g,' ')}`).join(', '));}
function onCrystalCollected(msg){if(crystalMeshes[msg.crystalId]){scene.remove(crystalMeshes[msg.crystalId]);delete crystalMeshes[msg.crystalId];}sfxLoot();showAnnounce('+1 Elemental Fragment');}
function onQuestComplete(msg){completedQuests.push(msg.questId);mora=msg.mora||mora;primogems=msg.primogems||primogems;document.getElementById('mora-val').textContent=mora.toLocaleString();document.getElementById('primo-val').textContent=primogems.toLocaleString();sfxQuestComplete();showAnnounce(`✦ Quest complete: ${msg.title}`);}
function onWaypointUnlocked(msg){unlockedWaypoints.push(msg.waypointId);const m=waypointMeshes[msg.waypointId];if(m)m.traverse(c=>{if(c.material?.color)c.material.color.setHex(0x44ddff);});sfxWaypointUnlock();showAnnounce(`Waypoint: ${msg.name}`);}
function onTeleported(msg){playerX=msg.x;playerY=msg.y;playerZ=msg.z;if(myMesh)myMesh.position.set(playerX,playerY,playerZ);showAnnounce(`→ ${msg.name}`);}

const cvs=document.getElementById('gc');
function initThree(){renderer2=new THREE.WebGLRenderer({canvas:cvs,antialias:true});renderer2.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer2.setSize(window.innerWidth,window.innerHeight);renderer2.shadowMap.enabled=true;renderer2.shadowMap.type=THREE.PCFSoftShadowMap;renderer2.toneMapping=THREE.ACESFilmicToneMapping;renderer2.toneMappingExposure=1.1;scene=new THREE.Scene();scene.fog=new THREE.Fog(0x87ceeb,60,200);camera=new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.1,600);clock=new THREE.Clock();buildLighting();buildSky();window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer2.setSize(window.innerWidth,window.innerHeight);});cvs.addEventListener('click',()=>{if(!isMenuOpen())cvs.requestPointerLock();});document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==cvs)return;yaw-=e.movementX*0.003;pitch-=e.movementY*0.002;pitch=Math.max(-0.8,Math.min(0.6,pitch));});document.addEventListener('mousedown',e=>{if(e.button===0&&document.pointerLockElement===cvs){resumeAudio();doAttack(0);}});document.addEventListener('wheel',e=>{camDist=Math.max(2,Math.min(14,camDist+e.deltaY*0.01));});document.addEventListener('keydown',onKey);document.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);animate();}
function isMenuOpen(){return['char-menu','gacha-menu'].some(id=>document.getElementById(id)?.classList.contains('open'));}

function buildLighting(){hemiLight=new THREE.HemisphereLight(0x87ceeb,0x3a6a2a,0.8);scene.add(hemiLight);sunLight=new THREE.DirectionalLight(0xfff8e0,1.6);sunLight.position.set(80,120,40);sunLight.castShadow=true;sunLight.shadow.mapSize.set(2048,2048);sunLight.shadow.camera.left=-100;sunLight.shadow.camera.right=100;sunLight.shadow.camera.top=100;sunLight.shadow.camera.bottom=-100;sunLight.shadow.camera.far=400;sunLight.shadow.bias=-0.0003;scene.add(sunLight);moonLight=new THREE.DirectionalLight(0x334466,0.0);moonLight.position.set(-80,100,-60);scene.add(moonLight);ambientLight=new THREE.AmbientLight(0x334433,0.3);scene.add(ambientLight);}

function buildSky(){const skyGeo=new THREE.SphereGeometry(480,32,16);skyUniforms={topColor:{value:new THREE.Color(0x4488cc)},bottomColor:{value:new THREE.Color(0x88ccee)},sunPos:{value:new THREE.Vector3(0,1,0)}};skyMat=new THREE.ShaderMaterial({uniforms:skyUniforms,side:THREE.BackSide,vertexShader:`varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform vec3 topColor,bottomColor,sunPos;varying vec3 vPos;void main(){float h=normalize(vPos).y;vec3 sky=mix(bottomColor,topColor,max(h,0.));vec3 dir=normalize(vPos);float sun=max(dot(dir,normalize(sunPos)),0.);sky+=vec3(1.,.8,.4)*pow(sun,64.)*0.8;gl_FragColor=vec4(sky,1.);}`});scene.add(new THREE.Mesh(skyGeo,skyMat));const starGeo=new THREE.BufferGeometry();const starPos=new Float32Array(2000*3);for(let i=0;i<2000;i++){const a=Math.random()*Math.PI*2,b=Math.acos(Math.random()*2-1),r=450;starPos[i*3]=r*Math.sin(b)*Math.cos(a);starPos[i*3+1]=r*Math.cos(b);starPos[i*3+2]=r*Math.sin(b)*Math.sin(a);}starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));const starMesh=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:0.5,transparent:true,opacity:0}));starMesh.name='stars';scene.add(starMesh);const cloudMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.75});for(let i=0;i<14;i++){const g=new THREE.Group();for(let j=0;j<4+Math.floor(Math.random()*3);j++){const c=new THREE.Mesh(new THREE.SphereGeometry(7+Math.random()*5,7,5),cloudMat);c.position.set((Math.random()-.5)*22,(Math.random()-.5)*4,(Math.random()-.5)*14);c.scale.y=0.4;g.add(c);}const angle=Math.random()*Math.PI*2,r=60+Math.random()*90;g.position.set(Math.cos(angle)*r,55+Math.random()*30,Math.sin(angle)*r);g._drift=0.00015+Math.random()*0.0002;scene.add(g);worldObjects['cloud_'+i]=g;}}

function updateDayNight(dt){timeOfDay=(timeOfDay+daySpeed)%1;const t=timeOfDay;const wasNight=isNight;const dayFactor=Math.max(0,Math.sin(t*Math.PI*2-Math.PI/2));isNight=dayFactor<0.15;const sunAngle=t*Math.PI*2;const sunX=Math.cos(sunAngle)*200,sunY=Math.sin(sunAngle)*200;sunLight.position.set(sunX,sunY,80);skyUniforms.sunPos.value.set(sunX,sunY,80);if(isNight){skyUniforms.topColor.value.set(0x020510);skyUniforms.bottomColor.value.set(0x080f08);scene.fog.color.set(0x020508);scene.fog.far=120;sunLight.intensity=0;moonLight.intensity=0.5;ambientLight.intensity=0.1;hemiLight.intensity=0.15;hemiLight.color.set(0x040820);renderer2.toneMappingExposure=0.6;}else if(t>0.2&&t<0.3||t>0.7&&t<0.8){const g=t<0.5?(t-0.2)/0.1:(0.8-t)/0.1;skyUniforms.topColor.value.set(0xff6633).lerp(new THREE.Color(0x4488cc),Math.min(1,g));skyUniforms.bottomColor.value.set(0xff9944).lerp(new THREE.Color(0x88ccee),Math.min(1,g));scene.fog.color.set(0xee7733);sunLight.intensity=1.0*dayFactor;sunLight.color.set(0xff8844);moonLight.intensity=0;ambientLight.intensity=0.3;hemiLight.intensity=0.4;renderer2.toneMappingExposure=1.0;}else{skyUniforms.topColor.value.set(0x4488cc);skyUniforms.bottomColor.value.set(0x88ccee);scene.fog.color.set(0x87ceeb);scene.fog.far=200;sunLight.intensity=1.6*dayFactor;sunLight.color.set(0xfff8e0);moonLight.intensity=0;ambientLight.intensity=0.3;hemiLight.intensity=0.8;hemiLight.color.set(0x87ceeb);renderer2.toneMappingExposure=1.1;}const stars=scene.getObjectByName('stars');if(stars)stars.material.opacity=isNight?0.8:0;if(isNight!==wasNight){stopBGM();stopAmbient();playBGM(isNight);startAmbient(isNight);showAnnounce(isNight?'Night falls upon Aetheria...':'Dawn breaks over Aetheria');}}

const rngW=(()=>{let s=12345;return()=>{s=(s*1664525+1013904223)&0xffffffff;return(s>>>0)/0xffffffff;};})();
function buildWorld(wd){if(!wd)return;const geo=new THREE.PlaneGeometry(800,800,100,100);const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getY(i);const h=Math.sin(x*0.018)*Math.cos(z*0.018)*9+Math.sin(x*0.046+1.2)*Math.cos(z*0.032+0.8)*4+Math.sin(x*0.1+2)*Math.cos(z*0.08+1)*1.5+(rngW()*.3-.15);pos.setZ(i,h);}geo.computeVertexNormals();const colors=new Float32Array(pos.count*3);for(let i=0;i<pos.count;i++){const h=pos.getZ(i);let r,g,b;if(h>6){r=0.55;g=0.52;b=0.42;}else if(h>3){r=0.32;g=0.50;b=0.22;}else if(h>0){r=0.28;g=0.48;b=0.18;}else{r=0.22;g=0.38;b=0.14;}colors[i*3]=r;colors[i*3+1]=g;colors[i*3+2]=b;}geo.setAttribute('color',new THREE.BufferAttribute(colors,3));const ground=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.94,metalness:0.02}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);const grassColors=[0x5a9a32,0x4a8a28,0x6aaa3a,0x3a7820];for(let i=0;i<280;i++){const gm=new THREE.MeshStandardMaterial({color:grassColors[Math.floor(rngW()*grassColors.length)],roughness:1});const p=new THREE.Mesh(new THREE.PlaneGeometry(4+rngW()*5,4+rngW()*5),gm);p.rotation.x=-Math.PI/2;p.position.set((rngW()-.5)*600,.02,(rngW()-.5)*600);scene.add(p);}[[-120,30],[180,-60],[0,-200]].forEach(([x,z])=>{const r=22+rngW()*14;const waterMat=new THREE.MeshStandardMaterial({color:0x0077bb,roughness:0.05,metalness:0.4,transparent:true,opacity:0.84});const w=new THREE.Mesh(new THREE.CircleGeometry(r,28),waterMat);w.rotation.x=-Math.PI/2;w.position.set(x,-0.45,z);scene.add(w);SWIM_SURFACES.push({x,z,r,y:-0.5});});wd.objects?.forEach(obj=>{let mesh=obj.type==='tree'?buildTree(obj.scale):obj.type==='rock'?buildRock(obj.scale):buildFlower();if(mesh){mesh.position.set(obj.x,getGroundHeight(obj.x,obj.z),obj.z);mesh.rotation.y=obj.rot||0;scene.add(mesh);}});wd.chests?.forEach(chest=>{const cols={precious:0xFFD700,exquisite:0xAA88FF,common:0x8B6914};const col=cols[chest.quality]||0x8B6914;const cg=new THREE.Group();const base=new THREE.Mesh(new THREE.BoxGeometry(.8,.45,.6),new THREE.MeshStandardMaterial({color:0x5a3a10,roughness:.7,metalness:.2}));base.position.y=.225;cg.add(base);const lid=new THREE.Mesh(new THREE.BoxGeometry(.82,.22,.62),new THREE.MeshStandardMaterial({color:col,roughness:.5,metalness:.4}));lid.position.y=.56;cg.add(lid);cg.position.set(chest.x,.0,chest.z);cg._chestId=chest.id;scene.add(cg);chestMeshes[chest.id]=cg;const l=new THREE.PointLight(col,1.2,5);l.position.set(chest.x,1.2,chest.z);scene.add(l);});wd.crystals?.forEach(crystal=>{const col=ELEM_COLORS[crystal.element]||0xffffff;const g=new THREE.Group();const core=new THREE.Mesh(new THREE.OctahedronGeometry(.38,0),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.7,roughness:.15,metalness:.6}));core.position.y=.9;const light=new THREE.PointLight(col,1.2,6);light.position.y=.9;g.add(core,light);g.position.set(crystal.x,0,crystal.z);g._crystalId=crystal.id;g._core=core;scene.add(g);crystalMeshes[crystal.id]=g;});wd.npcs?.forEach(npc=>{const m=buildNPC(npc);m.position.set(npc.x,0,npc.z);scene.add(m);});wd.waypoints?.forEach(wp=>{const m=buildWaypoint(unlockedWaypoints.includes(wp.id));m.position.set(wp.x,0,wp.z);m._wpId=wp.id;m._wpName=wp.name;scene.add(m);waypointMeshes[wp.id]=m;});wd.domains?.forEach(domain=>{const g=new THREE.Group();const orb=new THREE.Mesh(new THREE.SphereGeometry(1.4,14,10),new THREE.MeshStandardMaterial({color:0x4488ff,emissive:0x2244cc,emissiveIntensity:1.0}));orb.position.y=9.5;g.add(orb);const l1=new THREE.PointLight(0x4488ff,2.5,18);l1.position.y=9.5;g.add(l1);g.position.set(domain.x,0,domain.z);g._domainId=domain.id;g._domainName=domain.name;g._domainLevel=domain.level;scene.add(g);});buildRuins();}

function buildTree(scale=1){const g=new THREE.Group();const h=(3.5+rngW()*3.5)*scale;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.1*scale,.28*scale,h,9),new THREE.MeshStandardMaterial({color:0x3a1e0a,roughness:.95}));trunk.position.y=h/2;trunk.castShadow=true;g.add(trunk);const greens=[0x1e5c0e,0x2a7018,0x187025,0x3a8c1a,0x245a10];const layers=2+Math.floor(rngW()*2);for(let l=0;l<layers;l++){const layerR=(1.6-l*.28+rngW()*.5)*scale;const layerY=h+l*layerR*.65-(layers-1)*layerR*.3;const col=greens[Math.floor(rngW()*greens.length)];const f=new THREE.Mesh(new THREE.SphereGeometry(layerR,8,6),new THREE.MeshToonMaterial({color:col}));f.position.set((rngW()-.5)*.4*scale,layerY,(rngW()-.5)*.4*scale);f.castShadow=true;g.add(f);}return g;}
function buildRock(scale=1){const g=new THREE.Group();const mat=new THREE.MeshStandardMaterial({color:0x5a5848,roughness:.92,metalness:.05});const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.55*scale,0),mat);m.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*.5);m.position.y=.22*scale;m.castShadow=true;g.add(m);return g;}
function buildFlower(){const g=new THREE.Group();const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.03,.45,5),new THREE.MeshToonMaterial({color:0x2a7018}));stem.position.y=.225;g.add(stem);const petalCols=[0xff88aa,0xffdd44,0xaa88ff,0xff7744,0x88ddff,0xffaa55];const col=petalCols[Math.floor(rngW()*petalCols.length)];const ctr=new THREE.Mesh(new THREE.SphereGeometry(.055,6,6),new THREE.MeshToonMaterial({color:0xffee44}));ctr.position.y=.5;g.add(ctr);return g;}
function buildNPC(npc){const g=new THREE.Group();const bodyCol=[0x4466aa,0x6644aa,0x22884a,0x884422][npc.id.length%4]||0x4466aa;const body=new THREE.Mesh(new THREE.CylinderGeometry(.28,.34,1.1,10),new THREE.MeshToonMaterial({color:bodyCol}));body.position.y=.75;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.25,10,10),new THREE.MeshToonMaterial({color:0xFFD5B0}));head.position.y=1.6;g.add(head);const lbl=makeSprite(npc.name,'#f0d080',2.2);lbl.position.y=2.4;g.add(lbl);g._npcId=npc.id;return g;}
function buildWaypoint(unlocked){const col=unlocked?0x44ddff:0x994444;const g=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,2.6,8),new THREE.MeshStandardMaterial({color:col,metalness:.85,roughness:.2}));pole.position.y=1.45;g.add(pole);const tip=new THREE.Mesh(new THREE.OctahedronGeometry(.28,0),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.0,roughness:.1,metalness:.6}));tip.position.y=2.85;g.add(tip);const l=new THREE.PointLight(col,unlocked?2.2:0.8,unlocked?10:5);l.position.y=2.7;g.add(l);return g;}
function buildRuins(){const mat=new THREE.MeshStandardMaterial({color:0x8a8870,roughness:.95});for(let i=0;i<14;i++){const rx=(rngW()-.5)*460,rz=(rngW()-.5)*460;const w=new THREE.Mesh(new THREE.BoxGeometry(1+rngW()*2.5,.5+rngW()*2.5,.5),mat);w.position.set(rx,rngW()*.8,rz);w.rotation.y=rngW()*Math.PI;w.castShadow=true;scene.add(w);}}

let weather='clear',weatherTimer=120,rainGeo=null,rainParticles=null;
const WEATHERS=['clear','clear','clear','rain','rain','storm','fog','clear'];
function initWeather(){const count=1800;rainGeo=new THREE.BufferGeometry();const pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*80;pos[i*3+1]=Math.random()*35;pos[i*3+2]=(Math.random()-.5)*80;}rainGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));rainParticles=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0x88aacc,size:.06,transparent:true,opacity:.55}));rainParticles.visible=false;scene.add(rainParticles);}
function updateWeather(dt){weatherTimer-=dt;if(weatherTimer<=0){weather=WEATHERS[Math.floor(Math.random()*WEATHERS.length)];weatherTimer=60+Math.random()*90;applyWeather();if(weather!=='clear')showAnnounce(`Weather: ${weather.toUpperCase()}`);}if(rainParticles?.visible){const pos=rainGeo.attributes.position.array;const isStorm=weather==='storm';for(let i=0;i<pos.length;i+=3){pos[i+1]-=isStorm?.9:.45;if(pos[i+1]<0){pos[i+1]=35;pos[i]=(Math.random()-.5)*80;pos[i+2]=(Math.random()-.5)*80;}}rainGeo.attributes.position.needsUpdate=true;rainParticles.position.set(playerX,playerY,playerZ);}}
function applyWeather(){if(!rainParticles)return;rainParticles.visible=weather==='rain'||weather==='storm';if(weather==='fog'){scene.fog.far=40;}else if(weather==='clear'){scene.fog.far=isNight?120:200;}}
