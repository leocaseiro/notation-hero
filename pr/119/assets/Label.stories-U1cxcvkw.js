import{i as e}from"./preload-helper-Bud32Ixq.js";import{t}from"./jsx-runtime-DhQtVMJX.js";import{w as n}from"./iframe-L9qxocqQ.js";import{n as r,t as i}from"./utils-4aqnuI2u.js";var a,o,s,c=e((()=>{a=n(),r(),o=t(),s=e=>{let t=(0,a.c)(12),n,r,s;t[0]===e?(n=t[1],r=t[2],s=t[3]):({className:n,onMouseDown:r,...s}=e,t[0]=e,t[1]=n,t[2]=r,t[3]=s);let c;t[4]===n?c=t[5]:(c=i(`flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:cursor-not-allowed group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50`,n),t[4]=n,t[5]=c);let l;t[6]===r?l=t[7]:(l=e=>{e.target.closest(`button, input, select, textarea`)||(r?.(e),!e.defaultPrevented&&e.detail>1&&e.preventDefault())},t[6]=r,t[7]=l);let u;return t[8]!==s||t[9]!==c||t[10]!==l?(u=(0,o.jsx)(`label`,{"data-slot":`label`,className:c,onMouseDown:l,...s}),t[8]=s,t[9]=c,t[10]=l,t[11]=u):u=t[11],u},s.__docgenInfo={description:'Form label on a native `<label>` (Base UI has no Label primitive; the one\nRadix Label extra — double-click text-selection guard — is reproduced in\nonMouseDown). Associate it with a control via `htmlFor` pointing at the\ninput\'s `id` (clicking the label then focuses the input), or wrap the control\ndirectly. The disabled styles react to a sibling `peer` (`peer-disabled:`) or\nan ancestor `group` marked `data-disabled="true"`, so a disabled field dims\nits label without extra wiring.',methods:[],displayName:`Label`}})),l,u,d,f,p,m,h,g,_,v,y;e((()=>{c(),l=t(),{fn:u}=__STORYBOOK_MODULE_TEST__,d={title:`UI/Label`,component:s,parameters:{layout:`centered`},tags:[`autodocs`],args:{children:`Email`,onMouseDown:u()},argTypes:{htmlFor:{control:`text`},children:{control:`text`}}},f={},p={render:()=>(0,l.jsxs)(`div`,{className:`grid gap-1.5`,children:[(0,l.jsx)(s,{htmlFor:`email`,children:`Email`}),(0,l.jsx)(`input`,{id:`email`,type:`email`,placeholder:`you@example.com`,className:`h-9 rounded-md border border-input bg-background px-3 text-sm`})]})},m={render:()=>(0,l.jsxs)(s,{children:[(0,l.jsx)(`input`,{type:`checkbox`}),`Remember me`]})},h={render:()=>(0,l.jsxs)(`div`,{className:`grid gap-1.5`,children:[(0,l.jsx)(`input`,{id:`disabled-email`,type:`email`,disabled:!0,placeholder:`you@example.com`,className:`peer h-9 rounded-md border border-input bg-background px-3 text-sm`}),(0,l.jsx)(s,{htmlFor:`disabled-email`,children:`Email`})]})},g={render:()=>(0,l.jsxs)(s,{htmlFor:`required-name`,children:[`Name`,(0,l.jsx)(`span`,{className:`text-destructive`,"aria-hidden":`true`,children:`*`})]})},_={render:()=>(0,l.jsx)(`div`,{className:`max-w-60`,children:(0,l.jsx)(s,{htmlFor:`consent`,children:`I agree to receive occasional product updates and understand I can unsubscribe at any time`})})},v={render:()=>(0,l.jsxs)(`div`,{className:`group grid gap-1.5`,"data-disabled":`true`,children:[(0,l.jsx)(s,{htmlFor:`group-disabled-email`,children:`Email`}),(0,l.jsx)(`input`,{id:`group-disabled-email`,type:`email`,disabled:!0,placeholder:`you@example.com`,className:`h-9 rounded-md border border-input bg-background px-3 text-sm`})]})},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid gap-1.5">
      <Label htmlFor="email">Email</Label>
      <input id="email" type="email" placeholder="you@example.com" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
    </div>
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <Label>
      <input type="checkbox" />
      Remember me
    </Label>
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid gap-1.5">
      <input id="disabled-email" type="email" disabled placeholder="you@example.com" className="peer h-9 rounded-md border border-input bg-background px-3 text-sm" />
      <Label htmlFor="disabled-email">Email</Label>
    </div>
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <Label htmlFor="required-name">
      Name
      <span className="text-destructive" aria-hidden="true">
        *
      </span>
    </Label>
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-60">
      <Label htmlFor="consent">
        I agree to receive occasional product updates and understand I can unsubscribe at any time
      </Label>
    </div>
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <div className="group grid gap-1.5" data-disabled="true">
      <Label htmlFor="group-disabled-email">Email</Label>
      <input id="group-disabled-email" type="email" disabled placeholder="you@example.com" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
    </div>
}`,...v.parameters?.docs?.source}}},y=[`Default`,`WithAssociatedInput`,`WrappingInput`,`Disabled`,`Required`,`LongText`,`GroupDisabled`]}))();export{f as Default,h as Disabled,v as GroupDisabled,_ as LongText,g as Required,p as WithAssociatedInput,m as WrappingInput,y as __namedExportsOrder,d as default};