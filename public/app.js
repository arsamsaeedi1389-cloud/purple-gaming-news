let currentCategory="همه";
let session=JSON.parse(localStorage.getItem("session")||"null");

const $=s=>document.querySelector(s);
async function api(url,opt={}) {
  opt.headers={...(opt.headers||{})};
  if(session){opt.headers["x-user"]=session.username;opt.headers["x-token"]=session.token}
  const r=await fetch(url,opt);
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||"خطا");
  return d;
}
async function loadArticles(){
  const list=await api("/api/articles?category="+encodeURIComponent(currentCategory));
  const q=$("#search").value.trim().toLowerCase();
  const filtered=list.filter(a=>(a.title+" "+a.summary+" "+a.content).toLowerCase().includes(q));
  $("#articles").innerHTML=filtered.map(a=>`
    <article class="card" onclick='showArticle(${JSON.stringify(a).replace(/'/g,"&#39;")})'>
      <div class="thumb">${a.image?`<img src="${escapeHtml(a.image)}">`:"🎮"}</div>
      <div class="card-body"><span class="cat">${escapeHtml(a.category)}</span>
      <h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.summary||a.content.slice(0,120))}</p></div>
    </article>`).join("")||"<p>خبری پیدا نشد.</p>";
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showArticle(a){
  $("#modalContent").innerHTML=`<span class="cat">${escapeHtml(a.category)}</span><h1>${escapeHtml(a.title)}</h1><p>${escapeHtml(a.content).replace(/\n/g,"<br>")}</p><small>نویسنده: ${escapeHtml(a.author)}</small>`;
  $("#modal").classList.remove("hidden");
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{currentCategory=b.dataset.cat;$("#sectionTitle").textContent=currentCategory==="همه"?"آخرین اخبار":currentCategory;loadArticles()});
$("#search").oninput=loadArticles;
document.querySelectorAll(".close").forEach(b=>b.onclick=()=>b.closest(".modal").classList.add("hidden"));
$("#accountBtn").onclick=()=>{ if(session) openAdminOrLogout(); else $("#authModal").classList.remove("hidden") };

let mode="login";
$("#loginTab").onclick=()=>{mode="login";$("#authForm button").textContent="ورود";$("#authMsg").textContent=""};
$("#registerTab").onclick=()=>{mode="register";$("#authForm button").textContent="ثبت‌نام";$("#authMsg").textContent=""};

$("#authForm").onsubmit=async e=>{
 e.preventDefault();
 try{
  const data=await api(mode==="login"?"/api/login":"/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("#username").value,password:$("#password").value})});
  if(mode==="register"){ $("#authMsg").textContent="ثبت‌نام شد؛ حالا وارد شوید."; mode="login"; $("#authForm button").textContent="ورود"; }
  else {session=data;localStorage.setItem("session",JSON.stringify(session));$("#authModal").classList.add("hidden");updateAccount();alert("خوش آمدی "+session.username)}
 }catch(e){$("#authMsg").textContent=e.message}
};
function updateAccount(){if(session)$("#accountBtn").textContent=session.role==="admin"?"👑 پنل مدیریت":"👤 "+session.username}
async function openAdminOrLogout(){
 if(session.role!=="admin"){if(confirm("از حساب خارج شوی؟")){session=null;localStorage.removeItem("session");updateAccount()}return}
 $("#adminPanel").classList.remove("hidden");loadUsers();
}
$("#articleForm").onsubmit=async e=>{
 e.preventDefault();const f=new FormData(e.target);const body=Object.fromEntries(f.entries());
 try{await api("/api/articles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});e.target.reset();loadArticles();alert("خبر منتشر شد")}catch(e){alert(e.message)}
};
async function loadUsers(){
 try{
  const users=await api("/api/users");
  $("#users").innerHTML=users.map(u=>`<div class="user-row"><span>${escapeHtml(u.username)} — ${u.role}</span>${u.username==="admin"?"":`<button onclick="changeRole(${u.id},'${u.role==="admin"?"user":"admin"}')">${u.role==="admin"?"حذف ادمینی":"ادمین کردن"}</button>`}</div>`).join("");
 }catch(e){$("#users").textContent=e.message}
}
async function changeRole(id,role){try{await api("/api/users/"+id+"/role",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role})});loadUsers()}catch(e){alert(e.message)}}
updateAccount();loadArticles();
