import{i as e,s as t}from"./preload-helper-BH_2JI0G.js";import{t as n}from"./react-Tdv_pPbI.js";import{t as r}from"./jsx-runtime-ByNAQkru.js";import{r as i,t as a}from"./Button-96P4Tr0-.js";import{n as o,t as s}from"./Checkbox-x0CnMB9a.js";import{d as c,o as l,r as u,t as d}from"./Field-CUZWaADc.js";import{n as f,t as p}from"./Input-yIMovumd.js";import{n as m,t as h}from"./Slider-BkjSaBSS.js";import{n as g,t as _}from"./SliderDraft-B29MlAKJ.js";import{n as v,t as y}from"./NativeSelect-DWBBM_Tw.js";var b,x,S,C=e((()=>{b=t(n(),1),i(),o(),c(),f(),v(),m(),_(),x=r(),S=({id:e,label:t,control:n,value:r,onChange:i,onAction:o,description:c,disabled:f=!1,className:m,..._})=>{let v=`${e}-label`,S=g(Number(r),i),C=e=>{let{min:t,max:r}=n;return Math.min(r??e,Math.max(t??e,e))},w=(e,t=!1)=>{let n=Number(e);e.trim()===``||Number.isNaN(n)||i(t?C(n):n)},[T,E]=(0,b.useState)(null),D=()=>{if(T===null)return;let e=T.trim().replaceAll(/\s+/g,` `);(!(n.kind===`text`&&n.validate)||n.validate(e))&&i(e),E(null)};return(0,x.jsxs)(d,{"data-slot":`setting-row`,orientation:`vertical`,className:m,..._,children:[(0,x.jsxs)(`div`,{"data-slot":`setting-row-line`,className:`flex min-h-11 w-full items-center justify-between gap-3`,children:[(0,x.jsxs)(l,{htmlFor:n.kind===`action`?void 0:e,id:v,className:`flex min-h-11 min-w-11 flex-1 items-center justify-between gap-3`,children:[t,n.kind===`toggle`?(0,x.jsx)(s,{id:e,checked:!!r,onCheckedChange:e=>i(!!e),disabled:f}):null]}),n.kind===`number`?(0,x.jsx)(p,{id:e,type:`number`,min:n.min,max:n.max,step:n.step,value:String(r),onChange:e=>w(e.target.value),onBlur:e=>w(e.target.value,!0),onKeyDown:e=>{e.key===`Enter`&&w(e.currentTarget.value,!0)},disabled:f,className:`h-11 w-28`}):null,n.kind===`text`?(0,x.jsx)(p,{id:e,type:`text`,value:T??String(r),onChange:e=>E(e.target.value),onBlur:D,onKeyDown:e=>{e.key===`Enter`&&D()},disabled:f,className:`h-11 w-40`}):null,n.kind===`color`?(0,x.jsx)(p,{id:e,type:`color`,value:String(r),onChange:e=>i(e.target.value),disabled:f,className:`h-11 w-40 p-1`}):null,n.kind===`action`?(0,x.jsx)(a,{id:e,variant:`outline`,onClick:()=>o?.(),disabled:f,className:`h-11`,children:n.actionLabel}):null,n.kind===`select`?(0,x.jsx)(y,{id:e,value:String(r),onChange:e=>i(e.target.value),disabled:f,className:`h-11 w-44`,children:n.options.map(e=>(0,x.jsx)(`option`,{value:e.value,children:e.label},e.value))}):null,n.kind===`range`?(0,x.jsx)(p,{id:e,type:`number`,min:n.min,max:n.max,step:n.step,value:String(S.value),onChange:e=>w(e.target.value),onBlur:e=>w(e.target.value,!0),onKeyDown:e=>{e.key===`Enter`&&w(e.currentTarget.value,!0)},disabled:f,className:`h-11 w-28`}):null]}),n.kind===`range`?(0,x.jsx)(h,{...S,min:n.min,max:n.max,step:n.step??1,label:t,disabled:f}):null,c?(0,x.jsx)(u,{children:c}):null]})},S.__docgenInfo={description:``,methods:[],displayName:`SettingRow`,props:{disabled:{defaultValue:{value:`false`,computed:!1},required:!1}}}})),w,T,E,D,O,k,A,j,M,N,P,F,I;e((()=>{C(),w=r(),{fn:T}=__STORYBOOK_MODULE_TEST__,E={title:`UI/SettingRow`,component:S,parameters:{layout:`padded`},tags:[`autodocs`],args:{onChange:T(),onAction:T()},decorators:[e=>(0,w.jsx)(`div`,{className:`w-96`,children:(0,w.jsx)(e,{})})]},D={args:{id:`show-cursors`,label:`Show cursors`,control:{kind:`toggle`},value:!0}},O={args:{id:`scale`,label:`Scale`,control:{kind:`number`,min:.5,max:2,step:.1},value:1}},k={args:{id:`zoom`,label:`Zoom`,control:{kind:`range`,min:.25,max:3,step:.05},value:1}},A={args:{id:`notation-font`,label:`Notation font`,control:{kind:`text`},value:`bold 12px Georgia`}},j={args:{id:`staff-line-color`,label:`Staff line colour`,control:{kind:`color`},value:`#2DD4BF`}},M={args:{id:`layout-mode`,label:`Layout mode`,control:{kind:`select`,options:[{value:`page`,label:`Page`},{value:`horizontal`,label:`Horizontal`}]},value:`page`}},N={args:{id:`export-midi`,label:`MIDI file`,control:{kind:`action`,actionLabel:`Export MIDI`},value:``}},P={args:{id:`show-cursors`,label:`Show cursors`,control:{kind:`toggle`},value:!1,disabled:!0}},F={args:{id:`vibrato-length`,label:`Wide note vibrato: length`,control:{kind:`number`,min:0},value:240,description:`Rebuilds the MIDI to take effect — this stops playback and rewinds to the start.`}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'show-cursors',
    label: 'Show cursors',
    control: {
      kind: 'toggle'
    },
    value: true
  }
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'scale',
    label: 'Scale',
    control: {
      kind: 'number',
      min: 0.5,
      max: 2,
      step: 0.1
    },
    value: 1
  }
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'zoom',
    label: 'Zoom',
    control: {
      kind: 'range',
      min: 0.25,
      max: 3,
      step: 0.05
    },
    value: 1
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'notation-font',
    label: 'Notation font',
    control: {
      kind: 'text'
    },
    value: 'bold 12px Georgia'
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'staff-line-color',
    label: 'Staff line colour',
    control: {
      kind: 'color'
    },
    value: '#2DD4BF'
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'layout-mode',
    label: 'Layout mode',
    control: {
      kind: 'select',
      options: [{
        value: 'page',
        label: 'Page'
      }, {
        value: 'horizontal',
        label: 'Horizontal'
      }]
    },
    value: 'page'
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'export-midi',
    label: 'MIDI file',
    control: {
      kind: 'action',
      actionLabel: 'Export MIDI'
    },
    value: ''
  }
}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'show-cursors',
    label: 'Show cursors',
    control: {
      kind: 'toggle'
    },
    value: false,
    disabled: true
  }
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'vibrato-length',
    label: 'Wide note vibrato: length',
    control: {
      kind: 'number',
      min: 0
    },
    value: 240,
    description: 'Rebuilds the MIDI to take effect — this stops playback and rewinds to the start.'
  }
}`,...F.parameters?.docs?.source}}},I=[`Toggle`,`Number`,`Range`,`Text`,`Color`,`Select`,`Action`,`Disabled`,`WithDescription`]}))();export{N as Action,j as Color,P as Disabled,O as Number,k as Range,M as Select,A as Text,D as Toggle,F as WithDescription,I as __namedExportsOrder,E as default};