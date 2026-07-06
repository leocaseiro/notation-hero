import{i as e}from"./preload-helper-CiZDt-oT.js";import{t}from"./jsx-runtime-BfRSd-8B.js";import{w as n}from"./iframe-CPaVF02P.js";import{n as r,t as i}from"./utils-Rzug8O27.js";import{o as a,t as o}from"./dist-9WWoTzB6.js";var s,c,l,u=e((()=>{s=n(),o(),r(),c=t(),l=e=>{let t=(0,s.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let o;t[3]===n?o=t[4]:(o=i(`flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50`,n),t[3]=n,t[4]=o);let l;return t[5]!==r||t[6]!==o?(l=(0,c.jsx)(a,{"data-slot":`label`,className:o,...r}),t[5]=r,t[6]=o,t[7]=l):l=t[7],l},l.__docgenInfo={description:'Form label built on Radix `Label`. Associate it with a control via `htmlFor`\npointing at the input\'s `id` (clicking the label then focuses the input), or\nwrap the control directly. The disabled styles react to a sibling `peer`\n(`peer-disabled:`) or an ancestor `group` marked `data-disabled="true"`, so a\ndisabled field dims its label without extra wiring.',methods:[],displayName:`Label`}})),d,f,p,m,h,g,_,v,y;e((()=>{u(),d=t(),f={title:`UI/Label`,component:l,parameters:{layout:`centered`},tags:[`autodocs`],args:{children:`Email`}},p={},m={render:()=>(0,d.jsxs)(`div`,{className:`grid gap-1.5`,children:[(0,d.jsx)(l,{htmlFor:`email`,children:`Email`}),(0,d.jsx)(`input`,{id:`email`,type:`email`,placeholder:`you@example.com`,className:`h-9 rounded-md border border-input bg-background px-3 text-sm`})]})},h={render:()=>(0,d.jsxs)(l,{children:[(0,d.jsx)(`input`,{type:`checkbox`}),`Remember me`]})},g={render:()=>(0,d.jsxs)(`div`,{className:`grid gap-1.5`,children:[(0,d.jsx)(`input`,{id:`disabled-email`,type:`email`,disabled:!0,placeholder:`you@example.com`,className:`peer h-9 rounded-md border border-input bg-background px-3 text-sm`}),(0,d.jsx)(l,{htmlFor:`disabled-email`,children:`Email`})]})},_={render:()=>(0,d.jsxs)(l,{htmlFor:`required-name`,children:[`Name`,(0,d.jsx)(`span`,{className:`text-destructive`,"aria-hidden":`true`,children:`*`})]})},v={render:()=>(0,d.jsx)(`div`,{className:`max-w-60`,children:(0,d.jsx)(l,{htmlFor:`consent`,children:`I agree to receive occasional product updates and understand I can unsubscribe at any time`})})},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid gap-1.5">
      <Label htmlFor="email">Email</Label>
      <input id="email" type="email" placeholder="you@example.com" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
    </div>
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <Label>
      <input type="checkbox" />
      Remember me
    </Label>
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid gap-1.5">
      <input id="disabled-email" type="email" disabled placeholder="you@example.com" className="peer h-9 rounded-md border border-input bg-background px-3 text-sm" />
      <Label htmlFor="disabled-email">Email</Label>
    </div>
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: () => <Label htmlFor="required-name">
      Name
      <span className="text-destructive" aria-hidden="true">
        *
      </span>
    </Label>
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-60">
      <Label htmlFor="consent">
        I agree to receive occasional product updates and understand I can unsubscribe at any time
      </Label>
    </div>
}`,...v.parameters?.docs?.source}}},y=[`Default`,`WithAssociatedInput`,`WrappingInput`,`Disabled`,`Required`,`LongText`]}))();export{p as Default,g as Disabled,v as LongText,_ as Required,m as WithAssociatedInput,h as WrappingInput,y as __namedExportsOrder,f as default};