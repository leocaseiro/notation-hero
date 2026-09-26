import{i as e,s as t}from"./preload-helper-ATQIgOUJ.js";import{t as n}from"./react-B8kcsa1g.js";import{t as r}from"./jsx-runtime-D6I6jW42.js";import{r as i,t as a}from"./utils-DTQ7HLDa.js";import{a as o,c as s,f as c,i as l,m as u,n as d,o as f,r as p,u as m}from"./SliderClasses-DOhnMxHm.js";var h,g,_=e((()=>{o(),l(),i(),h=r(),g=({value:e,onChange:t,min:n=0,max:r=100,step:i=1,minLabel:o=`Minimum`,maxLabel:l=`Maximum`,formatValue:g=String,unit:_,disabled:v=!1,className:y})=>{let[b,x]=e,S=_?` ${_}`:``,C=`${g(b)} – ${g(x)}${S}`;return(0,h.jsxs)(`div`,{"data-slot":`range-slider`,className:a(`flex flex-col gap-2`,y),children:[(0,h.jsx)(`output`,{"aria-hidden":`true`,className:`text-sm text-muted-foreground tabular-nums`,children:C}),(0,h.jsx)(u,{value:e,onValueChange:e=>t([e[0],e[1]]),min:n,max:r,step:i,minStepsBetweenValues:0,disabled:v,className:a(`relative flex h-5 w-full touch-none items-center select-none`,v&&`cursor-not-allowed opacity-50`),children:(0,h.jsx)(c,{className:`flex w-full items-center`,children:(0,h.jsxs)(m,{className:p,children:[(0,h.jsx)(f,{className:`absolute h-full rounded-full bg-primary`}),(0,h.jsx)(s,{index:0,"aria-label":o,className:d}),(0,h.jsx)(s,{index:1,"aria-label":l,className:d})]})})})]})},g.__docgenInfo={description:``,methods:[],displayName:`RangeSlider`,props:{value:{required:!0,tsType:{name:`tuple`,raw:`[number, number]`,elements:[{name:`number`},{name:`number`}]},description:`Controlled [min, max] selection.`},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(next: [number, number]) => void`,signature:{arguments:[{type:{name:`tuple`,raw:`[number, number]`,elements:[{name:`number`},{name:`number`}]},name:`next`}],return:{name:`void`}}},description:`Fires with the new [min, max] tuple whenever either thumb moves.`},min:{required:!1,tsType:{name:`number`},description:`Lowest selectable value.`,defaultValue:{value:`0`,computed:!1}},max:{required:!1,tsType:{name:`number`},description:`Highest selectable value.`,defaultValue:{value:`100`,computed:!1}},step:{required:!1,tsType:{name:`number`},description:`Increment per keystroke / drag tick.`,defaultValue:{value:`1`,computed:!1}},minLabel:{required:!1,tsType:{name:`string`},description:`Accessible name for the low thumb (Radix maps it to role="slider").`,defaultValue:{value:`'Minimum'`,computed:!1}},maxLabel:{required:!1,tsType:{name:`string`},description:`Accessible name for the high thumb (Radix maps it to role="slider").`,defaultValue:{value:`'Maximum'`,computed:!1}},formatValue:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(v: number) => string`,signature:{arguments:[{type:{name:`number`},name:`v`}],return:{name:`string`}}},description:`Format each endpoint for the visible readout; defaults to String(v).`,defaultValue:{value:`String`,computed:!0}},unit:{required:!1,tsType:{name:`string`},description:`Unit appended to the visible readout, e.g. 'BPM'.`},disabled:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},className:{required:!1,tsType:{name:`string`},description:``}}}})),v,y,b,x,S,C,w,T,E;e((()=>{v=t(n(),1),_(),y=r(),{fn:b}=__STORYBOOK_MODULE_TEST__,x={title:`UI/RangeSlider`,component:g,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,y.jsx)(`div`,{className:`w-80`,children:(0,y.jsx)(e,{})})],args:{value:[20,80],onChange:b(),min:0,max:100},argTypes:{disabled:{control:`boolean`}}},S={render:e=>{let[t,n]=(0,v.useState)([20,80]);return(0,y.jsx)(g,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},C={render:e=>{let[t,n]=(0,v.useState)([80,120]);return(0,y.jsx)(g,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},min:0,max:300,unit:`BPM`,minLabel:`Minimum tempo`,maxLabel:`Maximum tempo`})}},w={render:e=>{let[t,n]=(0,v.useState)([0,100]);return(0,y.jsx)(g,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},T={args:{value:[20,80],disabled:!0}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<[number, number]>([20, 80]);
    return <RangeSlider {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<[number, number]>([80, 120]);
    return <RangeSlider {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} min={0} max={300} unit="BPM" minLabel="Minimum tempo" maxLabel="Maximum tempo" />;
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<[number, number]>([0, 100]);
    return <RangeSlider {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    value: [20, 80],
    disabled: true
  }
}`,...T.parameters?.docs?.source}}},E=[`Default`,`Tempo`,`FullRange`,`Disabled`]}))();export{S as Default,T as Disabled,w as FullRange,C as Tempo,E as __namedExportsOrder,x as default};