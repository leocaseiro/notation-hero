import{i as e,s as t}from"./preload-helper-UTqDGU-u.js";import{t as n}from"./react-BiVEdM8e.js";import{t as r}from"./jsx-runtime-DALSLDfO.js";import{r as i,t as a}from"./utils-DvOUAHQN.js";import{$t as o,I as s,Kt as c,Qt as l,R as u,Yt as d,i as f,nn as p,nt as m,o as h,qt as g,r as _,rn as v,s as y,z as b}from"./DirectionContext-DYwkO2VK.js";import{o as x,s as ee}from"./useCompositeListItem-vjIBhSKG.js";import{n as S,t as C}from"./useButton-BRW7Lq4A.js";import{n as w,t as T}from"./ToolbarRootContext-Cw9RRokn.js";import{i as E,n as D,r as O,t as k}from"./CompositeRoot-BrN1IUKr.js";function te(e=!0){let t=A.useContext(j);if(t===void 0&&!e)throw Error(l(7));return t}var A,j,M=e((()=>{o(),A=t(n(),1),j=A.createContext(void 0)}));function ne(e){let{render:t,className:n,style:r,state:i=g,props:a=c,refs:o=c,metadata:s,stateAttributesMapping:l,tag:u=`div`,...d}=e,{compositeProps:f,compositeRef:p}=E({metadata:s});return y(u,e,{state:i,ref:[...o,p],props:[f,...a,d],stateAttributesMapping:l})}var re=e((()=>{d(),h(),O()})),N,P,F,ie=e((()=>{N=t(n(),1),x(),_(),h(),M(),C(),re(),u(),b(),P=r(),F=N.forwardRef(function(e,t){let{className:n,defaultPressed:r=!1,disabled:i=!1,form:a,onPressedChange:o,pressed:c,render:l,type:u,value:d,nativeButton:p=!0,style:h,...g}=e,_=f(d||void 0),v=te(),b=v?.value??[],x=v?void 0:r,C=(i||v?.disabled)??!1,[w,T]=ee({controlled:v?_!==void 0&&b.indexOf(_)>-1:c,default:x,name:`Toggle`,state:`pressed`}),{getButtonProps:E,buttonRef:D}=S({disabled:C,native:p}),O={disabled:C,pressed:w},k=[D,t],A=[{"aria-pressed":w,onClick(e){let t=!w,n=s(m,e.nativeEvent);o?.(t,n),!n.isCanceled&&(_&&v?.setGroupValue?.(_,t,n),!n.isCanceled&&T(t))}},g,E],j=y(`button`,e,{enabled:!v,state:O,ref:k,props:A}),M=N.useMemo(()=>({disabled:C,focusableWhenDisabled:!1}),[C]);return v?(0,P.jsx)(ne,{tag:`button`,render:l,className:n,style:h,metadata:M,state:O,refs:k,props:A}):j})})),ae=e((()=>{ie()}));function oe(e){let t=I.useContext(se);if(t===void 0&&!e)throw Error(l(68));return t}var I,se,ce=e((()=>{o(),I=t(n(),1),se=I.createContext(void 0)})),le,ue=e((()=>{le=function(e){return e.disabled=`data-disabled`,e.orientation=`data-orientation`,e.multiple=`data-multiple`,e}({})})),L,R,z,B,de=e((()=>{L=t(n(),1),p(),x(),d(),h(),D(),T(),ce(),M(),ue(),R=r(),z={multiple(e){return e?{[le.multiple]:``}:null}},B=L.forwardRef(function(e,t){let{defaultValue:n,disabled:r=!1,loopFocus:i=!0,onValueChange:a,orientation:o=`horizontal`,multiple:s=!1,value:l,className:u,render:d,style:f,...p}=e,m=w(!0),h=oe(!0),g=L.useMemo(()=>l!==void 0||n!==void 0,[l,n]),_=(m?.disabled??!1)||(h?.disabled??!1)||r,[b,x]=ee({controlled:l,default:l===void 0?n??c:void 0,name:`ToggleGroup`,state:`value`}),S=v((e,t,n)=>{let r;s?(r=b.slice(),t?r.push(e):r.splice(b.indexOf(e),1)):r=t?[e]:[],a?.(r,n),!n.isCanceled&&x(r)}),C={disabled:_,multiple:s,orientation:o},T=L.useMemo(()=>({disabled:_,orientation:o,setGroupValue:S,value:b,isValueInitialized:g}),[_,o,S,b,g]),E={role:`group`},D=y(`div`,e,{enabled:!!m,state:C,ref:t,props:[E,p],stateAttributesMapping:z});return(0,R.jsx)(j.Provider,{value:T,children:m?D:(0,R.jsx)(k,{render:d,className:u,style:f,state:C,refs:[t],props:[E,p],stateAttributesMapping:z,loopFocus:i,enableHomeAndEndKeys:!0,orientation:o})})})})),fe=e((()=>{de()})),V,H,U,pe=e((()=>{ae(),fe(),i(),V=r(),H=a(`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors outline-none`,`border border-border bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]`,`data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground`,`focus-visible:ring-3 focus-visible:ring-ring/50`,`disabled:pointer-events-none disabled:opacity-50`,`[&_.material-symbols-outlined]:text-[1.125rem]`),U=({options:e,value:t,onChange:n,type:r=`multiple`,disabled:i,"aria-label":o,className:s})=>(0,V.jsx)(B,{multiple:r===`multiple`,value:t,onValueChange:e=>n(e),"data-slot":`toggle-chip-group`,className:a(`flex flex-wrap gap-2`,s),...i!==void 0&&{disabled:i},...o!==void 0&&{"aria-label":o},children:e.map(e=>(0,V.jsxs)(F,{value:e.value,disabled:e.disabled,"data-slot":`toggle-chip`,className:H,children:[e.icon?(0,V.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,children:e.icon}):null,e.label]},e.value))}),U.__docgenInfo={description:``,methods:[],displayName:`ToggleChipGroup`,props:{options:{required:!0,tsType:{name:`unknown`},description:`Chips to render, in order.`},value:{required:!0,tsType:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},description:`Selected values (length <= 1 when type='single').`},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(next: string[]) => void`,signature:{arguments:[{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`next`}],return:{name:`void`}}},description:`Fires with the next selection; always a string[] regardless of type.`},type:{required:!1,tsType:{name:`union`,raw:`'single' | 'multiple'`,elements:[{name:`literal`,value:`'single'`},{name:`literal`,value:`'multiple'`}]},description:`'multiple' (default) lets many chips be on; 'single' keeps at most one.`,defaultValue:{value:`'multiple'`,computed:!1}},disabled:{required:!1,tsType:{name:`boolean`},description:`Disable the whole group.`},"aria-label":{required:!1,tsType:{name:`string`},description:`Accessible name for the group (there is no visible label).`},className:{required:!1,tsType:{name:`string`},description:``}}}})),W,G,K,q,me,J,Y,X,Z,Q,$,he;e((()=>{W=t(n(),1),pe(),G=r(),{fn:K}=__STORYBOOK_MODULE_TEST__,q=[{value:`4/4`,label:`4/4`},{value:`3/4`,label:`3/4`},{value:`6/8`,label:`6/8`},{value:`7/8`,label:`7/8`},{value:`5/4`,label:`5/4`}],me=[{value:`timing`,label:`Timing`,icon:`timer`},{value:`independence`,label:`Independence`,icon:`call_split`},{value:`control`,label:`Control`,icon:`tune`},{value:`coordination`,label:`Coordination`,icon:`sync`},{value:`speed`,label:`Speed`,icon:`speed`}],J={title:`UI/ToggleChipGroup`,component:U,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,G.jsx)(`div`,{className:`max-w-md`,children:(0,G.jsx)(e,{})})],args:{options:q,value:[],onChange:K(),"aria-label":`Time signature`},argTypes:{disabled:{control:`boolean`},type:{control:`radio`,options:[`single`,`multiple`]}}},Y={render:e=>{let[t,n]=(0,W.useState)([`4/4`]);return(0,G.jsx)(U,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},X={args:{options:me,"aria-label":`Skills`},render:e=>{let[t,n]=(0,W.useState)([`timing`,`speed`]);return(0,G.jsx)(U,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},Z={args:{type:`single`},render:e=>{let[t,n]=(0,W.useState)([`3/4`]);return(0,G.jsx)(U,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},Q={render:e=>{let[t,n]=(0,W.useState)([]);return(0,G.jsx)(U,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},$={args:{value:[`4/4`],disabled:!0}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<string[]>(['4/4']);
    return <ToggleChipGroup {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
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
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
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
}`,...Z.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<string[]>([]);
    return <ToggleChipGroup {...args} value={value} onChange={v => {
      setValue(v);
      args.onChange(v);
    }} />;
  }
}`,...Q.parameters?.docs?.source}}},$.parameters={...$.parameters,docs:{...$.parameters?.docs,source:{originalSource:`{
  args: {
    value: ['4/4'],
    disabled: true
  }
}`,...$.parameters?.docs?.source}}},he=[`Default`,`Skills`,`Single`,`NoneSelected`,`Disabled`]}))();export{Y as Default,$ as Disabled,Q as NoneSelected,Z as Single,X as Skills,he as __namedExportsOrder,J as default};