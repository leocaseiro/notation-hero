import{i as e,s as t}from"./preload-helper-D2Tj54I7.js";import{t as n}from"./react-oFBTHxA-.js";import{t as r}from"./jsx-runtime-Di7G22GK.js";import{w as i}from"./iframe-B8Zj3ZrR.js";import{r as a,t as o}from"./utils-BctKywgG.js";import{c as s,d as c,f as ee,g as l,h as u,n as d,o as f,s as p,t as m}from"./useRenderElement-nI8l5Kxk.js";import{n as te,t as ne}from"./useControlled-BHe2DpVc.js";import{C as h,D as g,O as _,d as re,t as ie,w as ae}from"./owner-cKkXuMRj.js";import{n as v,t as y}from"./useIsoLayoutEffect-CeXIv9_m.js";import{E as oe,i as se,r as ce,t as le}from"./createBaseUIEventDetails-CnCFBMXR.js";import{c as ue,d as b,l as x,n as S,t as de,u as C}from"./useOpenChangeComplete-CvC9T4OM.js";import{n as fe}from"./useButton-Cgl6rJgW.js";import{t as w}from"./use-button-BgV53j5k.js";import{t as T,tt as pe}from"./utils-BJTZNmuT.js";import{n as me,r as E,t as D}from"./visuallyHidden-CsVpqgTc.js";import{g as O,p as k}from"./composite-08XLOJUq.js";import{n as he,t as A}from"./useValueChanged-4F_JVE53.js";import{n as j,t as ge}from"./CompositeItem-C5jvt-3e.js";import{a as M,f as N,i as _e,l as P,m as F,n as ve,o as I,p as ye,r as be,t as xe,u as Se}from"./LabelableContext-BwkrsX7q.js";import{i as Ce,n as we,r as Te,t as Ee}from"./useAriaLabelledBy-Bfiar6vK.js";import{n as De,t as Oe}from"./serializeValue-D9bz34V-.js";import{n as ke,t as Ae}from"./useLabelableId-BMVUCx7M.js";import{i as je,n as Me,r as Ne,t as Pe}from"./CompositeRoot-DHgWW0y2.js";var L,Fe=e((()=>{L=function(e){return e.checked=`data-checked`,e.unchecked=`data-unchecked`,e.disabled=`data-disabled`,e.readonly=`data-readonly`,e.required=`data-required`,e.valid=`data-valid`,e.invalid=`data-invalid`,e.touched=`data-touched`,e.dirty=`data-dirty`,e.filled=`data-filled`,e.focused=`data-focused`,e}({})})),R,z=e((()=>{ue(),ye(),Fe(),R={checked(e){return e?{[L.checked]:``}:{[L.unchecked]:``}},...x,...N}}));function Ie(){return B.useContext(V)}var B,V,Le=e((()=>{B=t(n(),1),V=B.createContext(void 0)}));function Re(){let e=ze.useContext(Be);if(e===void 0)throw Error(u(52));return e}var ze,Be,Ve=e((()=>{l(),ze=t(n(),1),Be=ze.createContext(void 0)})),H,U,He,Ue=e((()=>{H=t(n(),1),c(),y(),g(),D(),s(),ie(),ce(),se(),F(),z(),h(),m(),w(),je(),j(),P(),Te(),xe(),Ee(),Ae(),Le(),Oe(),Ve(),U=r(),He=H.forwardRef(function(e,t){let{render:n,className:r,disabled:i=!1,readOnly:a=!1,required:o=!1,"aria-labelledby":s,value:c,inputRef:l,nativeButton:u=!1,id:m,style:te,...ne}=e,h=Ie(),{disabled:g,readOnly:ie,required:y,form:se,checkedValue:ce,touched:ue=!1,validation:b,name:x}=h??{},S=h?.setCheckedValue??p,de=h?.setTouched??p,C=h?.registerControlRef??p,w=h?.registerInputRef??p,{setTouched:T,setFilled:pe,state:D,disabled:O}=Se(),k=Ce(),{labelId:he,getDescriptionProps:A}=ve(),j=O||k.disabled||g||i,M=ie||a,N=y||o,_e=se,P=h?ce===c:c===``,F=H.useRef(null),I=H.useRef(null),ye=_(e=>{e&&C(e,j)}),be=ee(l,I,w);v(()=>{I.current?.checked&&pe(!0)},[pe]),v(()=>{if(I.current){if(j&&P){w(null);return}F.current&&C(F.current,j),w(I.current)}},[P,j,C,w]);let xe=ae(),Te=ke({id:m,implicit:!1,controlRef:F}),Ee=u?void 0:Te,Oe=we(s,he,I,!u,Ee),Ae={role:`radio`,"aria-checked":P,"aria-required":N||void 0,"aria-readonly":M||void 0,"aria-labelledby":Oe,[Ne]:P?``:void 0,id:u?Te:xe,onKeyDown(e){e.key===`Enter`&&e.preventDefault()},onClick(e){if(e.defaultPrevented||j||M)return;e.preventDefault();let t=I.current;t&&t.dispatchEvent(new(re(t)).PointerEvent(`click`,{bubbles:!0,shiftKey:e.shiftKey,ctrlKey:e.ctrlKey,altKey:e.altKey,metaKey:e.metaKey}))},onFocus(e){e.defaultPrevented||j||M||!ue||(I.current?.click(),de(!1))}},{getButtonProps:je,buttonRef:Me}=fe({disabled:j,native:u,composite:!1}),Pe={type:`radio`,ref:be,form:_e,id:Ee,name:x,tabIndex:-1,style:x?E:me,"aria-hidden":!0,...c===void 0?f:{value:De(c)},disabled:j,checked:P,required:N,readOnly:M,onChange(e){if(e.nativeEvent.defaultPrevented||j||M||c===void 0)return;let t=le(oe,e.nativeEvent);S(c,t),!t.isCanceled&&T(!0)},onFocus(){F.current?.focus()}},L=H.useMemo(()=>({...D,required:N,disabled:j,readOnly:M,checked:P}),[D,j,M,P,N]),Fe=L,z=h!==void 0,B=[t,F,Me,ye],V=[Ae,ne,je,A,b?e=>b.getValidationProps(j,e):f],Le=d(`span`,e,{enabled:!z,state:L,ref:B,props:V,stateAttributesMapping:R});return(0,U.jsxs)(Be.Provider,{value:Fe,children:[z?(0,U.jsx)(ge,{tag:`span`,render:n,className:r,style:te,state:L,refs:B,props:V,stateAttributesMapping:R}):Le,(0,U.jsx)(`input`,{...Pe,suppressHydrationWarning:!0})]})})})),We,Ge,Ke=e((()=>{We=t(n(),1),m(),Ve(),z(),de(),C(),Ge=We.forwardRef(function(e,t){let{render:n,className:r,style:i,keepMounted:a=!1,...o}=e,s=Re(),c=s.checked,{mounted:ee,transitionStatus:l,setMounted:u}=b(c),f={...s,transitionStatus:l},p=We.useRef(null),m=a||ee,te=d(`span`,e,{ref:[t,p],state:f,props:o,stateAttributesMapping:R});return S({open:c,ref:p,onComplete(){c||u(!1)}}),m?te:null})})),qe=e((()=>{Ue(),Ke()})),Je=e((()=>{qe()}));function Ye(e=!1){let t=Xe.useContext(Ze);if(!t&&!e)throw Error(u(86));return t}var Xe,Ze,Qe=e((()=>{l(),Xe=t(n(),1),Ze=Xe.createContext(void 0)})),W,$e,et,tt,nt=e((()=>{W=t(n(),1),ne(),g(),h(),T(),O(),Me(),P(),M(),ye(),Qe(),be(),xe(),A(),Le(),$e=r(),et=[k],tt=W.forwardRef(function(e,t){let{render:n,className:r,disabled:i,readOnly:a,required:o,onValueChange:s,value:c,defaultValue:ee,form:l,name:u,inputRef:d,id:f,style:p,...m}=e,{setTouched:ne,setFocused:h,validationMode:g,name:re,disabled:ie,state:v,validation:y,setDirty:oe,setFilled:se,validityData:ce}=Se(),{labelId:le}=ve(),{clearErrors:ue}=_e(),b=Ye(!0),x=ie||i,S=re??u,de=ae(f),[C,fe]=te({controlled:c,default:ee,name:`RadioGroup`,state:`value`}),[w,T]=W.useState(!1),me=_((e,t)=>{s?.(e,t),!t.isCanceled&&fe(e)}),E=W.useRef(null),D=W.useRef(null),O=W.useRef(null);function k(e){let t;return d&&(typeof d==`function`?t=d(e):d.current=e),D.current=e,y.inputRef.current=e,t}let A=_((e,t=!1)=>{if(e){if(t){E.current===e&&(E.current=null);return}E.current??=e}}),j=_(e=>{if(!e||e.disabled)return;O.current||=e;let t=D.current;if(e.checked||t==null||t.disabled)return k(e)}),ge=_(()=>{let e=D.current;return!e||e.disabled||!e.checked?null:C??null});I(E,de,C??null,ge,!x,u),he(C,()=>{ue(S),oe(C!==ce.initialValue),se(C!=null),y.change(C);let e=O.current;C==null&&e&&!e.disabled&&k(e)});let M=m[`aria-labelledby`]??le??b?.legendId,P={...v,disabled:x??!1,required:o??!1,readOnly:a??!1},F=W.useMemo(()=>({...v,checkedValue:C,disabled:x,form:l,validation:y,name:S,readOnly:a,registerControlRef:A,registerInputRef:j,required:o,setCheckedValue:me,setTouched:T,touched:w}),[C,x,l,y,v,S,a,A,j,o,me,T,w]),ye={id:f,role:`radiogroup`,"aria-required":o||void 0,"aria-disabled":x||void 0,"aria-readonly":a||void 0,"aria-labelledby":M,onFocus(){h(!0)},onBlur(e){pe(e.currentTarget,e.relatedTarget)||(ne(!0),h(!1),g===`onBlur`&&y.commit(C))},onKeyDownCapture(e){e.key.startsWith(`Arrow`)&&(T(!0),h(!0))}};return(0,$e.jsx)(V.Provider,{value:F,children:(0,$e.jsx)(Pe,{render:n,className:r,style:p,state:P,props:[ye,m,e=>y.getValidationProps(x??!1,e)],refs:[t],stateAttributesMapping:N,enableHomeAndEndKeys:!1,modifierKeys:et})})})})),rt=e((()=>{nt()})),it,G,K,q,at=e((()=>{it=i(),Je(),rt(),a(),G=r(),K=e=>{let t=(0,it.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=o(`grid gap-3`,n),t[3]=n,t[4]=i);let a;return t[5]!==r||t[6]!==i?(a=(0,G.jsx)(tt,{"data-slot":`radio-group`,className:i,...r}),t[5]=r,t[6]=i,t[7]=a):a=t[7],a},q=e=>{let t=(0,it.c)(9),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=o(`relative flex aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40`,n),t[3]=n,t[4]=i);let a;t[5]===Symbol.for(`react.memo_cache_sentinel`)?(a=(0,G.jsx)(Ge,{"data-slot":`radio-group-indicator`,className:`absolute inset-0 flex items-center justify-center`,children:(0,G.jsx)(`span`,{"data-slot":`radio-group-dot`,"aria-hidden":`true`,className:`size-2 rounded-full bg-primary`})}),t[5]=a):a=t[5];let s;return t[6]!==r||t[7]!==i?(s=(0,G.jsx)(He,{"data-slot":`radio-group-item`,className:i,...r,children:a}),t[6]=r,t[7]=i,t[8]=s):s=t[8],s},K.__docgenInfo={description:"Single-select radio group built on Base UI `RadioGroup`. Render one\n`RadioGroupItem` per choice and pair each with a `<label>` via matching\n`id`/`htmlFor` (or wrap the control) so the option is clickable and named.\nSet `defaultValue` (uncontrolled) or `value` + `onValueChange` (controlled) on\nthe group; roving focus + arrow-key navigation come from Base UI. The item\npicks up `disabled` (as `data-disabled` — the item renders a `<span>`, so the\n`:disabled` pseudo-class never matches) and `aria-invalid` styling from the\nsame props Base UI forwards.",methods:[],displayName:`RadioGroup`},q.__docgenInfo={description:"A single radio option. The filled dot is a plain CSS `<span>` (not an icon\nfont) so the visual regression snapshot stays deterministic regardless of font\nloading. Base UI renders the `Indicator` only when this item is the selected one.",methods:[],displayName:`RadioGroupItem`}})),J,ot,st,Y,X,Z,Q,$,ct;e((()=>{at(),J=r(),{fn:ot}=__STORYBOOK_MODULE_TEST__,st={title:`UI/RadioGroup`,component:K,parameters:{layout:`centered`},tags:[`autodocs`],args:{onValueChange:ot()},argTypes:{defaultValue:{control:`select`,options:[`comfortable`,`compact`,`spacious`]},disabled:{control:`boolean`},name:{control:`text`}}},Y={render:e=>(0,J.jsxs)(K,{...e,children:[(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`comfortable`,id:`default-comfortable`}),(0,J.jsx)(`label`,{htmlFor:`default-comfortable`,children:`Comfortable`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`compact`,id:`default-compact`}),(0,J.jsx)(`label`,{htmlFor:`default-compact`,children:`Compact`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`spacious`,id:`default-spacious`}),(0,J.jsx)(`label`,{htmlFor:`default-spacious`,children:`Spacious`})]})]})},X={args:{defaultValue:`compact`},render:e=>(0,J.jsxs)(K,{...e,children:[(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`comfortable`,id:`value-comfortable`}),(0,J.jsx)(`label`,{htmlFor:`value-comfortable`,children:`Comfortable`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`compact`,id:`value-compact`}),(0,J.jsx)(`label`,{htmlFor:`value-compact`,children:`Compact`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`spacious`,id:`value-spacious`}),(0,J.jsx)(`label`,{htmlFor:`value-spacious`,children:`Spacious`})]})]})},Z={args:{disabled:!0,defaultValue:`comfortable`},render:e=>(0,J.jsxs)(K,{...e,children:[(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`comfortable`,id:`disabled-comfortable`}),(0,J.jsx)(`label`,{htmlFor:`disabled-comfortable`,children:`Comfortable`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`compact`,id:`disabled-compact`}),(0,J.jsx)(`label`,{htmlFor:`disabled-compact`,children:`Compact`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`spacious`,id:`disabled-spacious`}),(0,J.jsx)(`label`,{htmlFor:`disabled-spacious`,children:`Spacious`})]})]})},Q={render:e=>(0,J.jsxs)(K,{...e,children:[(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`comfortable`,id:`invalid-comfortable`,"aria-invalid":!0}),(0,J.jsx)(`label`,{htmlFor:`invalid-comfortable`,children:`Comfortable`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`compact`,id:`invalid-compact`,"aria-invalid":!0}),(0,J.jsx)(`label`,{htmlFor:`invalid-compact`,children:`Compact`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`spacious`,id:`invalid-spacious`,"aria-invalid":!0}),(0,J.jsx)(`label`,{htmlFor:`invalid-spacious`,children:`Spacious`})]})]})},$={args:{defaultValue:`comfortable`,className:`flex gap-4`},render:e=>(0,J.jsxs)(K,{...e,children:[(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`comfortable`,id:`horizontal-comfortable`}),(0,J.jsx)(`label`,{htmlFor:`horizontal-comfortable`,children:`Comfortable`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`compact`,id:`horizontal-compact`}),(0,J.jsx)(`label`,{htmlFor:`horizontal-compact`,children:`Compact`})]}),(0,J.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,J.jsx)(q,{value:`spacious`,id:`horizontal-spacious`}),(0,J.jsx)(`label`,{htmlFor:`horizontal-spacious`,children:`Spacious`})]})]})},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
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