import{i as e,s as t}from"./preload-helper-UTqDGU-u.js";import{t as n}from"./react-BiVEdM8e.js";import{t as r}from"./jsx-runtime-DALSLDfO.js";import{r as i,t as a}from"./utils-DvOUAHQN.js";import{i as o,n as s,r as c,t as l}from"./Popover-Dxz94WMd.js";function u(e){return e===0?`Debut`:String(e)}function d({min:e,max:t}){return e===null&&t===null?`Level`:e===null?`Level ≤ ${u(t)}`:t===null?`Level ≥ ${u(e)}`:e===t?`Level: only ${u(e)}`:`Level: ${u(Math.min(e,t))}–${u(Math.max(e,t))}`}function f(e){return e===``?null:Number(e)}var p,m,h,g,_,v=e((()=>{o(),i(),p=r(),m=[0,1,2,3,4,5,6,7,8,9,10],h=a(`inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-sm`,`shadow-xs hover:bg-muted aria-expanded:bg-muted`,`focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`),g=a(`h-8 w-[84px] rounded-md border border-border bg-background px-2 text-sm tabular-nums`,`hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`),_=({value:e,onChange:t,levels:n=m,defaultOpen:r=!1,className:i})=>{let o=e.min!==null||e.max!==null;return(0,p.jsxs)(l,{defaultOpen:r,children:[(0,p.jsxs)(c,{type:`button`,"data-slot":`level-filter`,className:a(h,i),children:[(0,p.jsx)(`span`,{children:d(e)}),(0,p.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem] text-muted-foreground`,"aria-hidden":`true`,children:`expand_more`})]}),(0,p.jsxs)(s,{className:`w-72 p-0`,children:[(0,p.jsx)(`p`,{className:`px-2 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase`,children:`difficulty range`}),(0,p.jsxs)(`div`,{className:`flex items-center gap-2 px-2 pt-1 pb-2`,children:[(0,p.jsxs)(`label`,{className:`flex items-center gap-1.5 text-xs text-muted-foreground uppercase`,children:[`Min`,(0,p.jsxs)(`select`,{"aria-label":`Minimum level`,value:e.min===null?``:String(e.min),onChange:n=>t({...e,min:f(n.target.value)}),className:g,children:[(0,p.jsx)(`option`,{value:``,children:`—`}),n.map(e=>(0,p.jsx)(`option`,{value:e,children:u(e)},e))]})]}),(0,p.jsx)(`span`,{className:`text-muted-foreground`,"aria-hidden":`true`,children:`–`}),(0,p.jsxs)(`label`,{className:`flex items-center gap-1.5 text-xs text-muted-foreground uppercase`,children:[`Max`,(0,p.jsxs)(`select`,{"aria-label":`Maximum level`,value:e.max===null?``:String(e.max),onChange:n=>t({...e,max:f(n.target.value)}),className:g,children:[(0,p.jsx)(`option`,{value:``,children:`—`}),n.map(e=>(0,p.jsx)(`option`,{value:e,children:u(e)},e))]})]})]}),o&&(0,p.jsx)(`div`,{className:`border-t border-border p-1`,children:(0,p.jsxs)(`button`,{type:`button`,onClick:()=>t({min:null,max:null}),className:a(`flex w-full items-center justify-center gap-1 rounded-sm px-2 py-1.5 text-sm`,`text-muted-foreground hover:bg-muted hover:text-foreground`,`focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none`),children:[(0,p.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem]`,"aria-hidden":`true`,children:`close`}),`Clear`]})})]})]})},_.__docgenInfo={description:``,methods:[],displayName:`LevelFilter`,props:{value:{required:!0,tsType:{name:`LevelRange`},description:``},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(next: LevelRange) => void`,signature:{arguments:[{type:{name:`LevelRange`},name:`next`}],return:{name:`void`}}},description:``},levels:{required:!1,tsType:{name:`unknown`},description:`Selectable levels, low → high. Default 0..10 (0 = Debut).`,defaultValue:{value:`[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`,computed:!1}},defaultOpen:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},className:{required:!1,tsType:{name:`string`},description:``}}}})),y,b,x,S,C,w,T,E,D,O,k;e((()=>{y=t(n(),1),v(),b=r(),{fn:x}=__STORYBOOK_MODULE_TEST__,S={title:`UI/LevelFilter`,component:_,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,b.jsx)(`div`,{className:`relative min-h-56 w-72`,children:(0,b.jsx)(e,{})})],args:{value:{min:null,max:null},onChange:x()}},C={render:e=>{let[t,n]=(0,y.useState)({min:null,max:null});return(0,b.jsx)(_,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},w={render:e=>{let[t,n]=(0,y.useState)({min:null,max:4});return(0,b.jsx)(_,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},defaultOpen:!0})}},T={render:e=>{let[t,n]=(0,y.useState)({min:2,max:null});return(0,b.jsx)(_,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},defaultOpen:!0})}},E={render:e=>{let[t,n]=(0,y.useState)({min:2,max:6});return(0,b.jsx)(_,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},defaultOpen:!0})}},D={render:e=>{let[t,n]=(0,y.useState)({min:3,max:3});return(0,b.jsx)(_,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},defaultOpen:!0})}},O={render:e=>{let[t,n]=(0,y.useState)({min:null,max:0});return(0,b.jsx)(_,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},defaultOpen:!0})}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<LevelRange>({
      min: null,
      max: null
    });
    return <LevelFilter {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<LevelRange>({
      min: null,
      max: 4
    });
    return <LevelFilter {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} defaultOpen />;
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<LevelRange>({
      min: 2,
      max: null
    });
    return <LevelFilter {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} defaultOpen />;
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<LevelRange>({
      min: 2,
      max: 6
    });
    return <LevelFilter {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} defaultOpen />;
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<LevelRange>({
      min: 3,
      max: 3
    });
    return <LevelFilter {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} defaultOpen />;
  }
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<LevelRange>({
      min: null,
      max: 0
    });
    return <LevelFilter {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} defaultOpen />;
  }
}`,...O.parameters?.docs?.source}}},k=[`Unset`,`MaxOnly`,`MinOnly`,`Range`,`Only`,`Debut`]}))();export{O as Debut,w as MaxOnly,T as MinOnly,D as Only,E as Range,C as Unset,k as __namedExportsOrder,S as default};