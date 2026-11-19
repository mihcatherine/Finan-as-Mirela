const DEFAULT_CATS=[
{name:"Alimentação",icon:"🍔",budget:500},{name:"Transporte",icon:"🚗",budget:300},
{name:"Moradia",icon:"🏠",budget:700},{name:"Estudos",icon:"📚",budget:250},
{name:"Educação",icon:"🎓",budget:500},{name:"Saúde",icon:"🩺",budget:200},
{name:"Beleza",icon:"💄",budget:150},{name:"Lazer",icon:"🎬",budget:200},
{name:"Compras",icon:"🛍️",budget:200},{name:"Cartão",icon:"💳",budget:600},
{name:"Investimento",icon:"💰",budget:400},{name:"Assinaturas",icon:"📱",budget:100},
{name:"Contas",icon:"🧾",budget:500},{name:"Pets",icon:"🐾",budget:150},
{name:"Presentes",icon:"🎁",budget:100},{name:"Trabalho",icon:"💼",budget:100},
{name:"Viagens",icon:"✈️",budget:300},{name:"Outros",icon:"⋯",budget:100}
];
const key="mirelaFinancasV51";
const old=JSON.parse(localStorage.getItem("mirelaFinancasV5")||"null");
let db=JSON.parse(localStorage.getItem(key)||"null");
if(!db){
  db=old||{salary:2759.74,advancePct:40,inssPct:9,assistPct:2,life:3.82,negocial:21,transactions:[],bills:[],goals:[],card:{limit:2000},categories:DEFAULT_CATS};
  if(!db.categories) db.categories=DEFAULT_CATS;
  if(db.customCats){db.customCats.forEach(n=>db.categories.push({name:n,icon:"✦",budget:0}));delete db.customCats}
  save();
}
function save(){localStorage.setItem(key,JSON.stringify(db))}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function month(){return new Date().toISOString().slice(0,7)}
function monthLabel(){return new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}
function cats(){return db.categories||[]}
function catObj(n){return cats().find(c=>c.name===n)||{name:n,icon:"✦",budget:0}}
function net(){return db.salary-(db.salary*db.inssPct/100)-(db.salary*db.assistPct/100)-db.life-db.negocial}
function adv(){return db.salary*db.advancePct/100}
function remain(){return net()-adv()}
function txMonth(){return db.transactions.filter(x=>x.date?.slice(0,7)===month())}
function txTotal(type){return txMonth().filter(x=>x.type===type).reduce((s,x)=>s+Number(x.value||0),0)}
function catSpent(cat){return txMonth().filter(x=>x.type==="Despesa"&&x.category===cat).reduce((s,x)=>s+Number(x.value||0),0)}
function totalBudgets(){return cats().reduce((s,c)=>s+Number(c.budget||0),0)}
function budgetStatus(cat){
 const b=Number(cat.budget||0), s=catSpent(cat);
 if(!b)return {p:0,label:"Sem limite",class:"neutral",left:0};
 const p=(s/b)*100;
 return {p,label:p>=100?"Ultrapassado":p>=90?"Quase no limite":p>=70?"Atenção":"Dentro do limite",class:p>=100?"danger":p>=90?"warn":p>=70?"attention":"ok",left:b-s};
}
function render(){
 const tab=document.querySelector(".tabs .active")?.dataset.tab||"inicio";
 const fn={inicio:home,lancamentos:transactions,contas:bills,cartao:card,metas:goals,analises:analysis,config:config}[tab];
 document.querySelector("#main").innerHTML=fn();bind();
}
function home(){
 const inc=txTotal("Receita"),exp=txTotal("Despesa"),inv=txTotal("Investimento");
 const available=net()+inc-exp-inv;
 const over=cats().filter(c=>c.budget>0&&catSpent(c)>c.budget);
 const attention=cats().filter(c=>c.budget>0&&catSpent(c)/c.budget>=.9&&catSpent(c)<=c.budget);
 return `<section class="hero card"><div><span class="pill">● ${monthLabel()}</span><h2>Seu dinheiro, sob controle.</h2><p>Veja o que entrou, o que saiu e onde você precisa ter atenção.</p></div><div class="heroNumber"><small>Disponível estimado</small><strong class="${available>=0?"positive":"negative"}">${money(available)}</strong></div></section>
 <div class="grid metrics">
 <div class="card metric"><small>Salário Líquido</small><strong>${money(net())}</strong><span>após descontos</span></div>
 <div class="card metric"><small>Dia 20</small><strong>${money(adv())}</strong><span>adiantamento</span></div>
 <div class="card metric"><small>5º Dia Útil</small><strong>${money(remain())}</strong><span>saldo do salário</span></div>
 <div class="card metric"><small>Investimentos</small><strong class="positive">${money(inv)}</strong><span>neste mês</span></div></div>
 ${over.length?`<div class="alert dangerbox">🔴 <div><b>Limite ultrapassado</b><p>${over.map(c=>`${catObj(c.name).icon} ${c.name} em ${money(catSpent(c)-c.budget)} acima do limite`).join(" · ")}</p></div></div>`:""}
 ${attention.length?`<div class="alert warnbox">🟡 <div><b>Atenção aos limites</b><p>${attention.map(c=>`${catObj(c.name).icon} ${c.name} já usou ${Math.round(catSpent(c)/c.budget*100)}%`).join(" · ")}</p></div></div>`:""}
 <div class="grid two section"><div class="card"><div class="sectionhead"><div><h2>Gastos por categoria</h2><span class="muted">Este mês</span></div></div>${expenseBars()}</div>
 <div class="card"><div class="sectionhead"><div><h2>Metas</h2><span class="muted">Progresso</span></div><button class="btn smallbtn" data-action="goal">＋ Meta</button></div>${db.goals.slice(0,4).map(g=>goalMini(g)).join("")||`<div class="empty">Crie sua primeira meta.</div>`}</div></div>
 <div class="card section"><div class="sectionhead"><div><h2>Orçamento por categoria</h2><span class="muted">Limites configurados</span></div><button class="btn secondary smallbtn" data-tabto="config">Editar limites</button></div><div class="budgetgrid">${cats().filter(c=>c.budget>0).map(c=>budgetCard(c)).join("")}</div></div>
 <div class="section"><div class="sectionhead"><h2>Últimos Lançamentos</h2><button class="btn" data-action="tx">＋ Lançamento</button></div><div class="list">${db.transactions.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,6).map(rowTx).join("")||`<div class="card empty">Nenhum lançamento ainda.</div>`}</div></div>`;
}
function expenseBars(){
 const rows=cats().map(c=>({c,s:catSpent(c)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,8);
 const max=Math.max(...rows.map(x=>x.s),1);
 return rows.length?`<div class="ranklist">${rows.map(x=>`<div class="rank"><div class="ranktop"><span>${x.c.icon} ${x.c.name}</span><b>${money(x.s)}</b></div><div class="bar"><i style="width:${x.s/max*100}%"></i></div></div>`).join("")}</div>`:`<div class="empty">Registre despesas para ver a distribuição.</div>`;
}
function budgetCard(c){
 const s=catSpent(c),st=budgetStatus(c),width=Math.min(st.p,100);
 return `<div class="budgetitem"><div class="budgettop"><span class="catname">${c.icon} ${c.name}</span><span class="${st.class}">${st.label}</span></div><div class="budgetnums"><b>${money(s)}</b><span>de ${money(c.budget)}</span></div><div class="bar ${st.class}"><i style="width:${width}%"></i></div><div class="budgetfoot"><span>${st.left>=0?`Restam ${money(st.left)}`:`Excedeu ${money(Math.abs(st.left))}`}</span><span>${st.p.toFixed(0)}%</span></div></div>`;
}
function goalMini(g){let p=Math.min(100,g.saved/g.target*100);return `<div class="goalmini"><div class="ranktop"><span>🎯 ${g.name}</span><b>${p.toFixed(0)}%</b></div><div class="bar"><i style="width:${p}%"></i></div><small>${money(g.saved)} de ${money(g.target)}</small></div>`}
function rowTx(t){const c=catObj(t.category);return `<div class="row"><div class="left"><div class="ico">${c.icon}</div><div><b>${t.description||t.category}</b><div class="muted">${t.category} · ${t.date} · ${t.payment||"Não informado"}</div></div></div><strong class="${t.type==="Receita"||t.type==="Investimento"?"positive":"negative"}">${t.type==="Despesa"?"-":t.type==="Investimento"?"↗ ":"+"}${money(t.value)}</strong></div>`}
function transactions(){return `<div class="sectionhead"><div><h2>Lançamentos</h2><span class="muted">Tudo que movimenta seu dinheiro</span></div><button class="btn" data-action="tx">＋ Novo Lançamento</button></div><div class="filterbar"><select id="filterCat"><option value="">Todas as categorias</option>${cats().map(c=>`<option>${c.name}</option>`).join("")}</select><select id="filterType"><option value="">Todos os tipos</option><option>Despesa</option><option>Receita</option><option>Investimento</option></select></div><div class="list" id="txlist">${db.transactions.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(rowTx).join("")||`<div class="card empty">Você ainda não possui lançamentos.</div>`}</div>`}
function bills(){return `<div class="sectionhead"><div><h2>Contas</h2><span class="muted">Adicione, altere e acompanhe suas contas</span></div><button class="btn" data-action="bill">＋ Nova Conta</button></div><div class="list">${db.bills.map(b=>`<div class="row"><div class="left"><div class="ico">🧾</div><div><b>${b.name}</b><div class="muted">Vence dia ${b.day} · ${b.rec?"Mensal":"Única"}</div></div></div><strong>${money(b.value)}</strong></div>`).join("")||`<div class="card empty">Cadastre suas contas fixas ou avulsas.</div>`}</div>`}
function card(){let spent=txMonth().filter(t=>t.payment==="Cartão"||t.category==="Cartão").reduce((s,t)=>s+Number(t.value||0),0),lim=Number(db.card.limit);return `<div class="grid metrics"><div class="card metric"><small>Limite</small><strong>${money(lim)}</strong></div><div class="card metric"><small>Fatura Registrada</small><strong>${money(spent)}</strong></div><div class="card metric"><small>Disponível</small><strong class="positive">${money(Math.max(0,lim-spent))}</strong></div><div class="card metric"><small>Utilização</small><strong>${lim?(spent/lim*100).toFixed(0):0}%</strong></div></div><div class="section card"><div class="sectionhead"><div><h2>Controle do Cartão</h2><span class="muted">Acompanhe a fatura e o limite.</span></div><button class="btn" data-action="cardlimit">Editar Limite</button></div><div class="bar big"><i style="width:${Math.min(100,lim?spent/lim*100:0)}%"></i></div><p class="muted">${spent>lim?"🔴 Você ultrapassou o limite do cartão.":"🟢 Dentro do limite."}</p></div>`}
function goals(){return `<div class="sectionhead"><div><h2>Metas Financeiras</h2><span class="muted">Objetivos que recebem seu dinheiro</span></div><button class="btn" data-action="goal">＋ Nova Meta</button></div><div class="grid two">${db.goals.map(g=>{let p=Math.min(100,g.saved/g.target*100);return `<div class="card"><h3>🎯 ${g.name}</h3><div class="muted">${money(g.saved)} de ${money(g.target)}</div><div class="bar" style="margin:14px 0"><i style="width:${p}%"></i></div><b>${p.toFixed(1)}% concluído</b></div>`}).join("")||`<div class="card empty">Crie uma meta para começar.</div>`}</div>`}
function analysis(){const inc=txTotal("Receita"),exp=txTotal("Despesa"),inv=txTotal("Investimento"),budget=totalBudgets(),used=budget?exp/budget*100:0;return `<div class="grid metrics"><div class="card metric"><small>Receitas Registradas</small><strong class="positive">${money(inc)}</strong></div><div class="card metric"><small>Despesas Registradas</small><strong class="negative">${money(exp)}</strong></div><div class="card metric"><small>Investimentos</small><strong>${money(inv)}</strong></div><div class="card metric"><small>Orçamento Usado</small><strong>${used.toFixed(1)}%</strong></div></div><div class="grid two section"><div class="card"><h2>Leitura Estratégica</h2><div class="insight ${exp>net()?"danger":"ok"}">${exp>net()?"⚠️ Suas despesas registradas já ultrapassam seu salário líquido.":"✓ Suas despesas registradas estão dentro do salário líquido."}</div><div class="insight">${budget?`Você usou ${used.toFixed(1)}% do orçamento total das categorias.`:"Configure limites por categoria para ativar essa análise."}</div><div class="insight">${inc?`Você investiu ${(inv/inc*100).toFixed(1)}% das receitas registradas.`:"Cadastre receitas para calcular sua taxa de investimento."}</div></div><div class="card"><h2>Maiores gastos</h2>${cats().map(c=>({c,s:catSpent(c)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,5).map(x=>`<div class="ranktop mini"><span>${x.c.icon} ${x.c.name}</span><b>${money(x.s)}</b></div>`).join("")||`<div class="empty">Ainda não há despesas.</div>`}</div></div>`}
function config(){return `<div class="card"><h2>Configurações do Salário</h2><p class="muted">Você controla as regras. Alterou a porcentagem? O aplicativo recalcula tudo automaticamente.</p><form id="salaryForm"><div class="formgrid"><div class="field"><label>Salário Bruto (R$)</label><input name="salary" type="number" step=".01" value="${db.salary}"></div><div class="field"><label>Adiantamento (%)</label><input name="advancePct" type="number" step=".01" min="0" max="100" value="${db.advancePct}"></div><div class="field"><label>INSS (%)</label><input name="inssPct" type="number" step=".01" min="0" max="100" value="${db.inssPct}"></div><div class="field"><label>Taxa Assistencial (%)</label><input name="assistPct" type="number" step=".01" min="0" max="100" value="${db.assistPct}"></div><div class="field"><label>Seguro de Vida (R$)</label><input name="life" type="number" step=".01" value="${db.life}"></div><div class="field"><label>Desconto Negocial (R$)</label><input name="negocial" type="number" step=".01" value="${db.negocial}"></div></div><div class="salaryPreview"><span>Salário Líquido estimado</span><b>${money(net())}</b><span>Dia 20: ${money(adv())} · 5º Dia Útil: ${money(remain())}</span></div><div class="actions"><button class="btn">Salvar e Recalcular</button></div></form></div><div class="section card"><div class="sectionhead"><div><h2>Orçamentos por Categoria</h2><span class="muted">Defina quanto você pode gastar por mês.</span></div><button class="btn" data-action="cat">＋ Nova Categoria</button></div><div class="budgetsettings">${cats().map(c=>`<div class="budgetsetting"><div class="left"><div class="ico">${c.icon}</div><div><b>${c.name}</b><div class="muted">${Number(c.budget)?`Limite atual: ${money(c.budget)}`:"Sem limite"}</div></div></div><button class="btn secondary" data-editcat="${encodeURIComponent(c.name)}">Editar</button></div>`).join("")}</div></div><div class="section card"><h2>Ferramentas</h2><div class="toolrow"><button class="btn secondary" data-action="export">⬇ Exportar Backup</button><button class="btn secondary" data-action="import">⬆ Importar Backup</button><button class="btn dangerbtn" data-action="reset">Resetar Dados</button></div></div>`}
function openModal(title,body){document.querySelector("#modalTitle").textContent=title;document.querySelector("#form").innerHTML=body;document.querySelector("#modal").classList.remove("hidden")}
function close(){document.querySelector("#modal").classList.add("hidden")}
function bind(){
 document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");render()});
 document.querySelector("#closeModal").onclick=close;
 document.querySelector("#themeBtn").onclick=()=>document.documentElement.classList.toggle("dark");
 document.querySelectorAll("[data-tabto]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tabs button").forEach(x=>{x.classList.toggle("active",x.dataset.tab==="config")});render()});
 const fc=document.querySelector("#filterCat"),ft=document.querySelector("#filterType");
 function filterTx(){if(!fc||!ft)return;let arr=db.transactions.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).filter(t=>(!fc.value||t.category===fc.value)&&(!ft.value||t.type===ft.value));document.querySelector("#txlist").innerHTML=arr.map(rowTx).join("")||`<div class="card empty">Nenhum lançamento encontrado.</div>`}
 if(fc)fc.onchange=filterTx;if(ft)ft.onchange=filterTx;
 document.querySelectorAll("[data-editcat]").forEach(b=>b.onclick=()=>{let name=decodeURIComponent(b.dataset.editcat),c=catObj(name);openModal("Editar Categoria",`<div class="formgrid"><div class="field"><label>Nome</label><input name="name" value="${c.name}" required></div><div class="field"><label>Ícone</label><input name="icon" value="${c.icon}" required></div><div class="field"><label>Limite Mensal (R$)</label><input name="budget" type="number" step=".01" min="0" value="${c.budget||0}"></div></div><div class="actions"><button class="btn">Salvar Categoria</button></div>`);document.querySelector("#form").onsubmit=e=>{e.preventDefault();let d=Object.fromEntries(new FormData(e.target));c.name=d.name;c.icon=d.icon;c.budget=Number(d.budget);save();close();render()}}); 
 document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>{
 const a=b.dataset.action;
 if(a==="tx")openModal("Novo Lançamento",`<div class="formgrid"><div class="field"><label>Tipo</label><select name="type"><option>Despesa</option><option>Receita</option><option>Investimento</option></select></div><div class="field"><label>Valor</label><input name="value" type="number" step=".01" required></div><div class="field"><label>Categoria</label><select name="category">${cats().map(c=>`<option>${c.name}</option>`).join("")}</select></div><div class="field"><label>Forma de Pagamento</label><select name="payment"><option>Pix</option><option>Débito</option><option>Cartão</option><option>Dinheiro</option><option>Transferência</option><option>Outro</option></select></div><div class="field"><label>Data</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field full"><label>Descrição</label><input name="description" placeholder="Ex.: Mercado"></div></div><div class="actions"><button class="btn">Salvar Lançamento</button></div>`);
 if(a==="bill")openModal("Nova Conta",`<div class="formgrid"><div class="field"><label>Nome</label><input name="name" required></div><div class="field"><label>Valor</label><input name="value" type="number" step=".01" required></div><div class="field"><label>Vencimento</label><input name="day" type="number" min="1" max="31" required></div><div class="field"><label>Recorrência</label><select name="rec"><option value="1">Mensal</option><option value="0">Única</option></select></div></div><div class="actions"><button class="btn">Salvar Conta</button></div>`);
 if(a==="goal")openModal("Nova Meta",`<div class="formgrid"><div class="field"><label>Nome</label><input name="name" required></div><div class="field"><label>Objetivo (R$)</label><input name="target" type="number" step=".01" required></div><div class="field"><label>Já Guardado (R$)</label><input name="saved" type="number" step=".01" value="0"></div></div><div class="actions"><button class="btn">Salvar Meta</button></div>`);
 if(a==="cat")openModal("Nova Categoria",`<div class="formgrid"><div class="field"><label>Nome</label><input name="name" required></div><div class="field"><label>Ícone</label><input name="icon" placeholder="Ex.: 🏋️" required></div><div class="field"><label>Limite Mensal (R$)</label><input name="budget" type="number" step=".01" min="0" value="0"></div></div><div class="actions"><button class="btn">Adicionar Categoria</button></div>`);
 if(a==="cardlimit")openModal("Limite do Cartão",`<div class="field"><label>Limite (R$)</label><input name="limit" type="number" step=".01" value="${db.card.limit}"></div><div class="actions"><button class="btn">Salvar</button></div>`);
 if(a==="export"){let blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="mirela-financas-backup.json";a.click();URL.revokeObjectURL(url)}
 if(a==="import"){let inp=document.createElement("input");inp.type="file";inp.accept=".json,application/json";inp.onchange=()=>{let r=new FileReader();r.onload=()=>{try{db=JSON.parse(r.result);save();render();alert("Backup importado com sucesso.")}catch(e){alert("Arquivo de backup inválido.")}};r.readAsText(inp.files[0])};inp.click()}
 if(a==="reset"&&confirm("Isso apagará os dados salvos neste aparelho. Continuar?")){localStorage.removeItem(key);location.reload()}
 });
 const sf=document.querySelector("#salaryForm");if(sf)sf.onsubmit=e=>{e.preventDefault();let d=Object.fromEntries(new FormData(sf));Object.assign(db,{salary:Number(d.salary),advancePct:Number(d.advancePct),inssPct:Number(d.inssPct),assistPct:Number(d.assistPct),life:Number(d.life),negocial:Number(d.negocial)});save();render()}
 const form=document.querySelector("#form");if(form&&!form.onsubmit)form.onsubmit=e=>{e.preventDefault();let d=Object.fromEntries(new FormData(e.target)),title=document.querySelector("#modalTitle").textContent;
 if(title==="Novo Lançamento")db.transactions.push({...d,value:Number(d.value)});
 if(title==="Nova Conta")db.bills.push({...d,value:Number(d.value),day:Number(d.day),rec:d.rec==="1"});
 if(title==="Nova Meta")db.goals.push({...d,target:Number(d.target),saved:Number(d.saved)});
 if(title==="Nova Categoria"){db.categories.push({name:d.name,icon:d.icon||"✦",budget:Number(d.budget||0)})}
 if(title==="Limite do Cartão")db.card.limit=Number(d.limit);
 save();close();render()}
}
render();
