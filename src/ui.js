/* SPDX-License-Identifier: MIT */
(() => {
    'use strict';
    if (window.JellyfinLibraryFilter) return;
    const core = window.JellyfinLibraryFilterCore;
    let host, shadow, epoch = 0, page = 0, activeUser, activeClient;
    let people = [], personSearch, personHint;
    let library, person, form, results, status, previous, next, queryButton, candidateButton;
    const fields = new Map();
    function el(tag, text, attrs = {}) {
        const n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,v);
        return n;
    }
    function option(select, value, label) { const o=el('option',label,{value}); select.append(o); }
    function client() {
        const api = window.ApiClient;
        if (!api || !api.getCurrentUserId || !api.getItems || !api.getUserViews) throw new Error('当前网页未提供兼容的 ApiClient，请先登录；此客户端尚不受支持。');
        const user = api.getCurrentUserId();
        core.buildQuery({}, {userId:user});
        return {api,user};
    }
    function valid(ticket) {
        try { const c=client(); return ticket === epoch && c.user === activeUser && c.api === activeClient; } catch { return false; }
    }
    function clearResults() { results.replaceChildren(); next.disabled=true; previous.disabled=true; }
    function expire(ticket) {
        if (ticket !== epoch) return;
        clearResults(); resetCandidates(); status.textContent='账号或服务器已改变，请关闭后重新打开。';
    }
    function renderPeople() {
        const selected = person.value;
        const matches = core.searchPeople(people, personSearch.value);
        person.replaceChildren(); option(person,'','请选择候选人物 / 不限制');
        for (const p of matches.items) option(person,p.Id,`${p.Name} (${p.Type}) · ${p.Id.slice(0,8)}`);
        if (matches.items.some(p => p.Id === selected)) person.value = selected;
        personHint.textContent = people.length ? `匹配 ${matches.total} 位，显示前 ${matches.items.length} 位。选中人物后按 ID 精确筛选。`
            : '请先选择媒体库并点击“读取该库筛选候选”；不会自动联网搜索演员。';
        fields.get('Person').input.disabled = Boolean(person.value);
    }
    function resetCandidates() {
        people = []; personSearch.value = ''; renderPeople();
        for (const {list} of fields.values()) if (list) list.replaceChildren();
    }
    async function run(start = 0) {
        const ticket=++epoch; clearResults(); candidateButton.disabled=false;
        try {
            const c=client();
            if (c.user !== activeUser || c.api !== activeClient) return expire(ticket);
            if (personSearch.value.trim() && !person.value) throw new Error('请从模糊搜索候选中选择人物，或清空人物关键词');
            const values=Object.fromEntries([...fields].map(([key,{input}])=>[key,input.value]));
            const q=core.buildQuery(values,{userId:c.user,parentId:library.value,personId:person.value,start});
            status.textContent='查询中…'; queryButton.disabled=true;
            const response=await c.api.getItems(c.user,q);
            if (!valid(ticket)) return expire(ticket);
            if (!Array.isArray(response.Items) || !Number.isInteger(response.TotalRecordCount)) throw new Error('服务器返回格式不兼容');
            page=start;
            for (const item of response.Items) {
                const a=el('a',undefined,{class:'card',href:'#/details?id='+encodeURIComponent(item.Id)});
                if (item.ImageTags?.Primary && c.api.getImageUrl) {
                    const src=c.api.getImageUrl(item.Id,{type:'Primary',tag:item.ImageTags.Primary,maxWidth:240});
                    // Avoid remote artwork or cross-origin credential-bearing image URLs.
                    const url=new URL(src,location.href);
                    if (url.origin === location.origin) a.append(el('img',undefined,{src:url.href,loading:'lazy',alt:''}));
                }
                a.append(el('strong',item.Name || '未命名'),el('small',[item.ProductionYear,item.Type].filter(Boolean).join(' · ')));
                a.addEventListener('click',()=>close()); results.append(a);
            }
            status.textContent=response.TotalRecordCount ? `共 ${response.TotalRecordCount} 项 · 当前 ${start+1}–${start+response.Items.length}` : '无匹配结果';
            previous.disabled=start===0; next.disabled=start+response.Items.length >= response.TotalRecordCount || !response.Items.length;
        } catch (e) { if (ticket===epoch) status.textContent='查询失败：'+e.message; }
        finally { if (ticket===epoch) queryButton.disabled=false; }
    }
    async function candidates() {
        const ticket=++epoch; clearResults(); resetCandidates();
        candidateButton.disabled=true; queryButton.disabled=false;
        try {
            const c=client();
            if (c.user !== activeUser || c.api !== activeClient) return expire(ticket);
            if (!library.value) throw new Error('请先选择一个媒体库，避免读取全库候选项');
            const parentId=library.value;
            const f=await core.loadFacets((start,limit)=>c.api.getItems(c.user,{UserId:c.user,ParentId:parentId,Recursive:true,StartIndex:start,Limit:limit,SortBy:'SortName',SortOrder:'Ascending',Fields:'People,Tags,Genres,Studios',EnableImages:false,EnableUserData:false,EnableTotalRecordCount:true}),{
                alive:()=>valid(ticket),progress:(n,total)=>{status.textContent=`读取已有元数据 ${n}/${total}，不会扫描磁盘`;}
            });
            if (!valid(ticket)) return expire(ticket);
            for (const [key,values] of Object.entries(f.values)) {
                const list=fields.get(key)?.list;
                if (list) for(const v of values) list.append(el('option',undefined,{value:v}));
            }
            people = f.people; renderPeople();
            status.textContent=f.complete ? `候选项已读取：${f.count} 条元数据` : `仅载入前 ${f.count}/${f.total} 条的候选项；仍可手输，查询结果不受此上限限制`;
        } catch(e) { if(ticket===epoch) status.textContent=e.message; }
        finally { if(ticket===epoch) candidateButton.disabled=false; }
    }
    function close() { ++epoch; host?.remove(); host=undefined; fields.clear(); people=[]; launch.focus(); }
    async function open() {
        if(host) return;
        host=el('div',undefined,{id:'jlf-host'}); shadow=host.attachShadow({mode:'open'});
        const style=el('style',window.JellyfinLibraryFilterCSS); shadow.append(style);
        const dialog=el('dialog'); shadow.append(dialog); document.body.append(host);
        dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
        const top=el('header'); const exit=el('button','关闭'); exit.onclick=close;
        top.append(el('h2','高级组合筛选'),exit); dialog.append(top);
        dialog.append(el('p','不同字段同时满足。第一版分类字段每次选一个值；语言代码可用逗号列出候选，按服务器语义匹配。'));
        const tools=el('div',undefined,{class:'tools'});
        library=el('select',undefined,{'aria-label':'媒体库'}); option(library,'','全部可访问媒体库');
        candidateButton=el('button','读取该库筛选候选'); candidateButton.onclick=candidates;
        tools.append(library,candidateButton); dialog.append(tools);
        form=el('form'); dialog.append(form);
        const groups=new Map();
        for(const f of core.schema) {
            if(!groups.has(f.group)) {
                const d=el('details'); if(['基本','人物与分类'].includes(f.group)) d.open=true;
                d.append(el('summary',f.group)); const grid=el('div',undefined,{class:'grid'});d.append(grid);form.append(d);groups.set(f.group,grid);
            }
            const label=el('label',f.label); let input,list;
            if(f.type==='bool' || f.type==='select') {
                input=el('select'); option(input,'','不限');
                if(f.type==='bool') {option(input,'true','是');option(input,'false','否');}
                else for(const v of f.options) option(input,v,v);
            } else {
                input=el('input',undefined,{type:f.type==='date'?'date':['integer','rating','percent'].includes(f.type)?'number':'text'});
                if(['facet','years'].includes(f.type)) {list=el('datalist',undefined,{id:'jlf-'+f.key});input.setAttribute('list','jlf-'+f.key);label.append(list);}
                if(['rating','percent'].includes(f.type)) input.step='any';
            }
            input.name=f.key; label.append(input);groups.get(f.group).append(label); fields.set(f.key,{input,list});
        }
        const searchLabel=el('label','演员 / 人物关键词（模糊匹配）');
        personSearch=el('input',undefined,{type:'search',placeholder:'输入部分姓名，如 唐尼、Robert',maxlength:'100'});
        personHint=el('small',undefined,{'role':'status','aria-live':'polite',id:'jlf-person-hint'});
        personSearch.setAttribute('aria-describedby','jlf-person-hint'); searchLabel.append(personSearch,personHint);
        const label=el('label','匹配人物（请选择）');person=el('select',undefined,{size:'6'}); label.append(person);
        groups.get('人物与分类').prepend(searchLabel,label); renderPeople();
        personSearch.oninput=()=>{person.value='';renderPeople();};
        person.onchange=()=>{const i=fields.get('Person').input;i.disabled=Boolean(person.value);};
        const actions=el('div',undefined,{class:'tools'});queryButton=el('button','筛选',{type:'submit'});const reset=el('button','清空条件',{type:'button'});
        reset.onclick=()=>{++epoch;form.reset();person.value='';renderPeople();fields.get('Person').input.disabled=false;clearResults();queryButton.disabled=false;candidateButton.disabled=false;status.textContent='条件已清空';};
        form.addEventListener('input',()=>{++epoch;clearResults();queryButton.disabled=false;candidateButton.disabled=false;status.textContent='条件已改变，请重新筛选';});
        actions.append(queryButton,reset);form.append(actions);form.onsubmit=e=>{e.preventDefault();run(0);};
        status=el('p','请设置条件后查询',{'role':'status','aria-live':'polite','aria-label':'查询状态'});results=el('div',undefined,{class:'results'});dialog.append(status,results);
        const paging=el('div',undefined,{class:'tools'});previous=el('button','上一页');next=el('button','下一页');previous.disabled=next.disabled=true;
        previous.onclick=()=>run(Math.max(0,page-48));next.onclick=()=>run(page+48);paging.append(previous,next);dialog.append(paging);
        library.onchange=()=>{++epoch;resetCandidates();clearResults();form.reset();fields.get('Person').input.disabled=false;candidateButton.disabled=false;queryButton.disabled=false;status.textContent='媒体库已切换，候选项已清空';};
        dialog.showModal();
        const ticket=++epoch;
        try {
            const c=client();activeUser=c.user;activeClient=c.api;
            const views=await c.api.getUserViews(c.user);
            if(!valid(ticket)) return expire(ticket);
            for(const v of views.Items || []) option(library,v.Id,v.Name);
        } catch(e) {if(ticket===epoch) status.textContent=e.message;}
    }
    const launch=el('button','高级筛选',{id:'jlf-launch','aria-label':'打开高级组合筛选'});
    launch.style.cssText='position:fixed;right:20px;bottom:24px;z-index:9999;padding:10px 16px;background:#1459b8;color:white;border:1px solid #81b7ff;border-radius:24px;cursor:pointer';
    launch.onclick=open;document.body.append(launch);
    // Navigation invalidates any pending request and destroys private in-memory results.
    window.addEventListener('hashchange',close);
    window.JellyfinLibraryFilter={open,close};
})();
