import{i as e,s as t}from"./preload-helper-5KMRd62L.js";import{t as n}from"./react-3PF1OTik.js";import{t as r}from"./jsx-runtime-Czga0Dmp.js";import{i,r as a,t as o}from"./utils-Be66Tx_j.js";import{n as s,r as c,t as l}from"./Button-r8Q_AACv.js";import{i as u,n as d,r as f,t as p}from"./Popover-DPzsof5I.js";function m(e){return e===0?`Debut`:String(e)}function h({min:e,max:t}){return e===null&&t===null?`Level`:e===null?`Level ≤ ${m(t)}`:t===null?`Level ≥ ${m(e)}`:e===t?`Level: only ${m(e)}`:`Level: ${m(Math.min(e,t))}–${m(Math.max(e,t))}`}function g(e){return e===``?null:Number(e)}var _,v,y,b,x,S=e((()=>{c(),u(),a(),_=r(),v=[0,1,2,3,4,5,6,7,8,9,10],y=s({variant:`outline`}),b=o(i,`h-8 w-[84px] px-2 text-sm tabular-nums hover:bg-muted dark:hover:bg-input/50`,`focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`),x=({value:e,onChange:t,levels:n=v,defaultOpen:r=!1,className:i})=>{let a=e.min!==null||e.max!==null;return(0,_.jsxs)(p,{defaultOpen:r,children:[(0,_.jsxs)(f,{type:`button`,"data-slot":`level-filter`,className:o(y,i),children:[(0,_.jsx)(`span`,{children:h(e)}),(0,_.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem] text-muted-foreground`,"aria-hidden":`true`,children:`expand_more`})]}),(0,_.jsxs)(d,{className:`w-72 p-0`,children:[(0,_.jsx)(`p`,{className:`px-2 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase`,children:`difficulty range`}),(0,_.jsxs)(`div`,{className:`flex items-center gap-2 px-2 pt-1 pb-2`,children:[(0,_.jsxs)(`label`,{className:`flex items-center gap-1.5 text-xs text-muted-foreground uppercase`,children:[`Min`,(0,_.jsxs)(`select`,{"aria-label":`Minimum level`,value:e.min===null?``:String(e.min),onChange:n=>t({...e,min:g(n.target.value)}),className:b,children:[(0,_.jsx)(`option`,{value:``,children:`—`}),n.map(e=>(0,_.jsx)(`option`,{value:e,children:m(e)},e))]})]}),(0,_.jsx)(`span`,{className:`text-muted-foreground`,"aria-hidden":`true`,children:`–`}),(0,_.jsxs)(`label`,{className:`flex items-center gap-1.5 text-xs text-muted-foreground uppercase`,children:[`Max`,(0,_.jsxs)(`select`,{"aria-label":`Maximum level`,value:e.max===null?``:String(e.max),onChange:n=>t({...e,max:g(n.target.value)}),className:b,children:[(0,_.jsx)(`option`,{value:``,children:`—`}),n.map(e=>(0,_.jsx)(`option`,{value:e,children:m(e)},e))]})]})]}),a&&(0,_.jsx)(`div`,{className:`border-t border-border p-1`,children:(0,_.jsxs)(l,{variant:`ghost`,size:`sm`,onClick:()=>t({min:null,max:null}),className:`w-full justify-center text-muted-foreground`,children:[(0,_.jsx)(`span`,{className:`material-symbols-outlined text-[1.125rem]`,"aria-hidden":`true`,children:`close`}),`Clear`]})})]})]})},x.__docgenInfo={description:``,methods:[],displayName:`LevelFilter`,props:{value:{required:!0,tsType:{name:`LevelRange`},description:``},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(next: LevelRange) => void`,signature:{arguments:[{type:{name:`LevelRange`},name:`next`}],return:{name:`void`}}},description:``},levels:{required:!1,tsType:{name:`unknown`},description:`Selectable levels, low → high. Default 0..10 (0 = Debut).`,defaultValue:{value:`[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`,computed:!1}},defaultOpen:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},className:{required:!1,tsType:{name:`string`},description:``}}}})),C,w,T,E,D,O,k,A,j,M,N;e((()=>{C=t(n(),1),S(),w=r(),{fn:T}=__STORYBOOK_MODULE_TEST__,E={title:`UI/LevelFilter`,component:x,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,w.jsx)(`div`,{className:`relative min-h-56 w-72`,children:(0,w.jsx)(e,{})})],args:{value:{min:null,max:null},onChange:T()}},D={render:e=>{let[t,n]=(0,C.useState)({min:null,max:null});return(0,w.jsx)(x,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},O={render:e=>{let[t,n]=(0,C.useState)({min:null,max:4});return(0,w.jsx)(x,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},defaultOpen:!0})}},k={render:e=>{let[t,n]=(0,C.useState)({min:2,max:null});return(0,w.jsx)(x,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},defaultOpen:!0})}},A={render:e=>{let[t,n]=(0,C.useState)({min:2,max:6});return(0,w.jsx)(x,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},defaultOpen:!0})}},j={render:e=>{let[t,n]=(0,C.useState)({min:3,max:3});return(0,w.jsx)(x,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},defaultOpen:!0})}},M={render:e=>{let[t,n]=(0,C.useState)({min:null,max:0});return(0,w.jsx)(x,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},defaultOpen:!0})}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
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
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
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
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
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
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
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
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
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
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
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
}`,...M.parameters?.docs?.source}}},N=[`Unset`,`MaxOnly`,`MinOnly`,`Range`,`Only`,`Debut`]}))();export{M as Debut,O as MaxOnly,k as MinOnly,j as Only,A as Range,D as Unset,N as __namedExportsOrder,E as default};