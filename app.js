const $=id=>document.getElementById(id);
const scenes=[
 {id:"kitchen",title:"早晨 · 家庭早餐",note:"你走进厨房，寄宿妈妈正在准备早餐。",time:"7:35 AM · MONDAY",weather:"☀️ 68°F · CLEAR",ambient:"咖啡机正在工作，餐具轻轻碰响",people:["you","mom","dad"],prompt:"You have just walked into the kitchen for breakfast. The host mother is making breakfast and the host father is reading something on his tablet."},
 {id:"store",title:"上午 · 街角便利店",note:"你走进学校附近的便利店，准备买咖啡。",time:"8:10 AM · MONDAY",weather:"☀️ 70°F · SUNNY",ambient:"咖啡机嗡嗡作响，门口铃铛响了一声",people:["you","clerk"],prompt:"You have entered a small American convenience store before school. The clerk is behind the coffee counter. This is a natural customer interaction."},
 {id:"school",title:"上午 · 学校走廊",note:"下课铃响了，你在储物柜附近遇到同学。",time:"10:25 AM · MONDAY",weather:"☁️ 66°F · CLOUDY",ambient:"走廊里学生说笑，储物柜砰地关上",people:["you","classmate","son"],prompt:"Between classes at an American high school, you meet a classmate near the lockers. Students are passing by."},
 {id:"schoolcafe",title:"中午 · 学校餐厅",note:"你端着午餐，在同学旁边找了个位置坐下。",time:"12:15 PM · MONDAY",weather:"☀️ 71°F · BRIGHT",ambient:"餐厅里人声嘈杂，托盘轻轻碰撞",people:["you","classmate","son"],prompt:"You are sitting with classmates in a busy American school cafeteria during lunch."},
 {id:"living",title:"傍晚 · 家庭客厅",note:"你坐在沙发上玩游戏，家人陆续回到客厅。",time:"6:40 PM · MONDAY",weather:"🌆 67°F · EVENING",ambient:"电视里传来新闻声，厨房有人在笑",people:["you","dad","mom","son","daughter"],prompt:"You are relaxing on the sofa playing a video game. The host family members are in the living room. Some are talking to each other; one may casually talk to you."},
 {id:"dinner",title:"晚上 · 一起吃晚餐",note:"一家人围坐在餐桌旁，话题从今天的生活慢慢展开。",time:"7:15 PM · MONDAY",weather:"🌙 64°F · NIGHT",ambient:"盘子和餐具声交织着家人的谈笑",people:["you","mom","dad","son","daughter"],prompt:"The Smith family is having dinner together. They naturally share small stories about their day."}
];
const chars={
 you:{label:"你",cls:"you"},mom:{label:"寄宿妈妈",cls:"mom"},dad:{label:"寄宿爸爸",cls:"dad"},
 son:{label:"大儿子",cls:"son"},daughter:{label:"小女儿",cls:"daughter"},clerk:{label:"店员",cls:"clerk"},classmate:{label:"同学",cls:"classmate"}
};
let scene=scenes[0],started=false,busy=false,recognition=null,listening=false,lastLine="",history=[],memory=[],utteranceRate=Number(localStorage.getItem("mal_rate")||".92"),myName=localStorage.getItem("mal_name")||"",speechVoices=[];
const SpeechRec=window.SpeechRecognition||window.webkitSpeechRecognition;
function setStatus(t){$("status").textContent=t}
function paintPeople(ids){$("people").innerHTML=ids.map(id=>{let c=chars[id];return `<div class="person ${c.cls}" id="p-${id}"><div class="head"></div><div class="hair"></div><div class="body"></div><span class="tag">${c.label}</span></div>`}).join("")}
function setScene(s){scene=s;$("backdrop").className="backdrop "+s.id;$("sceneTitle").textContent=s.title;$("sceneNote").textContent=s.note;$("clock").textContent=s.time;$("weather").textContent=s.weather;$("activity").textContent=s.ambient;paintPeople(s.people)}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function voiceFor(speaker){if(!speechVoices.length)speechVoices=speechSynthesis.getVoices();let prefs={mom:/Samantha|Jenny|Aria|Google US English Female/i,dad:/Guy|Christopher|David|Google US English/i,son:/Alex|Evan|Eric|Google US English/i,daughter:/Samantha|Jenny|Aria/i,clerk:/Guy|David|Google US English/i,classmate:/Alex|Evan|Guy/i};return speechVoices.find(v=>v.lang==="en-US"&&prefs[speaker]?.test(v.name))||speechVoices.find(v=>v.lang==="en-US")||speechVoices.find(v=>v.lang.startsWith("en"))}
function speakOne(line){return new Promise(resolve=>{if(!("speechSynthesis"in window)){resolve();return}lastLine=line.text;speechSynthesis.cancel();document.querySelectorAll(".person").forEach(p=>p.classList.remove("talking"));let person=$("p-"+line.speaker);if(person)person.classList.add("talking");let u=new SpeechSynthesisUtterance(line.text);u.lang="en-US";u.rate=utteranceRate;u.pitch=line.speaker==="daughter"?1.12:line.speaker==="dad"?.9:1;let v=voiceFor(line.speaker);if(v)u.voice=v;u.onend=()=>{if(person)person.classList.remove("talking");resolve()};u.onerror=()=>{if(person)person.classList.remove("talking");resolve()};speechSynthesis.speak(u)})}
async function playLines(lines){busy=true;for(const line of lines){if(!busy)break;await speakOne(line);await new Promise(r=>setTimeout(r,250+Math.random()*450))}busy=false;setStatus("你可以自然地接话，也可以继续听他们聊天。")}
function demoLines(kind){const demos={
 start:[
  {speaker:"mom",text:"Morning! You're up. I made some scrambled eggs. Do you want some?"},
  {speaker:"dad",text:"Hey, good morning. Did you sleep okay? It's supposed to be pretty nice out today."}
 ],
 listen:[
  {speaker:"dad",text:"I was reading about the economy this morning. Groceries are getting expensive again."},
  {speaker:"mom",text:"Tell me about it. I went to the store yesterday and somehow spent sixty dollars on almost nothing."},
  {speaker:"son",text:"Can we talk about something other than prices for once?"},
  {speaker:"daughter",text:"I have actual important news. Something happened at school today!"}
 ],
 response:[{speaker:"mom",text:"Oh, really? That sounds interesting. Tell me a little more."}],
 help:[{speaker:"mom",text:"You could say, 'I'm trying to figure out how to say this in English.' No rush, honey."}],
 repeat:[{speaker:"mom",text:lastLine||"Sorry, let me say that one more time."}]
 };return demos[kind]||demos.response}
async function askAI(kind,message=""){
 const actionText={start:"Start this scene naturally. Generate a few spoken turns. At least one person should gently include the student.",listen:"The student stays quiet and listens. Generate a natural conversation among family members or people nearby. Do not ask the student a question in every turn.",response:"Respond naturally to what the student just said. Continue the real-life interaction. If there is a significant English error, gently recast it in-character without explaining grammar.",repeat:"Repeat or rephrase the last spoken sentence in simpler everyday English.",help:"The student wants help expressing the following idea in natural English. A character should offer one natural phrase in-character, then continue the conversation."};
 const payload={scene:{title:scene.title,description:scene.prompt,time:scene.time},action:actionText[kind]||actionText.response,user_message:message,last_spoken_line:lastLine,history:history.slice(-18),memory:memory.slice(-20),student_name:myName};
 try{
  const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const data=await res.json();if(!res.ok)throw new Error(data.message||"AI service unavailable");
  const lines=Array.isArray(data.lines)?data.lines:[];if(!lines.length)throw new Error("AI did not return dialogue");
  history.push({role:"user",content:kind==="start"?"I enter the scene.":message||kind},{role:"assistant",content:JSON.stringify(data)});history=history.slice(-24);
  if(Array.isArray(data.memory_updates))memory=[...memory,...data.memory_updates].slice(-30);
  await playLines(lines);
 }catch(e){console.error(e);setStatus("AI 暂时无法连接，先播放内置对话。");await playLines(demoLines(kind))}
}
function startScene(){if(started){speechSynthesis.cancel();busy=false}started=true;$("start").textContent="🎙 按住说话 / 点击开始说话";$("start").classList.add("mic");askAI("start")}
function nextScene(){speechSynthesis.cancel();busy=false;let choices=scenes.filter(s=>s.id!==scene.id);setScene(pick(choices));if(started)askAI("start");else setStatus("场景已切换，点击开始进入生活。")}
function listen(){if(!started){startScene();return}askAI("listen")}
function repeat(){if(lastLine){playLines([{speaker:"mom",text:lastLine}])}else askAI("repeat")}
function rephrase(){askAI("repeat","I didn't quite catch that. Could you say it again more slowly or in a different way?")}
function help(){const idea=prompt("你现在想表达什么？用中文简单写下来：");if(idea)askAI("help",idea)}
function handleTranscript(text){if(!text.trim())return;askAI("response",text)}
function setupRecognition(){
 if(!SpeechRec){$("voiceInfo").textContent="语音识别不可用 · 可切换文字输入";$("typedInput").style.display="block";$("start").textContent="开始生活 / 使用文字输入";$("start").onclick=()=>{if(!started)startScene();$("typedInput").style.display="block"};return}
 recognition=new SpeechRec();recognition.lang="en-US";recognition.interimResults=false;recognition.maxAlternatives=1;
 recognition.onstart=()=>{listening=true;$("start").classList.add("active");$("start").textContent="正在听你说话… 点击结束";setStatus("我在听。请直接用英语说。")};
 recognition.onresult=e=>{const text=e.results[0][0].transcript;listening=false;$("start").classList.remove("active");$("start").textContent="🎙 按住说话 / 点击开始说话";handleTranscript(text)};
 recognition.onerror=e=>{listening=false;$("start").classList.remove("active");$("start").textContent="🎙 按住说话 / 点击开始说话";setStatus(e.error==="not-allowed"?"请在浏览器设置中允许麦克风权限。":"没有识别清楚，请再试一次。");$("typedInput").style.display="block"};
 recognition.onend=()=>{listening=false;$("start").classList.remove("active");if(started)$("start").textContent="🎙 按住说话 / 点击开始说话"};
 $("voiceInfo").textContent="麦克风与语音播放就绪";
}
$("start").onclick=()=>{if(!started){startScene();return}if(!recognition){$("typedInput").style.display="block";return}if(listening){recognition.stop();return}speechSynthesis.cancel();try{recognition.start()}catch(e){setStatus("麦克风正在准备，请稍后再试。")}};
$("newScene").onclick=nextScene;$("repeat").onclick=repeat;$("rephrase").onclick=rephrase;$("listen").onclick=listen;$("help").onclick=help;
$("settings").onclick=()=>$("settingsModal").classList.add("open");$("closeSettings").onclick=()=>$("settingsModal").classList.remove("open");
$("saveSettings").onclick=()=>{myName=$("myName").value.trim();utteranceRate=Number($("speed").value);localStorage.setItem("mal_name",myName);localStorage.setItem("mal_rate",utteranceRate);$("settingsModal").classList.remove("open");setStatus("设置已保存。")};
$("sendTyped").onclick=()=>{const t=$("typedText").value.trim();if(t){$("typedText").value="";handleTranscript(t)}};
$("typedText").addEventListener("keydown",e=>{if(e.key==="Enter")$("sendTyped").click()});
speechSynthesis.onvoiceschanged=()=>speechVoices=speechSynthesis.getVoices();
(async()=>{try{const r=await fetch("/api/status");const d=await r.json();if(d.mode==="ai")setStatus("AI 已连接。点击开始进入今天的生活。");else setStatus("演示模式：请在服务器配置 Gemini Key 后启用 AI。")}catch{setStatus("连接服务中……")} })();
$("myName").value=myName;$("speed").value=utteranceRate;setupRecognition();setScene(scenes[0]);
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
