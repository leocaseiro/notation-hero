import{i as e}from"./preload-helper-BhTi32pF.js";import{t}from"./jsx-runtime-CWQYJtLW.js";import{w as n}from"./iframe-Dn9TWQj2.js";import{n as r,t as i}from"./NameCell-Cpc8qH3f.js";import{n as a,t as o}from"./Bpm-qHSC4gWw.js";import{n as s,t as c}from"./DataTable-D9LGHkbL.js";import{n as l,t as u}from"./LevelPill-hoLOh7lI.js";import{n as d,t as f}from"./PlayButton-s7668hQa.js";import{n as p,t as m}from"./ScoreDonut-Dk8MKrHU.js";function h(e){return e.id}var g,_,v,y,b=e((()=>{g=n(),r(),a(),s(),l(),d(),p(),_=t(),v=[{accessorKey:`title`,header:`Name`,cell:({row:e})=>(0,_.jsx)(i,{row:e.original})},{accessorKey:`level`,header:`Level`,meta:{align:`center`},cell:({getValue:e})=>(0,_.jsx)(u,{level:e()})},{accessorKey:`bpm`,header:`BPM`,meta:{align:`center`},cell:({getValue:e})=>(0,_.jsx)(o,{value:e()})},{accessorKey:`best`,header:`Best`,meta:{align:`center`},sortDescFirst:!0,cell:({getValue:e})=>(0,_.jsx)(m,{score:e()})},{id:`play`,header:``,enableSorting:!1,meta:{align:`right`}}],y=e=>{let t=(0,g.c)(14),{data:n,onOpen:r,onPlay:i,isLoading:a,columnVisibility:o}=e,s;t[0]===i?s=t[1]:(s=v.map(e=>e.id===`play`?{...e,cell:e=>{let{row:t}=e;return(0,_.jsx)(f,{title:t.original.title,onClick:()=>i?.(t.original)})}}:e),t[0]=i,t[1]=s);let l=s,u;t[2]===r?u=t[3]:(u=r?{onRowClick:r}:{},t[2]=r,t[3]=u);let d;t[4]===a?d=t[5]:(d=a===void 0?{}:{isLoading:a},t[4]=a,t[5]=d);let p;t[6]===o?p=t[7]:(p=o?{columnVisibility:o}:{},t[6]=o,t[7]=p);let m;return t[8]!==l||t[9]!==n||t[10]!==u||t[11]!==d||t[12]!==p?(m=(0,_.jsx)(c,{data:n,columns:l,appearance:`cards`,getRowId:h,...u,...d,...p,emptyState:`No pieces found — adjust your filters`}),t[8]=l,t[9]=n,t[10]=u,t[11]=d,t[12]=p,t[13]=m):m=t[13],m},y.__docgenInfo={description:``,methods:[],displayName:`CatalogTable`}})),x,S,C,w,T,E,D,O,k,A,j,M,N;e((()=>{b(),x=t(),S={id:`1`,title:`Billie Jean`,subtitle:`Pop · 4/4`,kind:`song`,icon:`music_note`,level:3,bpm:117,best:74,flags:{audio:!0,video:!0}},C={id:`2`,title:`Seven Nation Army`,subtitle:`Rock · 4/4`,kind:`song`,icon:`music_note`,level:1,bpm:124,best:96,isNew:!0},w=[S,C,{id:`3`,title:`Take Five`,subtitle:`Jazz · 5/4`,kind:`song`,icon:`music_note`,level:8,bpm:174,best:null,flags:{audio:!0}}],T=[{id:`l1`,title:`Single-stroke timing`,subtitle:`4 steps · timing`,kind:`rudiment`,isLesson:!0,icon:`school`,level:0,bpm:`60→120`,best:40,flags:{parts:!0}},{id:`l2`,title:`Four-on-the-floor`,subtitle:`House groove`,kind:`beat`,isLesson:!0,icon:`school`,level:2,bpm:120,best:100}],E={title:`Catalog/CatalogTable`,component:y,parameters:{layout:`padded`},tags:[`autodocs`]},D={args:{data:w,onOpen:()=>{},onPlay:()=>{}}},O={args:{data:T,onOpen:()=>{},onPlay:()=>{}}},k={args:{data:[]}},A={args:{data:[{...C,best:100}],onOpen:()=>{},onPlay:()=>{}}},j={args:{data:[...w,...T],onOpen:()=>{},onPlay:()=>{}}},M={render:()=>(0,x.jsx)(`div`,{style:{width:480},children:(0,x.jsx)(y,{data:[...w,...T],columnVisibility:{bpm:!1},onOpen:()=>{},onPlay:()=>{}})})},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    data: songs,
    onOpen: () => {},
    onPlay: () => {}
  }
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    data: lessons,
    onOpen: () => {},
    onPlay: () => {}
  }
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    data: []
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    data: [{
      ...sevenNationArmy,
      best: 100
    }],
    onOpen: () => {},
    onPlay: () => {}
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    data: [...songs, ...lessons],
    onOpen: () => {},
    onPlay: () => {}
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: 480
  }}>
      <CatalogTable data={[...songs, ...lessons]} columnVisibility={{
      bpm: false
    }} onOpen={() => {}} onPlay={() => {}} />
    </div>
}`,...M.parameters?.docs?.source}}},N=[`Songs`,`Lessons`,`Empty`,`Mastered`,`Mixed`,`Narrow`]}))();export{k as Empty,O as Lessons,A as Mastered,j as Mixed,M as Narrow,D as Songs,N as __namedExportsOrder,E as default};