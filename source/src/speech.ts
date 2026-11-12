let sequence=0;
export function stopSpeech(){sequence++;window.speechSynthesis?.cancel();}
export function speechChunks(text:string,max=220){const chunks:string[]=[];let current='';for(const word of text.trim().split(/\s+/)){if(current&&current.length+word.length+1>max){chunks.push(current);current='';}current+=(current?' ':'')+word;}if(current)chunks.push(current);return chunks;}
export function speakEnglish(text:string){
 if(!('speechSynthesis' in window))throw Error('当前浏览器没有系统朗读功能，请使用 Chrome 或 Edge。');
 stopSpeech();const own=sequence,synth=window.speechSynthesis,chunks=speechChunks(text);let stopped=false;
 const next=()=>{const part=chunks.shift();if(!part||stopped||own!==sequence)return;const u=new SpeechSynthesisUtterance(part);u.lang='en-US';u.rate=.9;const voices=synth.getVoices();const voice=voices.find(v=>/^en[-_]/i.test(v.lang)&&v.localService)||voices.find(v=>/^en[-_]/i.test(v.lang));if(voice)u.voice=voice;u.onend=next;u.onerror=e=>{stopped=true;if(!['canceled','interrupted'].includes(e.error)){const box=document.getElementById('toast');if(box){box.textContent='朗读未能播放：'+e.error+'。请检查系统英文语音和音量后重试。';box.classList.add('visible');setTimeout(()=>box.classList.remove('visible'),7000);}}};synth.resume();synth.speak(u);};next();return ()=>{stopped=true;stopSpeech();};
}
