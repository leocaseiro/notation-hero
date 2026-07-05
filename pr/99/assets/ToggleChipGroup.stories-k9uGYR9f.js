import{i as e,s as t}from"./preload-helper-UTqDGU-u.js";import{t as n}from"./react-BiVEdM8e.js";import{t as r}from"./jsx-runtime-DALSLDfO.js";import{n as i,t as a}from"./utils-WM9gdYfb.js";import{n as o,r as s,t as c}from"./dist-Cld0Kmab.js";function l(e){return e.map(e=>(0,u.jsxs)(s,{value:e.value,disabled:e.disabled,"data-slot":`toggle-chip`,className:d,children:[e.icon?(0,u.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,children:e.icon}):null,e.label]},e.value))}var u,d,f,p=e((()=>{c(),i(),u=r(),d=a(`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors outline-none`,`border border-border bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]`,`data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground`,`focus-visible:ring-3 focus-visible:ring-ring/50`,`disabled:pointer-events-none disabled:opacity-50`,`[&_.material-symbols-outlined]:text-[1.125rem]`),f=({options:e,value:t,onChange:n,type:r=`multiple`,disabled:i,"aria-label":s,className:c})=>{let d={"data-slot":`toggle-chip-group`,className:a(`flex flex-wrap gap-2`,c),...i!==void 0&&{disabled:i},...s!==void 0&&{"aria-label":s}};return r===`single`?(0,u.jsx)(o,{type:`single`,value:t[0]??``,onValueChange:e=>n(e?[e]:[]),...d,children:l(e)}):(0,u.jsx)(o,{type:`multiple`,value:t,onValueChange:n,...d,children:l(e)})},f.__docgenInfo={description:``,methods:[],displayName:`ToggleChipGroup`,props:{options:{required:!0,tsType:{name:`unknown`},description:`Chips to render, in order.`},value:{required:!0,tsType:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},description:`Selected values (length <= 1 when type='single').`},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(next: string[]) => void`,signature:{arguments:[{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`next`}],return:{name:`void`}}},description:`Fires with the next selection; always a string[] regardless of type.`},type:{required:!1,tsType:{name:`union`,raw:`'single' | 'multiple'`,elements:[{name:`literal`,value:`'single'`},{name:`literal`,value:`'multiple'`}]},description:`'multiple' (default) lets many chips be on; 'single' keeps at most one.`,defaultValue:{value:`'multiple'`,computed:!1}},disabled:{required:!1,tsType:{name:`boolean`},description:`Disable the whole group.`},"aria-label":{required:!1,tsType:{name:`string`},description:`Accessible name for the group (there is no visible label).`},className:{required:!1,tsType:{name:`string`},description:``}}}})),m,h,g,_,v,y,b,x,S,C,w,T;e((()=>{m=t(n(),1),p(),h=r(),{fn:g}=__STORYBOOK_MODULE_TEST__,_=[{value:`4/4`,label:`4/4`},{value:`3/4`,label:`3/4`},{value:`6/8`,label:`6/8`},{value:`7/8`,label:`7/8`},{value:`5/4`,label:`5/4`}],v=[{value:`timing`,label:`Timing`,icon:`timer`},{value:`independence`,label:`Independence`,icon:`call_split`},{value:`control`,label:`Control`,icon:`tune`},{value:`coordination`,label:`Coordination`,icon:`sync`},{value:`speed`,label:`Speed`,icon:`speed`}],y={title:`UI/ToggleChipGroup`,component:f,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,h.jsx)(`div`,{className:`max-w-md`,children:(0,h.jsx)(e,{})})],args:{options:_,value:[],onChange:g(),"aria-label":`Time signature`},argTypes:{disabled:{control:`boolean`}}},b={render:e=>{let[t,n]=(0,m.useState)([`4/4`]);return(0,h.jsx)(f,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},x={args:{options:v,"aria-label":`Skills`},render:e=>{let[t,n]=(0,m.useState)([`timing`,`speed`]);return(0,h.jsx)(f,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},S={args:{type:`single`},render:e=>{let[t,n]=(0,m.useState)([`3/4`]);return(0,h.jsx)(f,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},C={render:e=>{let[t,n]=(0,m.useState)([]);return(0,h.jsx)(f,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},w={args:{value:[`4/4`],disabled:!0}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<string[]>(['4/4']);
    return <ToggleChipGroup {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    options: SKILLS,
    'aria-label': 'Skills'
  },
  render: args => {
    const [value, setValue] = useState<string[]>(['timing', 'speed']);
    return <ToggleChipGroup {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    type: 'single'
  },
  render: args => {
    const [value, setValue] = useState<string[]>(['3/4']);
    return <ToggleChipGroup {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<string[]>([]);
    return <ToggleChipGroup {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    value: ['4/4'],
    disabled: true
  }
}`,...w.parameters?.docs?.source}}},T=[`Default`,`Skills`,`Single`,`NoneSelected`,`Disabled`]}))();export{b as Default,w as Disabled,C as NoneSelected,S as Single,x as Skills,T as __namedExportsOrder,y as default};