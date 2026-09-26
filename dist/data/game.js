export const gameDataVersion='2026-09-26.a';
export const lastVerified='2026-09-26';
export const sources={classes:'https://forum.roseonlinegame.com/topic/7773-new-classes-for-rose-online/',champ:'https://forum.roseonlinegame.com/topic/7782-patch-notes-2026-09-11-champ-update/',summons:'https://www.roseonlinegame.com/news/280-patch-notes-2026-09-13-summons-scout-dungeon-nerf-update'};
export const paths={Soldier:['Knight','Champion'],Muse:['Cleric','Mage'],Hawker:['Raider','Scout'],Dealer:['Bourgeois','Artisan']};
const specs={Knight:[['Full Tank','Shield','party,dungeon,boss'],['Battle Knight','Melee','solo,boss']],Champion:[['Spear AoE','Spear','solo,farming,party'],['Sword / Axe','Sword / Axe','solo,boss']],Cleric:[['Full Support','Support','support,party,dungeon'],['Battle Summoner','Summon','solo,summon,farming']],Mage:[['AoE Mage','Magic','farming,party'],['Boss Mage','Magic','boss,solo']],Raider:[['Katar','Katar','solo,boss'],['Dual Sword','Dual Sword','solo,party']],Scout:[['Bow','Bow','ranged,farming'],['Crossbow','Crossbow','ranged,party']],Bourgeois:[['Launcher','Launcher','ranged,farming'],['Gun / Mercenary','Gun','ranged,summon,solo']],Artisan:[['Crafting','Crafting','crafting'],['Battle Gun / Summon','Gun','solo,summon'] ]};
export const builds=Object.entries(specs).flatMap(([job,variants])=>variants.map(([name,weapon,tags],i)=>({id:`${job.toLowerCase()}-${i}`,job,name,weapon,tags:tags.split(','),status:'PARTIALLY VERIFIED',lastVerified,sourceKeys:job==='Champion'?['classes','champ']:['classes',...(job==='Cleric'||job==='Scout'||job==='Artisan'?['summons']:[])],purpose:tags.replaceAll(',',' · '),note:job==='Champion'?'Patch 11.09 zmienił Sword, Axe i Spear. Bez pełnych kosztów SP nie ma rozpiski punkt po punkcie.':job==='Cleric'&&i===1?'Patch 13.09 zmienił summony Clerica. Rank i koszty wymagają dalszej weryfikacji.':'Archetyp do planowania. Szczegółowe staty, rotacja i sprzęt czekają na potwierdzenie.'})));
export const skills=[
 {id:'spear-deflection-stance',name:'Spear Deflection Stance',job:'Champion',type:'Passive',effect:'2 dodge na 2 STR po patchu 11.09',source:'champ'},
 {id:'spear-dancer',name:'Spear Dancer',job:'Champion',type:'Active',effect:'Czas trwania 20 s po patchu 11.09',source:'champ'},
 {id:'geon-archangel-crumple',name:'Geon Archangel Crumple',job:'Champion',type:'Active',effect:'Casting speed 200 po patchu 11.09',source:'champ'},
 {id:'graceful-swings',name:'Graceful Swings',job:'Champion',type:'Passive',effect:'Proc również po udanym skillu; zmieniono progi stacków',source:'champ'},
 {id:'earth-elemental',name:'Earth Elemental',job:'Cleric',type:'Summon',effect:'Area taunt po patchu 13.09',source:'summons'},
 {id:'fire-elemental',name:'Fire Elemental',job:'Cleric',type:'Summon',effect:'Area burn po patchu 13.09',source:'summons'},
 {id:'ice-dragon',name:'Ice Dragon',job:'Cleric',type:'Summon',effect:'Frost Nova, 25% slow; dostępne na wszystkich pięciu rankach',maxRank:5,source:'summons'},
 {id:'crossbow-arrow-shower',name:'Crossbow Arrow Shower',job:'Scout',type:'Active',effect:'10 s cooldown; 10% physical DEF reduction przez 6 s',cooldown:10,source:'summons'},
 {id:'bow-arrow-shower',name:'Bow Arrow Shower',job:'Scout',type:'Active',effect:'Casting speed 150; osobny cooldown 8 s',cooldown:8,source:'summons'},
 {id:'poison-arrow-shower',name:'Poison Arrow Shower',job:'Scout',type:'Active',effect:'Casting speed 150; osobny cooldown 8 s',cooldown:8,source:'summons'}
].map(s=>({...s,status:'PARTIALLY VERIFIED',lastVerified,spCost:null,requiredLevel:null,prerequisites:null,mpCost:null,maxRank:s.maxRank??null}));
export const statNames=['STR','DEX','INT','CON','CHA','SEN'];
export const gearSlots=['Weapon','Offhand','Head','Body','Gloves','Shoes','Back','Face','Jewelry'];
