export function validateGame({build,level,stats,skills,availableSP=null,availableStats=null,catalog=[]}){
 const errors=[]; if(level<10||level>250||!Number.isInteger(level))errors.push('Poziom musi być całkowity w zakresie 10–250.');
 if(!build)errors.push('Wybierz build.');
 for(const [key,value] of Object.entries(stats)){if(!Number.isInteger(value)||value<0)errors.push(`Niepoprawne punkty ${key}.`)}
 for(const [id,rank] of Object.entries(skills)){const s=catalog.find(x=>x.id===id);if(!s)errors.push(`Nieznany skill: ${id}`);else{if(!Number.isInteger(rank)||rank<0||s.maxRank==null||rank>s.maxRank)errors.push(`Niepotwierdzony lub błędny rank: ${s.name}`);if(s.requiredLevel==null||s.spCost==null||s.prerequisites==null)errors.push(`Brak pełnych wymagań skilla ${s.name}`);else{if(level<s.requiredLevel)errors.push(`Za niski level dla ${s.name}`);for(const p of s.prerequisites)if((skills[p.id]||0)<p.rank)errors.push(`Brak wymaganego ${p.id} rank ${p.rank}`)}}}
 const usedStats=Object.values(stats).reduce((a,b)=>a+b,0);if(availableStats!=null&&usedStats>availableStats)errors.push('Przekroczono pulę statów.');
 if(availableSP!=null){const usedSP=Object.entries(skills).reduce((a,[id,r])=>a+r*(catalog.find(x=>x.id===id)?.spCost||0),0);if(usedSP>availableSP)errors.push('Przekroczono pulę SP.')}
 return {errors,status:errors.length?'MISSING DATA':availableSP==null||availableStats==null?'PARTIALLY VERIFIED':'VERIFIED'};
}
