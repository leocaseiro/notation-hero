import{i as e}from"./preload-helper-DaBKe9-U.js";import{t}from"./jsx-runtime-CgGwJWjK.js";import{w as n}from"./iframe-CrRgATPC.js";import{n as r,t as i}from"./utils-DJdxzpXn.js";import{i as a,n as o,r as s,t as c}from"./dist-afBc-AOI.js";var l,u,d,f,p=e((()=>{l=n(),c(),r(),u=t(),d=e=>{let t=(0,l.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let a;t[3]===n?a=t[4]:(a=i(`grid gap-3`,n),t[3]=n,t[4]=a);let s;return t[5]!==r||t[6]!==a?(s=(0,u.jsx)(o,{"data-slot":`radio-group`,className:a,...r}),t[5]=r,t[6]=a,t[7]=s):s=t[7],s},f=e=>{let t=(0,l.c)(9),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let o;t[3]===n?o=t[4]:(o=i(`relative aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40`,n),t[3]=n,t[4]=o);let c;t[5]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,u.jsx)(s,{"data-slot":`radio-group-indicator`,className:`absolute inset-0 flex items-center justify-center`,children:(0,u.jsx)(`span`,{"data-slot":`radio-group-dot`,"aria-hidden":`true`,className:`size-2 rounded-full bg-primary`})}),t[5]=c):c=t[5];let d;return t[6]!==r||t[7]!==o?(d=(0,u.jsx)(a,{"data-slot":`radio-group-item`,className:o,...r,children:c}),t[6]=r,t[7]=o,t[8]=d):d=t[8],d},d.__docgenInfo={description:"Single-select radio group built on Radix `RadioGroup`. Render one\n`RadioGroupItem` per choice and pair each with a `<label>` via matching\n`id`/`htmlFor` (or wrap the control) so the option is clickable and named.\nSet `defaultValue` (uncontrolled) or `value` + `onValueChange` (controlled) on\nthe group; roving focus + arrow-key navigation come from Radix. The item picks\nup `disabled` and `aria-invalid` styling from the same props Radix forwards.",methods:[],displayName:`RadioGroup`},f.__docgenInfo={description:"A single radio option. The filled dot is a plain CSS `<span>` (not an icon\nfont) so the visual regression snapshot stays deterministic regardless of font\nloading. Radix renders the `Indicator` only when this item is the selected one.",methods:[],displayName:`RadioGroupItem`}})),m,h,g,_,v,y,b,x;e((()=>{p(),m=t(),h={title:`UI/RadioGroup`,component:d,parameters:{layout:`centered`},tags:[`autodocs`]},g={render:()=>(0,m.jsxs)(d,{children:[(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`comfortable`,id:`default-comfortable`}),(0,m.jsx)(`label`,{htmlFor:`default-comfortable`,children:`Comfortable`})]}),(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`compact`,id:`default-compact`}),(0,m.jsx)(`label`,{htmlFor:`default-compact`,children:`Compact`})]}),(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`spacious`,id:`default-spacious`}),(0,m.jsx)(`label`,{htmlFor:`default-spacious`,children:`Spacious`})]})]})},_={render:()=>(0,m.jsxs)(d,{defaultValue:`compact`,children:[(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`comfortable`,id:`value-comfortable`}),(0,m.jsx)(`label`,{htmlFor:`value-comfortable`,children:`Comfortable`})]}),(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`compact`,id:`value-compact`}),(0,m.jsx)(`label`,{htmlFor:`value-compact`,children:`Compact`})]}),(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`spacious`,id:`value-spacious`}),(0,m.jsx)(`label`,{htmlFor:`value-spacious`,children:`Spacious`})]})]})},v={render:()=>(0,m.jsxs)(d,{disabled:!0,defaultValue:`comfortable`,children:[(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`comfortable`,id:`disabled-comfortable`}),(0,m.jsx)(`label`,{htmlFor:`disabled-comfortable`,children:`Comfortable`})]}),(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`compact`,id:`disabled-compact`}),(0,m.jsx)(`label`,{htmlFor:`disabled-compact`,children:`Compact`})]}),(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`spacious`,id:`disabled-spacious`}),(0,m.jsx)(`label`,{htmlFor:`disabled-spacious`,children:`Spacious`})]})]})},y={render:()=>(0,m.jsxs)(d,{children:[(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`comfortable`,id:`invalid-comfortable`,"aria-invalid":!0}),(0,m.jsx)(`label`,{htmlFor:`invalid-comfortable`,children:`Comfortable`})]}),(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`compact`,id:`invalid-compact`,"aria-invalid":!0}),(0,m.jsx)(`label`,{htmlFor:`invalid-compact`,children:`Compact`})]}),(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`spacious`,id:`invalid-spacious`,"aria-invalid":!0}),(0,m.jsx)(`label`,{htmlFor:`invalid-spacious`,children:`Spacious`})]})]})},b={render:()=>(0,m.jsxs)(d,{defaultValue:`comfortable`,className:`flex gap-4`,children:[(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`comfortable`,id:`horizontal-comfortable`}),(0,m.jsx)(`label`,{htmlFor:`horizontal-comfortable`,children:`Comfortable`})]}),(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`compact`,id:`horizontal-compact`}),(0,m.jsx)(`label`,{htmlFor:`horizontal-compact`,children:`Compact`})]}),(0,m.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,m.jsx)(f,{value:`spacious`,id:`horizontal-spacious`}),(0,m.jsx)(`label`,{htmlFor:`horizontal-spacious`,children:`Spacious`})]})]})},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <RadioGroup>
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
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <RadioGroup defaultValue="compact">
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
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <RadioGroup disabled defaultValue="comfortable">
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
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <RadioGroup>
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
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <RadioGroup defaultValue="comfortable" className="flex gap-4">
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
}`,...b.parameters?.docs?.source}}},x=[`Default`,`WithDefaultValue`,`Disabled`,`Invalid`,`Horizontal`]}))();export{g as Default,v as Disabled,b as Horizontal,y as Invalid,_ as WithDefaultValue,x as __namedExportsOrder,h as default};