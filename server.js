const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "";
const MODEL = process.env.AI_MODEL || "gemini-3.8-flash";
const API_BASE = (process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, "");
const ROOT = __dirname;
const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".webmanifest":"application/manifest+json",".svg":"image/svg+xml"};

const SYSTEM_PROMPT = `You are the invisible simulation engine for a first-person life simulation called My American Life. The user is a Chinese international student who has just arrived in the United States and is living with an American host family.

CHARACTERS:
- Mr. Smith, host father, around 50: warm, calm, gently humorous; casually follows US politics, economy, technology, international affairs and sports.
- Mrs. Smith, host mother, around 47: thoughtful, welcoming, practical; cooking, shopping, entertainment, family life.
- Ethan, older son, 19: outgoing, likes games, basketball, music, college and school stories.
- Chloe, younger daughter, 15: lively, curious, pop culture, social media, school gossip.
Other temporary people such as a convenience-store clerk, classmates and teachers can appear when the scene calls for them.

ABSOLUTE EXPERIENCE RULES:
1. This is a lived-in world, not an English lesson. Stay in character. Never mention learning, practice, language level, teaching, grammar, or being an AI.
2. The user is physically present in the scene and may speak in English or Chinese, ask for repetition, ask how to express an idea, or silently listen.
3. People have their own conversations and lives. They may talk to each other without involving the user every time. Avoid making every turn a question to the user.
4. Use natural contemporary American spoken English with contractions, everyday idioms, hesitations and interruptions. Keep most language accessible to a new international student without sounding like a textbook.
5. If user says they did not understand, the original speaker should repeat or rephrase more simply and naturally.
6. If user asks in Chinese how to express an idea, a character should offer one natural English phrase in-character, then return to the scene.
7. Correct only meaning-blocking mistakes, gently by recasting the sentence in character. No grammar lecture.
8. Preserve continuity using recent history and story memory. Never invent a prior event or preference.
9. News can be discussed as everyday opinions. Do not invent current headlines, statistics, quotes or facts. Without verified supplied news, talk about general issues, personal reactions, entertainment, sports or daily life.
10. Dialogue should be short and conversational. For a normal scene, 2-4 spoken turns; for listening-only, 3-6 turns.
11. Never output subtitles, translation, explanations, narration paragraphs, markdown, or any extra visible text. The frontend speaks lines aloud and intentionally does not display dialogue text.

Return ONLY valid JSON with this exact shape:
{"scene":"short scene id","time":"short time label","weather":"short weather label","ambient":"brief soundscape in Chinese","lines":[{"speaker":"mom|dad|son|daughter|clerk|classmate|teacher","text":"spoken English only"}],"memory_updates":["durable event only"]}
Use speaker IDs: mom, dad, son, daughter, clerk, classmate, teacher. Keep each spoken turn to one or two sentences.`;

function json(res, status, data) {
  res.writeHead(status, {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"same-origin"});
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve,reject)=>{
    let body="";
    req.on("data",chunk=>{body+=chunk;if(body.length>150000)reject(new Error("Request too large"));});
    req.on("end",()=>{try{resolve(JSON.parse(body||"{}"));}catch{reject(new Error("Invalid JSON"));}});
    req.on("error",reject);
  });
}
function parseJson(text) {
  const s=String(text||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  const a=s.indexOf("{"),b=s.lastIndexOf("}");
  if(a<0||b<a)throw new Error("The AI response was not JSON");
  return JSON.parse(s.slice(a,b+1));
}
async function generate(body) {
  const messages=[
    {role:"system",content:SYSTEM_PROMPT},
    {role:"system",content:"CURRENT SCENE:\n"+JSON.stringify(body.scene||{})},
    {role:"system",content:"STORY MEMORY:\n"+JSON.stringify(body.memory||[])},
    ...(Array.isArray(body.history)?body.history.slice(-18):[]),
    {role:"user",content:"ACTION:\n"+String(body.action||"Continue the scene.")+"\n\nUSER MESSAGE:\n"+String(body.user_message||"(The student is quietly present.)")+"\n\nLAST SPOKEN LINE:\n"+String(body.last_spoken_line||"(none)")+"\n\nSTUDENT NAME:\n"+String(body.student_name||"(not provided)")}
  ];
  const response=await fetch(API_BASE+"/chat/completions",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+API_KEY},
    body:JSON.stringify({model:MODEL,messages,temperature:0.95,response_format:{type:"json_object"}}),
    signal:AbortSignal.timeout(45000)
  });
  const raw=await response.text();
  if(!response.ok)throw new Error("Gemini API "+response.status+": "+raw.slice(0,350));
  const payload=JSON.parse(raw);
  const data=parseJson(payload.choices?.[0]?.message?.content);
  if(!Array.isArray(data.lines))throw new Error("AI response is missing dialogue lines");
  data.lines=data.lines.filter(x=>x&&typeof x.text==="string"&&x.text.trim()).slice(0,7).map(x=>({
    speaker:["mom","dad","son","daughter","clerk","classmate","teacher"].includes(x.speaker)?x.speaker:"mom",
    text:x.text.trim().slice(0,600)
  }));
  return data;
}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,"http://localhost");
  if(req.method==="GET"&&url.pathname==="/api/status")return json(res,200,{mode:API_KEY?"ai":"demo",provider:API_KEY?"Gemini":null,model:API_KEY?MODEL:null});
  if(req.method==="POST"&&url.pathname==="/api/chat"){
    try{
      if(!API_KEY)return json(res,503,{error:"AI_NOT_CONFIGURED",message:"服务端尚未配置 GEMINI_API_KEY。请在 Render 的 Environment 中添加密钥。"});
      const body=await readBody(req);const result=await generate(body);return json(res,200,result);
    }catch(err){console.error(err);return json(res,502,{error:"AI_REQUEST_FAILED",message:err.message||"AI request failed"});}
  }
  if(req.method!=="GET"&&req.method!=="HEAD")return json(res,405,{error:"Method not allowed"});
  let pathname=decodeURIComponent(url.pathname);if(pathname==="/")pathname="/index.html";
  const target=path.resolve(ROOT,"."+pathname);
  if(!target.startsWith(ROOT+path.sep)&&target!==ROOT)return json(res,403,{error:"Forbidden"});
  fs.readFile(target,(err,data)=>{
    if(err)return json(res,404,{error:"Not found"});
    res.writeHead(200,{"Content-Type":mime[path.extname(target)]||"application/octet-stream","Cache-Control":pathname==="/"? "no-cache":"public, max-age=300"});
    if(req.method==="HEAD")return res.end();res.end(data);
  });
});
server.listen(PORT,"0.0.0.0",()=>console.log(`My American Life listening on ${PORT}`));
