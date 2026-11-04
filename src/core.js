/* SPDX-License-Identifier: MIT */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.JellyfinLibraryFilterCore = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
    'use strict';
    const schema = [];
    function field(key, label, group, type = 'text', options) {
        schema.push({ key, label, group, type, options });
    }
    field('SearchTerm', '关键词', '基本');
    field('IncludeItemTypes', '媒体类型', '基本', 'select', ['Movie','Series','Episode','Video','Audio','MusicAlbum','MusicVideo','BoxSet','Book','Photo']);
    field('Person', '人物姓名（可手输）', '人物与分类');
    field('PersonTypes', '人物角色', '人物与分类', 'select', ['Actor','Director','Writer','Producer','GuestStar','Composer']);
    for (const [key, label] of Object.entries({Tags:'标签', Genres:'类型 / 流派', Studios:'工作室', OfficialRatings:'内容分级', Years:'发行年份', Artists:'音乐艺术家', Albums:'专辑'})) field(key,label,'人物与分类', key === 'Years' ? 'years' : 'facet');
    for (const [key, label] of Object.entries({IsPlayed:'已播放', IsFavorite:'收藏', IsMissing:'缺失集', IsUnaired:'尚未播出'})) field(key,label,'播放与状态','bool');
    for (const [key, label] of Object.entries({HasSubtitles:'有字幕', IsHd:'高清', Is4K:'4K', Is3D:'3D'})) field(key,label,'画面与语言','bool');
    field('AudioLanguages','音轨语言代码','画面与语言','csv');
    field('SubtitleLanguages','字幕语言代码','画面与语言','csv');
    field('VideoTypes','视频载体','画面与语言','select',['VideoFile','Iso','Dvd','BluRay']);
    for (const [key,label] of Object.entries({MinWidth:'最小宽度',MaxWidth:'最大宽度',MinHeight:'最小高度',MaxHeight:'最大高度'})) field(key,label,'画面与语言','integer');
    field('MinCommunityRating','最低社区评分（0–10）','评分与日期','rating');
    field('MinCriticRating','最低影评分（0–100）','评分与日期','percent');
    for (const [key,label] of Object.entries({MinPremiereDate:'最早首映日期',MaxPremiereDate:'最晚首映日期',MinDateLastSaved:'最早元数据更新时间',MinDateLastSavedForUser:'最早用户数据更新时间'})) field(key,label,'评分与日期','date');
    field('MinOfficialRating','最低内容分级','评分与日期');
    field('MaxOfficialRating','最高内容分级','评分与日期');
    field('SeriesStatus','剧集状态','播放与状态','select',['Continuing','Ended','Unreleased']);
    for (const [key,label] of Object.entries({HasOverview:'有简介',HasImdbId:'有 IMDb ID',HasTmdbId:'有 TMDB ID',HasTvdbId:'有 TVDB ID',HasOfficialRating:'有内容分级',HasParentalRating:'有家长分级',IsLocked:'元数据已锁定',IsPlaceHolder:'占位条目',HasTrailer:'有预告片',HasSpecialFeature:'有额外内容',HasThemeSong:'有主题曲',HasThemeVideo:'有主题视频'})) field(key,label,'元数据完整性','bool');
    field('NameStartsWith','名称前缀','基本');
    field('SortBy','排序','基本','select',['SortName','DateCreated','PremiereDate','ProductionYear','CommunityRating','CriticRating','Runtime','DatePlayed','PlayCount']);
    field('SortOrder','方向','基本','select',['Ascending','Descending']);
    const guid = /^[a-f\d]{32}$|^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
    function buildQuery(values, { userId, parentId, personId, start = 0, limit = 48 } = {}) {
        if (!guid.test(userId || '')) throw new Error('请先登录 Jellyfin 用户账号');
        if (parentId && !guid.test(parentId)) throw new Error('无效媒体库 ID');
        if (personId && !guid.test(personId)) throw new Error('无效人物 ID');
        if (!Number.isInteger(start) || start < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('分页参数无效');
        const q = {UserId:userId, Recursive:true, StartIndex:start, Limit:limit, EnableTotalRecordCount:true, EnableUserData:true, Fields:'PrimaryImageAspectRatio', SortBy:'SortName', SortOrder:'Ascending'};
        if (parentId) q.ParentId = parentId;
        for (const f of schema) {
            const raw = values[f.key];
            if (raw === undefined || raw === null || raw === '') continue;
            const s = String(raw).trim();
            if (!s) continue;
            if (s.length > 500) throw new Error(f.label + '过长');
            let v = s;
            if (f.type === 'bool') {
                if (!['true','false'].includes(s)) throw new Error(f.label + '值无效');
                v = s === 'true';
            } else if (f.type === 'select' && !f.options.includes(s)) throw new Error(f.label + '选项无效');
            else if (['integer','rating','percent'].includes(f.type)) {
                v = Number(s);
                const max = f.type === 'rating' ? 10 : f.type === 'percent' ? 100 : 32768;
                if (!Number.isFinite(v) || v < 0 || v > max || (f.type === 'integer' && !Number.isInteger(v))) throw new Error(f.label + '范围无效');
            } else if (f.type === 'date') {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s)) || new Date(s).toISOString().slice(0,10) !== s) throw new Error(f.label + '日期无效');
                v = s + (f.key.startsWith('Max') ? 'T23:59:59.999Z' : 'T00:00:00.000Z');
            } else if (f.type === 'years' && !/^\d{4}$/.test(s)) throw new Error('年份须为四位数字');
            else if (f.type === 'csv' && !/^[a-zA-Z-]+(?:,[a-zA-Z-]+)*$/.test(s)) throw new Error('语言代码使用逗号分隔，例如 zho,eng');
            else if (f.type === 'facet' && s.includes('|')) throw new Error(f.label + '暂不支持包含 | 的值');
            q[f.key] = v;
        }
        if (personId) { q.PersonIds = personId; delete q.Person; }
        if (!q.Person && !q.PersonIds) delete q.PersonTypes;
        for (const [lo,hi] of [['MinWidth','MaxWidth'],['MinHeight','MaxHeight'],['MinPremiereDate','MaxPremiereDate']]) if (q[lo] !== undefined && q[hi] !== undefined && q[lo] > q[hi]) throw new Error('最小值不能大于最大值');
        if (q.HasSubtitles === false && q.SubtitleLanguages) throw new Error('“无字幕”不能同时指定字幕语言');
        if (q.IsHd === false && q.Is4K === true) throw new Error('非高清与 4K 条件冲突');
        return q;
    }
    function facets(items) {
        const sets = Object.fromEntries(['Tags','Genres','Studios','OfficialRatings','Years','Artists','Albums'].map(k => [k,new Set()]));
        const people = new Map();
        for (const i of items) {
            for (const k of ['Tags','Genres','Artists']) for (const v of i[k] || []) if (typeof v === 'string') sets[k].add(v);
            for (const v of i.Studios || []) if (v.Name) sets.Studios.add(v.Name);
            if (i.OfficialRating) sets.OfficialRatings.add(i.OfficialRating);
            if (i.ProductionYear) sets.Years.add(String(i.ProductionYear));
            if (i.Album) sets.Albums.add(i.Album);
            for (const v of i.People || []) if (guid.test(v.Id || '') && v.Name) people.set(v.Id, {Id:v.Id, Name:v.Name, Type:v.Type || 'Unknown'});
        }
        return {values:Object.fromEntries(Object.entries(sets).map(([k,s]) => [k,[...s].sort((a,b)=>a.localeCompare(b))])), people:[...people.values()].sort((a,b)=>a.Name.localeCompare(b.Name))};
    }
    // Do not expose partial data as complete. Cancellation also covers account changes.
    async function loadFacets(fetchPage, { alive = () => true, progress = () => {}, max = 10000 } = {}) {
        const all = [];
        let total = 0;
        do {
            if (!alive()) throw new Error('读取已取消');
            const page = await fetchPage(all.length, Math.min(200,max-all.length));
            if (!alive()) throw new Error('读取已取消');
            if (!Array.isArray(page.Items) || !Number.isInteger(page.TotalRecordCount)) throw new Error('服务器未返回有效分页结果');
            total = page.TotalRecordCount;
            if (!page.Items.length && all.length < total) throw new Error('候选项分页中断，请重试');
            all.push(...page.Items); progress(all.length,total);
        } while (all.length < total && all.length < max);
        return {...facets(all), complete:all.length >= total, count:all.length, total};
    }
    return {schema,buildQuery,facets,loadFacets};
});
