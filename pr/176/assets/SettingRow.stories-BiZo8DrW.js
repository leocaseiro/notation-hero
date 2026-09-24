import{i as e,s as t}from"./preload-helper-D2Tj54I7.js";import{t as n}from"./react-oFBTHxA-.js";import{t as r}from"./jsx-runtime-Di7G22GK.js";import{r as i,t as a}from"./Button-B8m0vPb4.js";import{n as o,t as s}from"./Checkbox-CXEWeB8-.js";import{d as c,o as l,r as u,t as d}from"./Field-BlHsUFNK.js";import{n as f,t as p}from"./Input-CpHeQkEp.js";import{n as m,t as h}from"./Slider-CYrk97Nc.js";import{n as g,t as _}from"./NativeSelect-olaFP_1t.js";var v,y,b,x=e((()=>{v=t(n(),1),i(),o(),c(),f(),g(),m(),y=r(),b=({id:e,label:t,control:n,value:r,onChange:i,onAction:o,description:c,disabled:f=!1,className:m,...g})=>{let b=`${e}-label`,[x,S]=(0,v.useState)(null),C=e=>{let{min:t,max:r}=n;return Math.min(r??e,Math.max(t??e,e))},w=(e,t=!1)=>{let n=Number(e);e.trim()===``||Number.isNaN(n)||i(t?C(n):n)},[T,E]=(0,v.useState)(null),D=()=>{T!==null&&((!(n.kind===`text`&&n.validate)||n.validate(T))&&i(T),E(null))};return(0,y.jsxs)(d,{"data-slot":`setting-row`,orientation:`vertical`,className:m,...g,children:[(0,y.jsxs)(`div`,{"data-slot":`setting-row-line`,className:`flex min-h-11 w-full items-center justify-between gap-3`,children:[(0,y.jsxs)(l,{htmlFor:n.kind===`action`?void 0:e,id:b,className:`flex min-h-11 min-w-11 flex-1 items-center justify-between gap-3`,children:[t,n.kind===`toggle`?(0,y.jsx)(s,{id:e,checked:!!r,onCheckedChange:e=>i(!!e),disabled:f}):null]}),n.kind===`number`?(0,y.jsx)(p,{id:e,type:`number`,min:n.min,max:n.max,step:n.step,value:String(r),onChange:e=>w(e.target.value),onBlur:e=>w(e.target.value,!0),onKeyDown:e=>{e.key===`Enter`&&w(e.currentTarget.value,!0)},disabled:f,className:`h-11 w-28`}):null,n.kind===`text`?(0,y.jsx)(p,{id:e,type:`text`,value:T??String(r),onChange:e=>E(e.target.value),onBlur:D,onKeyDown:e=>{e.key===`Enter`&&D()},disabled:f,className:`h-11 w-40`}):null,n.kind===`color`?(0,y.jsx)(p,{id:e,type:`color`,value:String(r),onChange:e=>i(e.target.value),disabled:f,className:`h-11 w-40 p-1`}):null,n.kind===`action`?(0,y.jsx)(a,{id:e,variant:`outline`,onClick:()=>o?.(),disabled:f,className:`h-11`,children:n.actionLabel}):null,n.kind===`select`?(0,y.jsx)(_,{id:e,value:String(r),onChange:e=>i(e.target.value),disabled:f,className:`h-11 w-44`,children:n.options.map(e=>(0,y.jsx)(`option`,{value:e.value,children:e.label},e.value))}):null,n.kind===`range`?(0,y.jsx)(p,{id:e,type:`number`,min:n.min,max:n.max,step:n.step,value:String(x??r),onChange:e=>w(e.target.value),onBlur:e=>w(e.target.value,!0),onKeyDown:e=>{e.key===`Enter`&&w(e.currentTarget.value,!0)},disabled:f,className:`h-11 w-28`}):null]}),n.kind===`range`?(0,y.jsx)(h,{value:x??Number(r),onChange:S,onCommit:e=>{S(null),i(e)},min:n.min,max:n.max,step:n.step??1,label:t,disabled:f}):null,c?(0,y.jsx)(u,{children:c}):null]})},b.__docgenInfo={description:``,methods:[],displayName:`SettingRow`,props:{disabled:{defaultValue:{value:`false`,computed:!1},required:!1}}}})),S,C,w,T,E,D,O,k,A,j,M,N,P;e((()=>{x(),S=r(),{fn:C}=__STORYBOOK_MODULE_TEST__,w={title:`UI/SettingRow`,component:b,parameters:{layout:`padded`},tags:[`autodocs`],args:{onChange:C(),onAction:C()},decorators:[e=>(0,S.jsx)(`div`,{className:`w-96`,children:(0,S.jsx)(e,{})})]},T={args:{id:`show-cursors`,label:`Show cursors`,control:{kind:`toggle`},value:!0}},E={args:{id:`scale`,label:`Scale`,control:{kind:`number`,min:.5,max:2,step:.1},value:1}},D={args:{id:`zoom`,label:`Zoom`,control:{kind:`range`,min:.25,max:3,step:.05},value:1}},O={args:{id:`notation-font`,label:`Notation font`,control:{kind:`text`},value:`bold 12px Georgia`}},k={args:{id:`staff-line-color`,label:`Staff line colour`,control:{kind:`color`},value:`#2DD4BF`}},A={args:{id:`layout-mode`,label:`Layout mode`,control:{kind:`select`,options:[{value:`page`,label:`Page`},{value:`horizontal`,label:`Horizontal`}]},value:`page`}},j={args:{id:`export-midi`,label:`MIDI file`,control:{kind:`action`,actionLabel:`Export MIDI`},value:``}},M={args:{id:`show-cursors`,label:`Show cursors`,control:{kind:`toggle`},value:!1,disabled:!0}},N={args:{id:`vibrato-length`,label:`Wide note vibrato: length`,control:{kind:`number`,min:0},value:240,description:`Rebuilds the MIDI to take effect — this stops playback and rewinds to the start.`}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'show-cursors',
    label: 'Show cursors',
    control: {
      kind: 'toggle'
    },
    value: true
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
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
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
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
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'notation-font',
    label: 'Notation font',
    control: {
      kind: 'text'
    },
    value: 'bold 12px Georgia'
  }
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'staff-line-color',
    label: 'Staff line colour',
    control: {
      kind: 'color'
    },
    value: '#2DD4BF'
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
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
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'export-midi',
    label: 'MIDI file',
    control: {
      kind: 'action',
      actionLabel: 'Export MIDI'
    },
    value: ''
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    id: 'show-cursors',
    label: 'Show cursors',
    control: {
      kind: 'toggle'
    },
    value: false,
    disabled: true
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
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
}`,...N.parameters?.docs?.source}}},P=[`Toggle`,`Number`,`Range`,`Text`,`Color`,`Select`,`Action`,`Disabled`,`WithDescription`]}))();export{j as Action,k as Color,M as Disabled,E as Number,D as Range,A as Select,O as Text,T as Toggle,N as WithDescription,P as __namedExportsOrder,w as default};