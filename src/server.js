const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
app.use(express.static(path.join(__dirname, '../public')));

const ELEMENTS = {
  pyro:    { color:0xFF6B35, name:'Pyro',     icon:'🔥' },
  hydro:   { color:0x4FC3F7, name:'Hydro',    icon:'💧' },
  cryo:    { color:0xB3E5FC, name:'Cryo',     icon:'❄️' },
  electro: { color:0xCE93D8, name:'Electro',  icon:'⚡' },
  anemo:   { color:0x80CBC4, name:'Anemo',    icon:'🌀' },
  geo:     { color:0xFFCC02, name:'Geo',      icon:'⛰️' },
  dendro:  { color:0xAED581, name:'Dendro',   icon:'🌿' },
};

const REACTIONS = {
  'pyro+hydro':    { name:'Vaporize',    mult:1.5, color:0xFF9800 },
  'hydro+pyro':    { name:'Vaporize',    mult:2.0, color:0xFF9800 },
  'pyro+cryo':     { name:'Melt',        mult:1.5, color:0xFF5722 },
  'cryo+pyro':     { name:'Melt',        mult:2.0, color:0xFF5722 },
  'electro+hydro': { name:'Electro-Charged', mult:1.2, color:0x9C27B0 },
  'hydro+electro': { name:'Electro-Charged', mult:1.2, color:0x9C27B0 },
  'cryo+electro':  { name:'Superconduct', mult:0.5, color:0x7986CB },
  'pyro+electro':  { name:'Overloaded',  mult:2.0, color:0xFF3D00 },
  'anemo+pyro':    { name:'Swirl',       mult:0.6, color:0xFF6B35 },
  'anemo+hydro':   { name:'Swirl',       mult:0.6, color:0x4FC3F7 },
  'anemo+cryo':    { name:'Swirl',       mult:0.6, color:0xB3E5FC },
  'anemo+electro': { name:'Swirl',       mult:0.6, color:0xCE93D8 },
  'geo+any':       { name:'Crystallize', mult:1.0, color:0xFFCC02 },
  'dendro+hydro':  { name:'Bloom',       mult:1.5, color:0x8BC34A },
  'dendro+electro':{ name:'Quicken',     mult:1.3, color:0xC5E1A5 },
  'dendro+pyro':   { name:'Burning',     mult:0.5, color:0xFF6F00 },
};

const CHARACTERS = {
  lyra: { id:'lyra', name:'Lyra', rarity:5, element:'electro', weapon:'sword', description:'A wandering swordswoman who commands the power of lightning.', baseHP:10000, baseATK:250, baseDEF:600, skills: { normal:{ name:'Thunderstrike', dmgMult:1.0, element:'electro', cd:0, cost:0, type:'melee', range:2.5 }, skill:{ name:'Lightning Step', dmgMult:2.2, element:'electro', cd:8000, cost:0, type:'dash_atk', range:4.0 }, burst:{ name:'Thunderfall', dmgMult:5.0, element:'electro', cd:20000, cost:80, type:'aoe', range:8.0 } }, passives:['Every 3rd normal attack deals 20% bonus Electro DMG','Reduces party stamina consumption by 20%'], constellations:6 },
  seraphine: { id:'seraphine', name:'Seraphine', rarity:5, element:'hydro', weapon:'catalyst', description:'A gentle healer who channels the healing waters of the sea.', baseHP:12000, baseATK:180, baseDEF:700, skills: { normal:{ name:'Tidal Bolt', dmgMult:0.8, element:'hydro', cd:0, cost:0, type:'projectile', range:15 }, skill:{ name:'Healing Mist', dmgMult:0, element:'hydro', cd:10000, cost:0, type:'heal', range:6 }, burst:{ name:'Sacred Tide', dmgMult:3.0, element:'hydro', cd:20000, cost:80, type:'aoe_heal', range:10 } }, passives:['Skill heals party for 15% max HP','Burst creates a Hydro field for 10s'], constellations:6 },
  kael: { id:'kael', name:'Kael', rarity:5, element:'pyro', weapon:'claymore', description:'A fierce warrior who forged his blade in the heart of a volcano.', baseHP:11000, baseATK:280, baseDEF:550, skills: { normal:{ name:'Flame Slash', dmgMult:1.2, element:'pyro', cd:0, cost:0, type:'melee', range:3.0 }, skill:{ name:'Meteor Crash', dmgMult:3.5, element:'pyro', cd:12000, cost:0, type:'aoe', range:5.0 }, burst:{ name:'Inferno Reign', dmgMult:6.0, element:'pyro', cd:20000, cost:80, type:'aoe', range:12 } }, passives:['Burst ignites ground for 8s dealing Pyro DoT','+25% ATK when HP above 70%'], constellations:6 },
  voss: { id:'voss', name:'Voss', rarity:5, element:'cryo', weapon:'polearm', description:'An ice-blooded knight whose armor is forged from ancient glaciers.', baseHP:13000, baseATK:220, baseDEF:800, skills: { normal:{ name:'Ice Lance', dmgMult:1.1, element:'cryo', cd:0, cost:0, type:'melee', range:3.5 }, skill:{ name:'Permafrost', dmgMult:2.8, element:'cryo', cd:9000, cost:0, type:'aoe', range:5.0 }, burst:{ name:"Glacial Fortress", dmgMult:4.0, element:'cryo', cd:20000, cost:80, type:'shield_aoe', range:8.0 } }, passives:['Burst creates a shield equal to 20% max HP','Cryo DMG bonus +15%'], constellations:6 },
  zephyr: { id:'zephyr', name:'Zephyr', rarity:4, element:'anemo', weapon:'bow', description:'A carefree archer who rides the wind wherever it takes her.', baseHP:9000, baseATK:240, baseDEF:500, skills: { normal:{ name:'Wind Arrow', dmgMult:0.9, element:'anemo', cd:0, cost:0, type:'projectile', range:20 }, skill:{ name:'Gale Step', dmgMult:1.8, element:'anemo', cd:7000, cost:0, type:'dash', range:6 }, burst:{ name:"Tempest's Eye", dmgMult:4.5, element:'anemo', cd:20000, cost:60, type:'aoe', range:10 } }, passives:['Arrows apply Swirl on reaction','Sprint stamina -15%'], constellations:6 },
  terra: { id:'terra', name:'Terra', rarity:4, element:'geo', weapon:'claymore', description:'A stoic earth mage who shapes mountains with her bare hands.', baseHP:11500, baseATK:210, baseDEF:750, skills: { normal:{ name:'Stone Strike', dmgMult:1.15, element:'geo', cd:0, cost:0, type:'melee', range:2.8 }, skill:{ name:'Rock Pillar', dmgMult:2.5, element:'geo', cd:10000, cost:0, type:'summon', range:4.0 }, burst:{ name:'Earthen Wrath', dmgMult:5.5, element:'geo', cd:20000, cost:80, type:'aoe', range:9.0 } }, passives:['Skill creates a stone pillar that blocks projectiles','DEF +20% when shielded'], constellations:6 },
  flora: { id:'flora', name:'Flora', rarity:4, element:'dendro', weapon:'catalyst', description:'A forest sprite who speaks with the ancient trees of Aetheria.', baseHP:9500, baseATK:200, baseDEF:520, skills: { normal:{ name:'Vine Whip', dmgMult:0.85, element:'dendro', cd:0, cost:0, type:'projectile', range:12 }, skill:{ name:'Bloom Burst', dmgMult:2.0, element:'dendro', cd:8000, cost:0, type:'aoe', range:5 }, burst:{ name:"Forest's Fury", dmgMult:3.5, element:'dendro', cd:20000, cost:60, type:'aoe', range:8 } }, passives:['Bloom creates Dendro seeds dealing extra DMG','+10% Elemental Mastery party-wide'], constellations:6 },
  sol: { id:'sol', name:'Sol', rarity:4, element:'electro', weapon:'sword', description:'A young prodigy who channels raw electro energy through twin blades.', baseHP:9800, baseATK:260, baseDEF:480, skills: { normal:{ name:'Twin Spark', dmgMult:1.05, element:'electro', cd:0, cost:0, type:'melee', range:2.5 }, skill:{ name:'Volt Rush', dmgMult:2.4, element:'electro', cd:8000, cost:0, type:'dash_atk', range:5 }, burst:{ name:'Thunder God', dmgMult:5.0, element:'electro', cd:20000, cost:70, type:'aoe', range:7 } }, passives:['Every 4th hit deals Electro AoE','Elemental skill resets after burst'], constellations:6 },
};

const BANNERS = {
  standard: { id:'standard', name:"Wanderer's Fate", type:'standard', featured:null, pool5star:['lyra','kael','seraphine','voss','zephyr','terra','flora','sol'], pool4star:['zephyr','terra','flora','sol'], rate5:0.006, rate4:0.051, softPity5:74, hardPity5:90, softPity4:9, hardPity4:10, cost:160 },
  character: { id:'character', name:"Event Wish: Lyra's Thunder", type:'limited', featured:'lyra', pool5star:['lyra'], pool4star:['zephyr','flora','sol'], rate5:0.006, rate4:0.051, softPity5:74, hardPity5:90, softPity4:9, hardPity4:10, cost:160, guaranteed:true },
};

const QUESTS = [
  { id:'q_intro', title:'Welcome to Aetheria', desc:'Explore the starting area and talk to the elder.', type:'explore', target:'elder', reward:{ primogems:60, mora:5000, exp:200 }, chain:'q_first_battle' },
  { id:'q_first_battle', title:'First Blood', desc:'Defeat 5 slimes near Windveil Village.', type:'kill', target:'slime', count:5, reward:{ primogems:60, mora:8000, exp:300 }, chain:'q_ruins' },
  { id:'q_ruins', title:'Ancient Ruins', desc:'Investigate the ruins east of the village.', type:'explore', target:'ruins', reward:{ primogems:60, mora:10000, exp:500 }, chain:'q_boss1' },
  { id:'q_boss1', title:'The Pyro Regisvine', desc:'Defeat the Pyro Regisvine boss.', type:'boss', target:'regisvine', reward:{ primogems:160, mora:20000, exp:1000 }, chain:'q_expedition' },
  { id:'q_expedition', title:'Into the Unknown', desc:'Travel to the Frozen Peaks region.', type:'explore', target:'frozen_peaks', reward:{ primogems:80, mora:15000, exp:800 }, chain:null },
  { id:'q_domain1', title:'Echoes of the Past', desc:'Clear the Domain of Forsaken Ruins.', type:'domain', target:'domain_1', reward:{ primogems:100, mora:12000, exp:600 }, chain:null },
  { id:'q_collect', title:'Elemental Harvest', desc:'Collect 5 Windwheel Asters.', type:'collect', target:'aster', count:5, reward:{ primogems:40, mora:6000, exp:250 }, chain:null },
];

const ENEMY_TYPES = {
  slime_pyro:    { name:'Pyro Slime',    element:'pyro',    hp:800,  atk:80,  def:200, reward:{ mora:200, exp:50  }, drop:['slime_concentrate','char_exp_sm'] },
  slime_hydro:   { name:'Hydro Slime',   element:'hydro',   hp:800,  atk:80,  def:200, reward:{ mora:200, exp:50  }, drop:['slime_concentrate','char_exp_sm'] },
  slime_cryo:    { name:'Cryo Slime',    element:'cryo',    hp:900,  atk:90,  def:220, reward:{ mora:220, exp:55  }, drop:['slime_concentrate','char_exp_sm'] },
  slime_electro: { name:'Electro Slime', element:'electro', hp:900,  atk:90,  def:220, reward:{ mora:220, exp:55  }, drop:['slime_concentrate','char_exp_sm'] },
  hilichurl:     { name:'Hilichurl',     element:null,      hp:1200, atk:120, def:300, reward:{ mora:300, exp:80  }, drop:['hilichurl_mask','char_exp_md'] },
  samachurl:     { name:'Samachurl',     element:'dendro',  hp:1000, atk:100, def:250, reward:{ mora:280, exp:70  }, drop:['hilichurl_mask','char_exp_md'] },
  abyss_mage:    { name:'Abyss Mage',    element:'hydro',   hp:3000, atk:200, def:500, reward:{ mora:800, exp:200 }, drop:['mage_staff','char_exp_lg'] },
  regisvine:     { name:'Pyro Regisvine',element:'pyro',    hp:50000,atk:500, def:800, reward:{ mora:5000,exp:1000}, drop:['everflame_seed','hero_wit','char_exp_lg'] },
};

const players = new Map();
const rooms = new Map();

function send(ws, msg) { if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(msg)); }
function broadcast(roomId, msg, excludeId=null) {
  const room = rooms.get(roomId); if(!room) return;
  const d=JSON.stringify(msg);
  room.players.forEach(p=>{ if(p.id!==excludeId&&p.ws.readyState===WebSocket.OPEN) p.ws.send(d); });
}

function newPlayer(ws, name) {
  return {
    ws, id: ws.id, name: name.slice(0,20),
    level:1, exp:0, expNeeded:1000, mora:10000, primogems:300, adventureRank:1, arExp:0,
    roster:['lyra'], team:['lyra',null,null,null], activeChar:'lyra',
    charData:{ lyra:{ level:1, exp:0, ascension:0, constellation:0, talents:{normal:1,skill:1,burst:1}, hp:10000, maxHp:10000, energy:0, maxEnergy:80 } },
    gachaPity:{ standard:{count:0,guaranteed4:false,guaranteed5:false}, character:{count:0,guaranteed4:false,guaranteed5:false} },
    inventory:{ mora:10000, primogems:300, char_exp_sm:10, char_exp_md:0, char_exp_lg:0, slime_concentrate:0, hilichurl_mask:0, windwheel_aster:3 },
    activeQuests:[{ ...QUESTS[0], progress:0 }], completedQuests:[],
    position:{ x:0, y:1, z:0 }, unlockedAreas:['windveil'], roomId:null,
  };
}

function levelUpChar(player, charId) {
  const cd=player.charData[charId]; if(!cd) return;
  const ch=CHARACTERS[charId]; if(!ch) return;
  const expTable=[0,1000,2000,4000,8000,15000,25000,40000,60000,100000];
  if(cd.level>=90) return;
  cd.exp+=1000;
  if(cd.exp>=(expTable[cd.level]||99999)){cd.exp=0;cd.level++;cd.maxHp=Math.floor(ch.baseHP*(1+cd.level*0.08));cd.hp=cd.maxHp;}
}

function doGachaPull(player, bannerId, count=1) {
  const banner=BANNERS[bannerId]; if(!banner) return [];
  const results=[];
  const pity=player.gachaPity[bannerId]||{count:0,guaranteed4:false,guaranteed5:false};
  for(let i=0;i<count;i++){
    if((player.inventory.primogems||0)<banner.cost) break;
    player.inventory.primogems-=banner.cost; pity.count++;
    let rarity=3,charId=null;
    const rate5=pity.count>=banner.softPity5?banner.rate5+(pity.count-banner.softPity5)*0.06:banner.rate5;
    if(pity.count>=banner.hardPity5||Math.random()<rate5){
      rarity=5;pity.count=0;
      if(banner.featured&&(pity.guaranteed5||Math.random()<0.5)){charId=banner.featured;pity.guaranteed5=false;}
      else{charId=banner.pool5star[Math.floor(Math.random()*banner.pool5star.length)];if(banner.featured)pity.guaranteed5=true;}
    } else if(pity.count%10===0||Math.random()<banner.rate4){
      rarity=4;pity.guaranteed4=false;charId=banner.pool4star[Math.floor(Math.random()*banner.pool4star.length)];
    }
    const result={rarity,charId,isNew:charId&&!player.roster.includes(charId)};
    if(charId){
      if(!player.roster.includes(charId)){player.roster.push(charId);player.charData[charId]={level:1,exp:0,ascension:0,constellation:0,talents:{normal:1,skill:1,burst:1},hp:CHARACTERS[charId].baseHP,maxHp:CHARACTERS[charId].baseHP,energy:0,maxEnergy:CHARACTERS[charId].skills.burst.cost||80};}
      else if(rarity>=4) result.constellation=true;
    }
    if(!result.charId) result.item='3★ Enhancement Ore';
    results.push(result);
  }
  player.gachaPity[bannerId]=pity;
  player.inventory.primogems=Math.max(0,player.inventory.primogems||0);
  return results;
}

wss.on('connection', ws => {
  ws.id=uuidv4(); ws.isAlive=true;
  ws.on('pong',()=>ws.isAlive=true);
  ws.on('message', raw => {
    let msg; try{msg=JSON.parse(raw);}catch{return;}
    let p=players.get(ws.id);
    if(msg.type==='init'){
      p=newPlayer(ws,msg.name||'Traveler'); players.set(ws.id,p);
      send(ws,{type:'initOk',player:sanitizePlayer(p),characters:CHARACTERS,elements:ELEMENTS,banners:BANNERS,quests:QUESTS,enemies:ENEMY_TYPES});
    }
    if(!p) return;
    if(msg.type==='move'){p.position=msg.position;if(p.roomId)broadcast(p.roomId,{type:'playerMoved',id:p.id,position:msg.position,charId:p.activeChar,anim:msg.anim},p.id);}
    if(msg.type==='attack'){const result=processAttack(p,msg);send(ws,{type:'attackResult',...result});if(p.roomId)broadcast(p.roomId,{type:'enemyHit',enemyId:msg.enemyId,...result},p.id);}
    if(msg.type==='switchChar'){if(p.team.includes(msg.charId)){p.activeChar=msg.charId;send(ws,{type:'charSwitched',charId:msg.charId});}}
    if(msg.type==='gacha'){const results=doGachaPull(p,msg.bannerId,msg.count||1);send(ws,{type:'gachaResults',results,inventory:p.inventory,pity:p.gachaPity});}
    if(msg.type==='collectItem'){p.inventory[msg.item]=(p.inventory[msg.item]||0)+1;checkQuestProgress(p,'collect',msg.item,1);send(ws,{type:'inventoryUpdate',inventory:p.inventory});}
    if(msg.type==='enemyKilled'){
      const et=ENEMY_TYPES[msg.enemyType];if(!et)return;
      p.inventory.mora=(p.inventory.mora||0)+et.reward.mora; p.arExp+=et.reward.exp;
      et.drop.forEach(d=>{if(Math.random()<0.6)p.inventory[d]=(p.inventory[d]||0)+1;});
      checkQuestProgress(p,'kill',msg.enemyType.split('_')[0],1);
      checkQuestProgress(p,'boss',msg.enemyType,1);
      if(p.arExp>=(p.adventureRank*1000)){p.arExp=0;p.adventureRank++;p.inventory.primogems=(p.inventory.primogems||0)+60;send(ws,{type:'arLevelUp',rank:p.adventureRank});}
      send(ws,{type:'inventoryUpdate',inventory:p.inventory});
    }
    if(msg.type==='talkNPC') checkQuestProgress(p,'explore',msg.npcId,1);
    if(msg.type==='enterArea'){if(!p.unlockedAreas.includes(msg.area)){p.unlockedAreas.push(msg.area);send(ws,{type:'areaUnlocked',area:msg.area});}checkQuestProgress(p,'explore',msg.area,1);}
    if(msg.type==='getQuests') send(ws,{type:'quests',active:p.activeQuests,completed:p.completedQuests});
    if(msg.type==='getRoster') send(ws,{type:'roster',roster:p.roster,charData:p.charData,team:p.team,active:p.activeChar});
    if(msg.type==='setTeam'){p.team=msg.team.slice(0,4);send(ws,{type:'teamSet',team:p.team});}
    if(msg.type==='upgradeChar'){levelUpChar(p,msg.charId);send(ws,{type:'charUpgraded',charId:msg.charId,charData:p.charData[msg.charId]});}
  });
  ws.on('close',()=>players.delete(ws.id));
});

function processAttack(player, msg) {
  const charId=player.activeChar,ch=CHARACTERS[charId];if(!ch)return{};
  const cd=player.charData[charId];if(!cd)return{};
  const skill=ch.skills[msg.skillType||'normal'];
  const baseDmg=ch.baseATK*skill.dmgMult*(1+(cd.level-1)*0.05);
  const enemyType=ENEMY_TYPES[msg.enemyType];
  const def=enemyType?enemyType.def:300;
  const defMult=1-(def/(def+5*cd.level+500));
  let finalDmg=Math.round(baseDmg*defMult*(0.9+Math.random()*0.2));
  let reaction=null;
  if(msg.enemyElement&&msg.enemyElement!==skill.element){
    const r=REACTIONS[`${skill.element}+${msg.enemyElement}`]||REACTIONS[`${msg.enemyElement}+${skill.element}`];
    if(r){finalDmg=Math.round(finalDmg*r.mult);reaction=r;}
  }
  if(msg.skillType==='normal') cd.energy=Math.min(cd.maxEnergy,(cd.energy||0)+4);
  else if(msg.skillType==='skill') cd.energy=Math.min(cd.maxEnergy,(cd.energy||0)+8);
  return{damage:finalDmg,reaction,element:skill.element,crit:Math.random()<0.05,energy:cd.energy,maxEnergy:cd.maxEnergy};
}

function checkQuestProgress(player, type, target, amount) {
  player.activeQuests.forEach((q,i)=>{
    if(q.type!==type) return;
    if(q.target!==target&&!target.startsWith(q.target)) return;
    q.progress=(q.progress||0)+amount;
    if(q.count&&q.progress<q.count) return;
    player.completedQuests.push(q.id); player.activeQuests.splice(i,1);
    const r=q.reward;
    if(r.primogems) player.inventory.primogems=(player.inventory.primogems||0)+r.primogems;
    if(r.mora) player.inventory.mora=(player.inventory.mora||0)+r.mora;
    send(player.ws,{type:'questComplete',questId:q.id,title:q.title,reward:r,inventory:player.inventory});
    if(q.chain){const next=QUESTS.find(qd=>qd.id===q.chain);if(next){player.activeQuests.push({...next,progress:0});send(player.ws,{type:'questAssigned',quest:{...next,progress:0}});}}
  });
}

function sanitizePlayer(p){const{ws,...rest}=p;return rest;}

const hb=setInterval(()=>{wss.clients.forEach(ws=>{if(!ws.isAlive)return ws.terminate();ws.isAlive=false;ws.ping();});},30000);
const PORT=process.env.PORT||8000;
server.listen(PORT,'0.0.0.0',()=>console.log(`Aetheria running on port ${PORT}`));
