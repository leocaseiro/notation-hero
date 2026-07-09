import{i as e,s as t}from"./preload-helper-BoMmBYap.js";import{t as n}from"./react-cmu_Fh1j.js";import{t as r}from"./jsx-runtime-Is63ggYT.js";import{w as i}from"./iframe-CjzyKwoF.js";import{r as a,t as o}from"./utils-AUGx5ZXf.js";import{a as s,i as c,l,m as u,n as ee,o as d,p as f,t as p,u as m}from"./useRenderElement-BtaWOnZw.js";import{c as te,d as h,n as g,s as ne,t as re,u as _}from"./useOpenChangeComplete-7uJ87rNR.js";import{S as v,i as ie,r as ae,t as oe}from"./createBaseUIEventDetails-BT--nhcx.js";import{n as se,t as ce}from"./useControlled-BnKJnTph.js";import{c as le,i as ue,l as y,r as b,s as x,t as S,u as C,y as w}from"./owner-C-iZjv_N.js";import{n as de}from"./useButton-DxTbvbFx.js";import{t as T}from"./use-button-Bx4SdzHJ.js";import{t as E,tt as fe}from"./utils-BXUezRtq.js";import{n as pe,r as D,t as O}from"./visuallyHidden-BTA4eqW1.js";import{g as k,p as me}from"./composite-CqYEr1I7.js";import{n as he,t as ge}from"./useValueChanged-y9AZayvL.js";import{n as A,t as _e}from"./CompositeItem-DR0eqM4u.js";import{a as j,f as M,i as ve,l as N,m as P,n as ye,o as F,p as I,r as be,t as xe,u as Se}from"./LabelableContext-CNO2jxlc.js";import{i as Ce,n as we,r as Te,t as Ee}from"./useAriaLabelledBy-Df_Fs3Gn.js";import{n as De,t as Oe}from"./serializeValue-CPqQCOYI.js";import{n as ke,t as Ae}from"./useLabelableId-Y-l5couE.js";import{i as je,n as Me,r as Ne,t as Pe}from"./CompositeRoot-CiR8Q5dO.js";var L,Fe=e((()=>{L=function(e){return e.checked=`data-checked`,e.unchecked=`data-unchecked`,e.disabled=`data-disabled`,e.readonly=`data-readonly`,e.required=`data-required`,e.valid=`data-valid`,e.invalid=`data-invalid`,e.touched=`data-touched`,e.dirty=`data-dirty`,e.filled=`data-filled`,e.focused=`data-focused`,e}({})})),R,z=e((()=>{_(),I(),Fe(),R={checked(e){return e?{[L.checked]:``}:{[L.unchecked]:``}},...h,...M}}));function Ie(){return B.useContext(V)}var B,V,Le=e((()=>{B=t(n(),1),V=B.createContext(void 0)}));function Re(){let e=ze.useContext(Be);if(e===void 0)throw Error(f(52));return e}var ze,Be,Ve=e((()=>{u(),ze=t(n(),1),Be=ze.createContext(void 0)})),H,U,He,Ue=e((()=>{H=t(n(),1),l(),x(),y(),O(),d(),S(),ae(),ie(),P(),z(),b(),p(),T(),je(),A(),N(),Te(),xe(),Ee(),Ae(),Le(),Oe(),Ve(),U=r(),He=H.forwardRef(function(e,t){let{render:n,className:r,disabled:i=!1,readOnly:a=!1,required:o=!1,"aria-labelledby":l,value:u,inputRef:d,nativeButton:f=!1,id:p,style:te,...h}=e,g=Ie(),{disabled:ne,readOnly:re,required:_,form:ie,checkedValue:ae,touched:se=!1,validation:ce,name:y}=g??{},b=g?.setCheckedValue??s,x=g?.setTouched??s,S=g?.registerControlRef??s,T=g?.registerInputRef??s,{setTouched:E,setFilled:fe,state:O,disabled:k}=Se(),me=Ce(),{labelId:he,getDescriptionProps:ge}=ye(),A=k||me.disabled||ne||i,j=re||a,M=_||o,ve=ie,N=g?ae===u:u===``,P=H.useRef(null),F=H.useRef(null),I=C(e=>{e&&S(e,A)}),be=m(d,F,T);le(()=>{F.current?.checked&&fe(!0)},[fe]),le(()=>{if(F.current){if(A&&N){T(null);return}P.current&&S(P.current,A),T(F.current)}},[N,A,S,T]);let xe=ue(),Te=ke({id:p,implicit:!1,controlRef:P}),Ee=f?void 0:Te,Oe=we(l,he,F,!f,Ee),Ae={role:`radio`,"aria-checked":N,"aria-required":M||void 0,"aria-readonly":j||void 0,"aria-labelledby":Oe,[Ne]:N?``:void 0,id:f?Te:xe,onKeyDown(e){e.key===`Enter`&&e.preventDefault()},onClick(e){if(e.defaultPrevented||A||j)return;e.preventDefault();let t=F.current;t&&t.dispatchEvent(new(w(t)).PointerEvent(`click`,{bubbles:!0,shiftKey:e.shiftKey,ctrlKey:e.ctrlKey,altKey:e.altKey,metaKey:e.metaKey}))},onFocus(e){e.defaultPrevented||A||j||!se||(F.current?.click(),x(!1))}},{getButtonProps:je,buttonRef:Me}=de({disabled:A,native:f,composite:!1}),Pe={type:`radio`,ref:be,form:ve,id:Ee,name:y,tabIndex:-1,style:y?D:pe,"aria-hidden":!0,...u===void 0?c:{value:De(u)},disabled:A,checked:N,required:M,readOnly:j,onChange(e){if(e.nativeEvent.defaultPrevented||A||j||u===void 0)return;let t=oe(v,e.nativeEvent);b(u,t),!t.isCanceled&&E(!0)},onFocus(){P.current?.focus()}},L=H.useMemo(()=>({...O,required:M,disabled:A,readOnly:j,checked:N}),[O,A,j,N,M]),Fe=L,z=g!==void 0,B=[t,P,Me,I],V=[Ae,h,je,ge,ce?e=>ce.getValidationProps(A,e):c],Le=ee(`span`,e,{enabled:!z,state:L,ref:B,props:V,stateAttributesMapping:R});return(0,U.jsxs)(Be.Provider,{value:Fe,children:[z?(0,U.jsx)(_e,{tag:`span`,render:n,className:r,style:te,state:L,refs:B,props:V,stateAttributesMapping:R}):Le,(0,U.jsx)(`input`,{...Pe,suppressHydrationWarning:!0})]})})})),We,Ge,Ke=e((()=>{We=t(n(),1),p(),Ve(),z(),re(),ne(),Ge=We.forwardRef(function(e,t){let{render:n,className:r,style:i,keepMounted:a=!1,...o}=e,s=Re(),c=s.checked,{mounted:l,transitionStatus:u,setMounted:d}=te(c),f={...s,transitionStatus:u},p=We.useRef(null),m=a||l,h=ee(`span`,e,{ref:[t,p],state:f,props:o,stateAttributesMapping:R});return g({open:c,ref:p,onComplete(){c||d(!1)}}),m?h:null})})),qe=e((()=>{Ue(),Ke()})),Je=e((()=>{qe()}));function Ye(e=!1){let t=Xe.useContext(Ze);if(!t&&!e)throw Error(f(86));return t}var Xe,Ze,Qe=e((()=>{u(),Xe=t(n(),1),Ze=Xe.createContext(void 0)})),W,$e,et,tt,nt=e((()=>{W=t(n(),1),ce(),y(),b(),E(),k(),Me(),N(),j(),I(),Qe(),be(),xe(),ge(),Le(),$e=r(),et=[me],tt=W.forwardRef(function(e,t){let{render:n,className:r,disabled:i,readOnly:a,required:o,onValueChange:s,value:c,defaultValue:l,form:u,name:ee,inputRef:d,id:f,style:p,...m}=e,{setTouched:te,setFocused:h,validationMode:g,name:ne,disabled:re,state:_,validation:v,setDirty:ie,setFilled:ae,validityData:oe}=Se(),{labelId:ce}=ye(),{clearErrors:le}=ve(),y=Ye(!0),b=re||i,x=ne??ee,S=ue(f),[w,de]=se({controlled:c,default:l,name:`RadioGroup`,state:`value`}),[T,E]=W.useState(!1),pe=C((e,t)=>{s?.(e,t),!t.isCanceled&&de(e)}),D=W.useRef(null),O=W.useRef(null),k=W.useRef(null);function me(e){let t;return d&&(typeof d==`function`?t=d(e):d.current=e),O.current=e,v.inputRef.current=e,t}let ge=C((e,t=!1)=>{if(e){if(t){D.current===e&&(D.current=null);return}D.current??=e}}),A=C(e=>{if(!e||e.disabled)return;k.current||=e;let t=O.current;if(e.checked||t==null||t.disabled)return me(e)}),_e=C(()=>{let e=O.current;return!e||e.disabled||!e.checked?null:w??null});F(D,S,w??null,_e,!b,ee),he(w,()=>{le(x),ie(w!==oe.initialValue),ae(w!=null),v.change(w);let e=k.current;w==null&&e&&!e.disabled&&me(e)});let j=m[`aria-labelledby`]??ce??y?.legendId,N={..._,disabled:b??!1,required:o??!1,readOnly:a??!1},P=W.useMemo(()=>({..._,checkedValue:w,disabled:b,form:u,validation:v,name:x,readOnly:a,registerControlRef:ge,registerInputRef:A,required:o,setCheckedValue:pe,setTouched:E,touched:T}),[w,b,u,v,_,x,a,ge,A,o,pe,E,T]),I={id:f,role:`radiogroup`,"aria-required":o||void 0,"aria-disabled":b||void 0,"aria-readonly":a||void 0,"aria-labelledby":j,onFocus(){h(!0)},onBlur(e){fe(e.currentTarget,e.relatedTarget)||(te(!0),h(!1),g===`onBlur`&&v.commit(w))},onKeyDownCapture(e){e.key.startsWith(`Arrow`)&&(E(!0),h(!0))}};return(0,$e.jsx)(V.Provider,{value:P,children:(0,$e.jsx)(Pe,{render:n,className:r,style:p,state:N,props:[I,m,e=>v.getValidationProps(b??!1,e)],refs:[t],stateAttributesMapping:M,enableHomeAndEndKeys:!1,modifierKeys:et})})})})),rt=e((()=>{nt()})),it,G,K,q,at=e((()=>{it=i(),Je(),rt(),a(),G=r(),K=e=>{let t=(0,it.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=o(`grid gap-3`,n),t[3]=n,t[4]=i);let a;return t[5]!==r||t[6]!==i?(a=(0,G.jsx)(tt,{"data-slot":`radio-group`,className:i,...r}),t[5]=r,t[6]=i,t[7]=a):a=t[7],a},q=e=>{let t=(0,it.c)(9),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=o(`relative flex aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40`,n),t[3]=n,t[4]=i);let a;t[5]===Symbol.for(`react.memo_cache_sentinel`)?(a=(0,G.jsx)(Ge,{"data-slot":`radio-group-indicator`,className:`absolute inset-0 flex items-center justify-center`,children:(0,G.jsx)(`span`,{"data-slot":`radio-group-dot`,"aria-hidden":`true`,className:`size-2 rounded-full bg-primary`})}),t[5]=a):a=t[5];let s;return t[6]!==r||t[7]!==i?(s=(0,G.jsx)(He,{"data-slot":`radio-group-item`,className:i,...r,children:a}),t[6]=r,t[7]=i,t[8]=s):s=t[8],s},K.__docgenInfo={description:"Single-select radio group built on Base UI `RadioGroup`. Render one\n`RadioGroupItem` per choice and pair each with a `<label>` via matching\n`id`/`htmlFor` (or wrap the control) so the option is clickable and named.\nSet `defaultValue` (uncontrolled) or `value` + `onValueChange` (controlled) on\nthe group; roving focus + arrow-key navigation come from Base UI. The item\npicks up `disabled` (as `data-disabled` — the item renders a `<span>`, so the\n`:disabled` pseudo-class never matches) and `aria-invalid` styling from the\nsame props Base UI forwards.",methods:[],displayName:`RadioGroup`},q.__docgenInfo={description:"A single radio option. The filled dot is a plain CSS `<span>` (not an icon\nfont) so the visual regression snapshot stays deterministic regardless of font\nloading. Base UI renders the `Indicator` only when this item is the selected one.",methods:[],displayName:`RadioGroupItem`}})),J,ot,st,Y,X,Z,Q,$,ct;e((()=>{at(),J=r(),{fn:ot}=__STORYBOOK_MODULE_TEST__,st={title:`UI/RadioGroup`,component:K,parameters:{layout:`centered`},tags:[`autodocs`],args:{onValueChange:ot()},argTypes:{defaultValue:{control:`select`,options:[`comfortable`,`compact`,`spacious`]},disabled:{control:`boolean`},name:{control:`text`}}},Y={render:e=>(0,J.jsxs)(K,{...e,children:[(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`comfortable`,id:`default-comfortable`}),(0,J.jsx)(`label`,{htmlFor:`default-comfortable`,children:`Comfortable`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`compact`,id:`default-compact`}),(0,J.jsx)(`label`,{htmlFor:`default-compact`,children:`Compact`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`spacious`,id:`default-spacious`}),(0,J.jsx)(`label`,{htmlFor:`default-spacious`,children:`Spacious`})]})]})},X={args:{defaultValue:`compact`},render:e=>(0,J.jsxs)(K,{...e,children:[(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`comfortable`,id:`value-comfortable`}),(0,J.jsx)(`label`,{htmlFor:`value-comfortable`,children:`Comfortable`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`compact`,id:`value-compact`}),(0,J.jsx)(`label`,{htmlFor:`value-compact`,children:`Compact`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`spacious`,id:`value-spacious`}),(0,J.jsx)(`label`,{htmlFor:`value-spacious`,children:`Spacious`})]})]})},Z={args:{disabled:!0,defaultValue:`comfortable`},render:e=>(0,J.jsxs)(K,{...e,children:[(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`comfortable`,id:`disabled-comfortable`}),(0,J.jsx)(`label`,{htmlFor:`disabled-comfortable`,children:`Comfortable`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`compact`,id:`disabled-compact`}),(0,J.jsx)(`label`,{htmlFor:`disabled-compact`,children:`Compact`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`spacious`,id:`disabled-spacious`}),(0,J.jsx)(`label`,{htmlFor:`disabled-spacious`,children:`Spacious`})]})]})},Q={render:e=>(0,J.jsxs)(K,{...e,children:[(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`comfortable`,id:`invalid-comfortable`,"aria-invalid":!0}),(0,J.jsx)(`label`,{htmlFor:`invalid-comfortable`,children:`Comfortable`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`compact`,id:`invalid-compact`,"aria-invalid":!0}),(0,J.jsx)(`label`,{htmlFor:`invalid-compact`,children:`Compact`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`spacious`,id:`invalid-spacious`,"aria-invalid":!0}),(0,J.jsx)(`label`,{htmlFor:`invalid-spacious`,children:`Spacious`})]})]})},$={args:{defaultValue:`comfortable`,className:`flex gap-4`},render:e=>(0,J.jsxs)(K,{...e,children:[(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`comfortable`,id:`horizontal-comfortable`}),(0,J.jsx)(`label`,{htmlFor:`horizontal-comfortable`,children:`Comfortable`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`compact`,id:`horizontal-compact`}),(0,J.jsx)(`label`,{htmlFor:`horizontal-compact`,children:`Compact`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`spacious`,id:`horizontal-spacious`}),(0,J.jsx)(`label`,{htmlFor:`horizontal-spacious`,children:`Spacious`})]})]})},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  render: args => <RadioGroup {...args}>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="default-comfortable" />
        <label htmlFor="default-comfortable">Comfortable</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="default-compact" />
        <label htmlFor="default-compact">Compact</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="spacious" id="default-spacious" />
        <label htmlFor="default-spacious">Spacious</label>
      </div>
    </RadioGroup>
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: 'compact'
  },
  render: args => <RadioGroup {...args}>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="value-comfortable" />
        <label htmlFor="value-comfortable">Comfortable</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="value-compact" />
        <label htmlFor="value-compact">Compact</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="spacious" id="value-spacious" />
        <label htmlFor="value-spacious">Spacious</label>
      </div>
    </RadioGroup>
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    defaultValue: 'comfortable'
  },
  render: args => <RadioGroup {...args}>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="disabled-comfortable" />
        <label htmlFor="disabled-comfortable">Comfortable</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="disabled-compact" />
        <label htmlFor="disabled-compact">Compact</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="spacious" id="disabled-spacious" />
        <label htmlFor="disabled-spacious">Spacious</label>
      </div>
    </RadioGroup>
}`,...Z.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
  render: args => <RadioGroup {...args}>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="invalid-comfortable" aria-invalid />
        <label htmlFor="invalid-comfortable">Comfortable</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="invalid-compact" aria-invalid />
        <label htmlFor="invalid-compact">Compact</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="spacious" id="invalid-spacious" aria-invalid />
        <label htmlFor="invalid-spacious">Spacious</label>
      </div>
    </RadioGroup>
}`,...Q.parameters?.docs?.source}}},$.parameters={...$.parameters,docs:{...$.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: 'comfortable',
    className: 'flex gap-4'
  },
  render: args => <RadioGroup {...args}>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="horizontal-comfortable" />
        <label htmlFor="horizontal-comfortable">Comfortable</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="horizontal-compact" />
        <label htmlFor="horizontal-compact">Compact</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="spacious" id="horizontal-spacious" />
        <label htmlFor="horizontal-spacious">Spacious</label>
      </div>
    </RadioGroup>
}`,...$.parameters?.docs?.source}}},ct=[`Default`,`WithDefaultValue`,`Disabled`,`Invalid`,`Horizontal`]}))();export{Y as Default,Z as Disabled,$ as Horizontal,Q as Invalid,X as WithDefaultValue,ct as __namedExportsOrder,st as default};