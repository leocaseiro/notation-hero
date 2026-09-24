import{i as e,s as t}from"./preload-helper-D2Tj54I7.js";import{t as n}from"./react-oFBTHxA-.js";import{t as r}from"./jsx-runtime-Di7G22GK.js";import{r as i,t as a}from"./utils-BctKywgG.js";import{a as o,c as s,g as c,h as l,n as u,t as d}from"./useRenderElement-nI8l5Kxk.js";import{n as f,t as p}from"./useControlled-BHe2DpVc.js";import{D as m,O as h}from"./owner-cKkXuMRj.js";import{n as g,t as _}from"./ToolbarRootContext-CP9zL5hK.js";import{a as v,i as y,n as b,t as x}from"./toggle-05uo1Dlz.js";import{n as S,t as C}from"./CompositeRoot-DHgWW0y2.js";function w(e){let t=T.useContext(E);if(t===void 0&&!e)throw Error(l(68));return t}var T,E,D=e((()=>{c(),T=t(n(),1),E=T.createContext(void 0)})),O,k=e((()=>{O=function(e){return e.disabled=`data-disabled`,e.orientation=`data-orientation`,e.multiple=`data-multiple`,e}({})})),A,j,M,N,P=e((()=>{A=t(n(),1),m(),p(),s(),d(),S(),_(),D(),v(),k(),j=r(),M={multiple(e){return e?{[O.multiple]:``}:null}},N=A.forwardRef(function(e,t){let{defaultValue:n,disabled:r=!1,loopFocus:i=!0,onValueChange:a,orientation:s=`horizontal`,multiple:c=!1,value:l,className:d,render:p,style:m,..._}=e,v=g(!0),b=w(!0),x=A.useMemo(()=>l!==void 0||n!==void 0,[l,n]),S=(v?.disabled??!1)||(b?.disabled??!1)||r,[T,E]=f({controlled:l,default:l===void 0?n??o:void 0,name:`ToggleGroup`,state:`value`}),D=h((e,t,n)=>{let r;c?(r=T.slice(),t?r.push(e):r.splice(T.indexOf(e),1)):r=t?[e]:[],a?.(r,n),!n.isCanceled&&E(r)}),O={disabled:S,multiple:c,orientation:s},k=A.useMemo(()=>({disabled:S,orientation:s,setGroupValue:D,value:T,isValueInitialized:x}),[S,s,D,T,x]),N={role:`group`},P=u(`div`,e,{enabled:!!v,state:O,ref:t,props:[N,_],stateAttributesMapping:M});return(0,j.jsx)(y.Provider,{value:k,children:v?P:(0,j.jsx)(C,{render:p,className:d,style:m,state:O,refs:[t],props:[N,_],stateAttributesMapping:M,loopFocus:i,enableHomeAndEndKeys:!0,orientation:s})})})})),F=e((()=>{P()})),I,L,R,z=e((()=>{x(),F(),i(),I=r(),L=a(`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors outline-none`,`border border-border bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]`,`data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground`,`focus-visible:ring-3 focus-visible:ring-ring/50`,`disabled:pointer-events-none disabled:opacity-50`,`[&_.material-symbols-outlined]:text-[1.125rem]`),R=({options:e,value:t,onChange:n,type:r=`multiple`,disabled:i,"aria-label":o,className:s})=>(0,I.jsx)(N,{multiple:r===`multiple`,value:t,onValueChange:e=>n(e),"data-slot":`toggle-chip-group`,className:a(`flex flex-wrap gap-2`,s),...i!==void 0&&{disabled:i},...o!==void 0&&{"aria-label":o},children:e.map(e=>(0,I.jsxs)(b,{value:e.value,disabled:e.disabled,"data-slot":`toggle-chip`,className:L,children:[e.icon?(0,I.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,children:e.icon}):null,e.label]},e.value))}),R.__docgenInfo={description:``,methods:[],displayName:`ToggleChipGroup`,props:{options:{required:!0,tsType:{name:`unknown`},description:`Chips to render, in order.`},value:{required:!0,tsType:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},description:`Selected values (length <= 1 when type='single').`},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(next: string[]) => void`,signature:{arguments:[{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`next`}],return:{name:`void`}}},description:`Fires with the next selection; always a string[] regardless of type.`},type:{required:!1,tsType:{name:`union`,raw:`'single' | 'multiple'`,elements:[{name:`literal`,value:`'single'`},{name:`literal`,value:`'multiple'`}]},description:`'multiple' (default) lets many chips be on; 'single' keeps at most one.`,defaultValue:{value:`'multiple'`,computed:!1}},disabled:{required:!1,tsType:{name:`boolean`},description:`Disable the whole group.`},"aria-label":{required:!1,tsType:{name:`string`},description:`Accessible name for the group (there is no visible label).`},className:{required:!1,tsType:{name:`string`},description:``}}}})),B,V,H,U,W,G,K,q,J,Y,X,Z;e((()=>{B=t(n(),1),z(),V=r(),{fn:H}=__STORYBOOK_MODULE_TEST__,U=[{value:`4/4`,label:`4/4`},{value:`3/4`,label:`3/4`},{value:`6/8`,label:`6/8`},{value:`7/8`,label:`7/8`},{value:`5/4`,label:`5/4`}],W=[{value:`timing`,label:`Timing`,icon:`timer`},{value:`independence`,label:`Independence`,icon:`call_split`},{value:`control`,label:`Control`,icon:`tune`},{value:`coordination`,label:`Coordination`,icon:`sync`},{value:`speed`,label:`Speed`,icon:`speed`}],G={title:`UI/ToggleChipGroup`,component:R,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,V.jsx)(`div`,{className:`max-w-md`,children:(0,V.jsx)(e,{})})],args:{options:U,value:[],onChange:H(),"aria-label":`Time signature`},argTypes:{disabled:{control:`boolean`},type:{control:`radio`,options:[`single`,`multiple`]}}},K={render:e=>{let[t,n]=(0,B.useState)([`4/4`]);return(0,V.jsx)(R,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},q={args:{options:W,"aria-label":`Skills`},render:e=>{let[t,n]=(0,B.useState)([`timing`,`speed`]);return(0,V.jsx)(R,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},J={args:{type:`single`},render:e=>{let[t,n]=(0,B.useState)([`3/4`]);return(0,V.jsx)(R,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},Y={render:e=>{let[t,n]=(0,B.useState)([]);return(0,V.jsx)(R,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},X={args:{value:[`4/4`],disabled:!0}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<string[]>(['4/4']);
    return <ToggleChipGroup {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
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
}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
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
}`,...J.parameters?.docs?.source}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<string[]>([]);
    return <ToggleChipGroup {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  args: {
    value: ['4/4'],
    disabled: true
  }
}`,...X.parameters?.docs?.source}}},Z=[`Default`,`Skills`,`Single`,`NoneSelected`,`Disabled`]}))();export{K as Default,X as Disabled,Y as NoneSelected,J as Single,q as Skills,Z as __namedExportsOrder,G as default};