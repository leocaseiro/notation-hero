import{i as e,s as t}from"./preload-helper-D0cd7zMF.js";import{t as n}from"./react-B5dul1-y.js";import{t as r}from"./jsx-runtime-DRPbBoLi.js";import{r as i,t as a}from"./utils-D4KqTOiv.js";import{m as o,n as s,o as c,p as l,r as ee,t as u}from"./useRenderElement-BORw_2-o.js";import{S as d,i as f,r as p,t as m}from"./createBaseUIEventDetails-D1LS_09l.js";import{n as te,t as h}from"./useControlled-CMnUJTx3.js";import{i as g,l as _,r as v,u as y}from"./owner-EwGqL7V4.js";import{n as ne,t as b}from"./useButton-C7b7MLvI.js";import{n as x,t as S}from"./ToolbarRootContext-DKGgF-hP.js";import{n as C,t as w}from"./CompositeItem-BwHrDKaS.js";import{n as T,t as E}from"./CompositeRoot-BD0FbpzM.js";function re(e=!0){let t=D.useContext(O);if(t===void 0&&!e)throw Error(l(7));return t}var D,O,k=e((()=>{o(),D=t(n(),1),O=D.createContext(void 0)})),A,j,M,N=e((()=>{A=t(n(),1),h(),v(),u(),k(),b(),C(),p(),f(),j=r(),M=A.forwardRef(function(e,t){let{className:n,defaultPressed:r=!1,disabled:i=!1,form:a,onPressedChange:o,pressed:c,render:l,type:ee,value:u,nativeButton:f=!0,style:p,...h}=e,_=g(u||void 0),v=re(),y=v?.value??[],b=v?void 0:r,x=(i||v?.disabled)??!1,[S,C]=te({controlled:v?_!==void 0&&y.indexOf(_)>-1:c,default:b,name:`Toggle`,state:`pressed`}),{getButtonProps:T,buttonRef:E}=ne({disabled:x,native:f}),D={disabled:x,pressed:S},O=[E,t],k=[{"aria-pressed":S,onClick(e){let t=!S,n=m(d,e.nativeEvent);o?.(t,n),!n.isCanceled&&(_&&v?.setGroupValue?.(_,t,n),!n.isCanceled&&C(t))}},h,T],M=s(`button`,e,{enabled:!v,state:D,ref:O,props:k}),N=A.useMemo(()=>({disabled:x,focusableWhenDisabled:!1}),[x]);return v?(0,j.jsx)(w,{tag:`button`,render:l,className:n,style:p,metadata:N,state:D,refs:O,props:k}):M})})),ie=e((()=>{N()}));function ae(e){let t=P.useContext(oe);if(t===void 0&&!e)throw Error(l(68));return t}var P,oe,se=e((()=>{o(),P=t(n(),1),oe=P.createContext(void 0)})),F,ce=e((()=>{F=function(e){return e.disabled=`data-disabled`,e.orientation=`data-orientation`,e.multiple=`data-multiple`,e}({})})),I,L,R,z,le=e((()=>{I=t(n(),1),_(),h(),c(),u(),T(),S(),se(),k(),ce(),L=r(),R={multiple(e){return e?{[F.multiple]:``}:null}},z=I.forwardRef(function(e,t){let{defaultValue:n,disabled:r=!1,loopFocus:i=!0,onValueChange:a,orientation:o=`horizontal`,multiple:c=!1,value:l,className:u,render:d,style:f,...p}=e,m=x(!0),h=ae(!0),g=I.useMemo(()=>l!==void 0||n!==void 0,[l,n]),_=(m?.disabled??!1)||(h?.disabled??!1)||r,[v,ne]=te({controlled:l,default:l===void 0?n??ee:void 0,name:`ToggleGroup`,state:`value`}),b=y((e,t,n)=>{let r;c?(r=v.slice(),t?r.push(e):r.splice(v.indexOf(e),1)):r=t?[e]:[],a?.(r,n),!n.isCanceled&&ne(r)}),S={disabled:_,multiple:c,orientation:o},C=I.useMemo(()=>({disabled:_,orientation:o,setGroupValue:b,value:v,isValueInitialized:g}),[_,o,b,v,g]),w={role:`group`},T=s(`div`,e,{enabled:!!m,state:S,ref:t,props:[w,p],stateAttributesMapping:R});return(0,L.jsx)(O.Provider,{value:C,children:m?T:(0,L.jsx)(E,{render:d,className:u,style:f,state:S,refs:[t],props:[w,p],stateAttributesMapping:R,loopFocus:i,enableHomeAndEndKeys:!0,orientation:o})})})})),ue=e((()=>{le()})),B,V,H,de=e((()=>{ie(),ue(),i(),B=r(),V=a(`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors outline-none`,`border border-border bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]`,`data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground`,`focus-visible:ring-3 focus-visible:ring-ring/50`,`disabled:pointer-events-none disabled:opacity-50`,`[&_.material-symbols-outlined]:text-[1.125rem]`),H=({options:e,value:t,onChange:n,type:r=`multiple`,disabled:i,"aria-label":o,className:s})=>(0,B.jsx)(z,{multiple:r===`multiple`,value:t,onValueChange:e=>n(e),"data-slot":`toggle-chip-group`,className:a(`flex flex-wrap gap-2`,s),...i!==void 0&&{disabled:i},...o!==void 0&&{"aria-label":o},children:e.map(e=>(0,B.jsxs)(M,{value:e.value,disabled:e.disabled,"data-slot":`toggle-chip`,className:V,children:[e.icon?(0,B.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,children:e.icon}):null,e.label]},e.value))}),H.__docgenInfo={description:``,methods:[],displayName:`ToggleChipGroup`,props:{options:{required:!0,tsType:{name:`unknown`},description:`Chips to render, in order.`},value:{required:!0,tsType:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},description:`Selected values (length <= 1 when type='single').`},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(next: string[]) => void`,signature:{arguments:[{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`next`}],return:{name:`void`}}},description:`Fires with the next selection; always a string[] regardless of type.`},type:{required:!1,tsType:{name:`union`,raw:`'single' | 'multiple'`,elements:[{name:`literal`,value:`'single'`},{name:`literal`,value:`'multiple'`}]},description:`'multiple' (default) lets many chips be on; 'single' keeps at most one.`,defaultValue:{value:`'multiple'`,computed:!1}},disabled:{required:!1,tsType:{name:`boolean`},description:`Disable the whole group.`},"aria-label":{required:!1,tsType:{name:`string`},description:`Accessible name for the group (there is no visible label).`},className:{required:!1,tsType:{name:`string`},description:``}}}})),U,W,G,K,q,J,Y,X,Z,Q,$,fe;e((()=>{U=t(n(),1),de(),W=r(),{fn:G}=__STORYBOOK_MODULE_TEST__,K=[{value:`4/4`,label:`4/4`},{value:`3/4`,label:`3/4`},{value:`6/8`,label:`6/8`},{value:`7/8`,label:`7/8`},{value:`5/4`,label:`5/4`}],q=[{value:`timing`,label:`Timing`,icon:`timer`},{value:`independence`,label:`Independence`,icon:`call_split`},{value:`control`,label:`Control`,icon:`tune`},{value:`coordination`,label:`Coordination`,icon:`sync`},{value:`speed`,label:`Speed`,icon:`speed`}],J={title:`UI/ToggleChipGroup`,component:H,parameters:{layout:`padded`},tags:[`autodocs`],decorators:[e=>(0,W.jsx)(`div`,{className:`max-w-md`,children:(0,W.jsx)(e,{})})],args:{options:K,value:[],onChange:G(),"aria-label":`Time signature`},argTypes:{disabled:{control:`boolean`},type:{control:`radio`,options:[`single`,`multiple`]}}},Y={render:e=>{let[t,n]=(0,U.useState)([`4/4`]);return(0,W.jsx)(H,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},X={args:{options:q,"aria-label":`Skills`},render:e=>{let[t,n]=(0,U.useState)([`timing`,`speed`]);return(0,W.jsx)(H,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},Z={args:{type:`single`},render:e=>{let[t,n]=(0,U.useState)([`3/4`]);return(0,W.jsx)(H,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},Q={render:e=>{let[t,n]=(0,U.useState)([]);return(0,W.jsx)(H,{...e,value:t,onChange:t=>{n(t),e.onChange(t)}})}},$={args:{value:[`4/4`],disabled:!0}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
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
}`,...$.parameters?.docs?.source}}},fe=[`Default`,`Skills`,`Single`,`NoneSelected`,`Disabled`]}))();export{Y as Default,$ as Disabled,Q as NoneSelected,Z as Single,X as Skills,fe as __namedExportsOrder,J as default};