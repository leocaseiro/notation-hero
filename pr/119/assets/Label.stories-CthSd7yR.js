import{i as e}from"./preload-helper-Bud32Ixq.js";import{t}from"./jsx-runtime-DhQtVMJX.js";import{w as n}from"./iframe-NZUVbbMn.js";import{n as r,t as i}from"./utils-4aqnuI2u.js";import{n as a,t as o}from"./Checkbox-CcJDowZ9.js";var s,c,l,u=e((()=>{s=n(),r(),c=t(),l=e=>{let t=(0,s.c)(12),n,r,a;t[0]===e?(n=t[1],r=t[2],a=t[3]):({className:n,onMouseDown:r,...a}=e,t[0]=e,t[1]=n,t[2]=r,t[3]=a);let o;t[4]===n?o=t[5]:(o=i(`flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:cursor-not-allowed group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50`,n),t[4]=n,t[5]=o);let l;t[6]===r?l=t[7]:(l=e=>{e.target.closest(`button, input, select, textarea, [role="checkbox"], [role="radio"], [role="switch"]`)||(r?.(e),!e.defaultPrevented&&e.detail>1&&e.preventDefault())},t[6]=r,t[7]=l);let u;return t[8]!==a||t[9]!==o||t[10]!==l?(u=(0,c.jsx)(`label`,{"data-slot":`label`,className:o,onMouseDown:l,...a}),t[8]=a,t[9]=o,t[10]=l,t[11]=u):u=t[11],u},l.__docgenInfo={description:"Form label on a native `<label>` (Base UI has no Label primitive; the one\nRadix Label extra — double-click text-selection guard — is reproduced in\nonMouseDown, which also leaves a wrapped control's own mousedown untouched:\nnative `input`/`select`/`textarea`/`button` and Base UI's role-based\n`checkbox`/`radio`/`switch` spans). Associate it with a control via `htmlFor`\npointing at the input's `id` (clicking the label then focuses the input), or\nwrap the control\ndirectly. The disabled styles react to a sibling `peer` (`peer-disabled:`) or\nan ancestor `group` marked `data-disabled=\"true\"`, so a disabled field dims\nits label without extra wiring.",methods:[],displayName:`Label`}})),d,f,p,m,h,g,_,v,y,b,x;e((()=>{u(),a(),d=t(),{fn:f}=__STORYBOOK_MODULE_TEST__,p={title:`UI/Label`,component:l,parameters:{layout:`centered`},tags:[`autodocs`],args:{children:`Email`,onMouseDown:f()},argTypes:{htmlFor:{control:`text`},children:{control:`text`}}},m={},h={render:()=>(0,d.jsxs)(`div`,{className:`grid gap-1.5`,children:[(0,d.jsx)(l,{htmlFor:`email`,children:`Email`}),(0,d.jsx)(`input`,{id:`email`,type:`email`,placeholder:`you@example.com`,className:`h-9 rounded-md border border-input bg-background px-3 text-sm`})]})},g={render:()=>(0,d.jsxs)(l,{htmlFor:`remember`,children:[(0,d.jsx)(o,{id:`remember`}),`Remember me`]})},_={render:()=>(0,d.jsxs)(`div`,{className:`grid gap-1.5`,children:[(0,d.jsx)(`input`,{id:`disabled-email`,type:`email`,disabled:!0,placeholder:`you@example.com`,className:`peer h-9 rounded-md border border-input bg-background px-3 text-sm`}),(0,d.jsx)(l,{htmlFor:`disabled-email`,children:`Email`})]})},v={render:()=>(0,d.jsxs)(l,{htmlFor:`required-name`,children:[`Name`,(0,d.jsx)(`span`,{className:`text-destructive`,"aria-hidden":`true`,children:`*`})]})},y={render:()=>(0,d.jsx)(`div`,{className:`max-w-60`,children:(0,d.jsx)(l,{htmlFor:`consent`,children:`I agree to receive occasional product updates and understand I can unsubscribe at any time`})})},b={render:()=>(0,d.jsxs)(`div`,{className:`group grid gap-1.5`,"data-disabled":`true`,children:[(0,d.jsx)(l,{htmlFor:`group-disabled-email`,children:`Email`}),(0,d.jsx)(`input`,{id:`group-disabled-email`,type:`email`,disabled:!0,placeholder:`you@example.com`,className:`h-9 rounded-md border border-input bg-background px-3 text-sm`})]})},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid gap-1.5">
      <Label htmlFor="email">Email</Label>
      <input id="email" type="email" placeholder="you@example.com" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
    </div>
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <Label htmlFor="remember">
      <Checkbox id="remember" />
      Remember me
    </Label>
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid gap-1.5">
      <input id="disabled-email" type="email" disabled placeholder="you@example.com" className="peer h-9 rounded-md border border-input bg-background px-3 text-sm" />
      <Label htmlFor="disabled-email">Email</Label>
    </div>
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <Label htmlFor="required-name">
      Name
      <span className="text-destructive" aria-hidden="true">
        *
      </span>
    </Label>
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-60">
      <Label htmlFor="consent">
        I agree to receive occasional product updates and understand I can unsubscribe at any time
      </Label>
    </div>
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <div className="group grid gap-1.5" data-disabled="true">
      <Label htmlFor="group-disabled-email">Email</Label>
      <input id="group-disabled-email" type="email" disabled placeholder="you@example.com" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
    </div>
}`,...b.parameters?.docs?.source}}},x=[`Default`,`WithAssociatedInput`,`WrappingInput`,`Disabled`,`Required`,`LongText`,`GroupDisabled`]}))();export{m as Default,_ as Disabled,b as GroupDisabled,y as LongText,v as Required,h as WithAssociatedInput,g as WrappingInput,x as __namedExportsOrder,p as default};