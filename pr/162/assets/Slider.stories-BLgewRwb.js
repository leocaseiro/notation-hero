import{i as e,s as t}from"./preload-helper-kgqLtcA5.js";import{t as n}from"./react-DHWbwTPp.js";import{t as r}from"./jsx-runtime-BJ7s788U.js";import{n as i,t as a}from"./Slider-CTrxL2dW.js";var o,s,c,l,u,d,f,p,m;e((()=>{o=t(n(),1),i(),s=r(),{fn:c}=__STORYBOOK_MODULE_TEST__,l={title:`UI/Slider`,component:a,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,s.jsx)(`div`,{className:`w-80`,children:(0,s.jsx)(e,{})})],args:{value:40,onChange:c(),min:0,max:100,label:`Volume`},argTypes:{disabled:{control:`boolean`},showReadout:{control:`boolean`}}},u={render:e=>{let[t,n]=(0,o.useState)(40);return(0,s.jsx)(a,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},d={render:e=>{let[t,n]=(0,o.useState)(90);return(0,s.jsx)(a,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},min:30,max:240,label:`Tempo`,unit:`BPM`,showReadout:!0})}},f={render:e=>{let[t,n]=(0,o.useState)(50);return(0,s.jsx)(a,{...e,value:t,onChange:t=>{n(t),e.onChange(t)},step:25})}},p={args:{value:40,disabled:!0}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState(40);
    return <Slider {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState(90);
    return <Slider {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} min={30} max={240} label="Tempo" unit="BPM" showReadout />;
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState(50);
    return <Slider {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} step={25} />;
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    value: 40,
    disabled: true
  }
}`,...p.parameters?.docs?.source}}},m=[`Default`,`WithReadout`,`Stepped`,`Disabled`]}))();export{u as Default,p as Disabled,f as Stepped,d as WithReadout,m as __namedExportsOrder,l as default};