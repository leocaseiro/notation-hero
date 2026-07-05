import{i as e,s as t}from"./preload-helper-UTqDGU-u.js";import{t as n}from"./react-BiVEdM8e.js";import{t as r}from"./jsx-runtime-DALSLDfO.js";import{n as i,t as a}from"./utils-WM9gdYfb.js";import{d as o,f as s,p as c,t as l,u}from"./dist-Cld0Kmab.js";var d,f,p=e((()=>{l(),i(),d=r(),f=({value:e,onChange:t,min:n=0,max:r=100,step:i=1,minLabel:l=`Minimum`,maxLabel:f=`Maximum`,formatValue:p=String,unit:m,disabled:h=!1,className:g})=>{let[_,v]=e,y=m?` ${m}`:``,b=`${p(_)} – ${p(v)}${y}`;return(0,d.jsxs)(`div`,{"data-slot":`range-slider`,className:a(`flex flex-col gap-2`,g),children:[(0,d.jsx)(`output`,{"aria-hidden":`true`,className:`text-sm text-muted-foreground tabular-nums`,children:b}),(0,d.jsxs)(u,{value:e,onValueChange:e=>t([e[0]??_,e[1]??v]),min:n,max:r,step:i,minStepsBetweenThumbs:0,disabled:h,className:a(`relative flex h-5 w-full touch-none items-center select-none`,h&&`opacity-50`),children:[(0,d.jsx)(c,{className:`relative h-1 grow rounded-full bg-muted`,children:(0,d.jsx)(o,{className:`absolute h-full rounded-full bg-primary`})}),(0,d.jsx)(s,{"aria-label":l,className:a(`block size-4 rounded-full border-2 border-primary bg-background transition-[box-shadow,color]`,`hover:ring-4 hover:ring-ring/30`,`focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`,`disabled:pointer-events-none`)}),(0,d.jsx)(s,{"aria-label":f,className:a(`block size-4 rounded-full border-2 border-primary bg-background transition-[box-shadow,color]`,`hover:ring-4 hover:ring-ring/30`,`focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`,`disabled:pointer-events-none`)})]})]})},f.__docgenInfo={description:``,methods:[],displayName:`RangeSlider`,props:{value:{required:!0,tsType:{name:`tuple`,raw:`[number, number]`,elements:[{name:`number`},{name:`number`}]},description:`Controlled [min, max] selection.`},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(next: [number, number]) => void`,signature:{arguments:[{type:{name:`tuple`,raw:`[number, number]`,elements:[{name:`number`},{name:`number`}]},name:`next`}],return:{name:`void`}}},description:`Fires with the new [min, max] tuple whenever either thumb moves.`},min:{required:!1,tsType:{name:`number`},description:`Lowest selectable value.`,defaultValue:{value:`0`,computed:!1}},max:{required:!1,tsType:{name:`number`},description:`Highest selectable value.`,defaultValue:{value:`100`,computed:!1}},step:{required:!1,tsType:{name:`number`},description:`Increment per keystroke / drag tick.`,defaultValue:{value:`1`,computed:!1}},minLabel:{required:!1,tsType:{name:`string`},description:`Accessible name for the low thumb (Radix maps it to role="slider").`,defaultValue:{value:`'Minimum'`,computed:!1}},maxLabel:{required:!1,tsType:{name:`string`},description:`Accessible name for the high thumb (Radix maps it to role="slider").`,defaultValue:{value:`'Maximum'`,computed:!1}},formatValue:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(v: number) => string`,signature:{arguments:[{type:{name:`number`},name:`v`}],return:{name:`string`}}},description:`Format each endpoint for the visible readout; defaults to String(v).`,defaultValue:{value:`String`,computed:!0}},unit:{required:!1,tsType:{name:`string`},description:`Unit appended to the visible readout, e.g. 'BPM'.`},disabled:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},className:{required:!1,tsType:{name:`string`},description:``}}}})),m,h,g,_,v,y,b,x,S;e((()=>{m=t(n(),1),p(),h=r(),{fn:g}=__STORYBOOK_MODULE_TEST__,_={title:`UI/RangeSlider`,component:f,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,h.jsx)(`div`,{className:`w-80`,children:(0,h.jsx)(e,{})})],args:{value:[20,80],onChange:g(),min:0,max:100},argTypes:{disabled:{control:`boolean`}}},v={render:e=>{let[t,n]=(0,m.useState)([20,80]);return(0,h.jsx)(f,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},y={render:e=>{let[t,n]=(0,m.useState)([80,120]);return(0,h.jsx)(f,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},min:0,max:300,unit:`BPM`,minLabel:`Minimum tempo`,maxLabel:`Maximum tempo`})}},b={render:e=>{let[t,n]=(0,m.useState)([0,100]);return(0,h.jsx)(f,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},x={args:{value:[20,80],disabled:!0}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<[number, number]>([20, 80]);
    return <RangeSlider {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<[number, number]>([80, 120]);
    return <RangeSlider {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} min={0} max={300} unit="BPM" minLabel="Minimum tempo" maxLabel="Maximum tempo" />;
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<[number, number]>([0, 100]);
    return <RangeSlider {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    value: [20, 80],
    disabled: true
  }
}`,...x.parameters?.docs?.source}}},S=[`Default`,`Tempo`,`FullRange`,`Disabled`]}))();export{v as Default,x as Disabled,b as FullRange,y as Tempo,S as __namedExportsOrder,_ as default};