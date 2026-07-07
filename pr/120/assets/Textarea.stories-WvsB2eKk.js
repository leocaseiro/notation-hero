import{i as e}from"./preload-helper-DK-QMVHu.js";import{t}from"./jsx-runtime-Dt4pzsg3.js";import{w as n}from"./iframe-DJS_tpuy.js";import{n as r,t as i}from"./utils-BPBtSsNK.js";var a,o,s,c=e((()=>{a=n(),r(),o=t(),s=e=>{let t=(0,a.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let s;t[3]===n?s=t[4]:(s=i(`flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40`,n),t[3]=n,t[4]=s);let c;return t[5]!==r||t[6]!==s?(c=(0,o.jsx)(`textarea`,{"data-slot":`textarea`,className:s,...r}),t[5]=r,t[6]=s,t[7]=c):c=t[7],c},s.__docgenInfo={description:"Multi-line text field — a styled native `<textarea>`. `field-sizing-content`\ngrows the box to fit its content (with `min-h-16` as the floor), so it starts\ncompact and expands as the user types; pass `rows` to set a fixed initial\nheight instead. Focus shows a ring, `aria-invalid` swaps to the destructive\nring, and `disabled` dims and blocks input. All native textarea props pass\nthrough, so it stays a drop-in for `<textarea>`.",methods:[],displayName:`Textarea`}})),l,u,d,f,p,m,h,g,_,v;e((()=>{c(),l=t(),u={title:`UI/Textarea`,component:s,parameters:{layout:`centered`},tags:[`autodocs`],args:{"aria-label":`Message`}},d={},f={args:{placeholder:`Type your message here…`}},p={args:{disabled:!0,defaultValue:`Read-only because the field is disabled.`}},m={args:{readOnly:!0,defaultValue:`You can select and copy this, but not edit it.`}},h={args:{"aria-invalid":!0,defaultValue:`This value failed validation.`}},g={args:{defaultValue:`The quick brown fox jumps over the lazy dog.`}},_={render:e=>(0,l.jsxs)(`div`,{className:`grid w-80 gap-1.5`,children:[(0,l.jsx)(`label`,{htmlFor:`notes`,className:`text-sm leading-none font-medium`,children:`Notes`}),(0,l.jsx)(s,{...e,id:`notes`,rows:6,placeholder:`Add any extra notes…`})]}),args:{"aria-label":void 0}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: 'Type your message here…'
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    defaultValue: 'Read-only because the field is disabled.'
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    readOnly: true,
    defaultValue: 'You can select and copy this, but not edit it.'
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    'aria-invalid': true,
    defaultValue: 'This value failed validation.'
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: 'The quick brown fox jumps over the lazy dog.'
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  render: args => <div className="grid w-80 gap-1.5">
      <label htmlFor="notes" className="text-sm leading-none font-medium">
        Notes
      </label>
      <Textarea {...args} id="notes" rows={6} placeholder="Add any extra notes…" />
    </div>,
  // The wrapping <label htmlFor> names the control, so drop the story-level aria-label.
  args: {
    'aria-label': undefined
  }
}`,..._.parameters?.docs?.source}}},v=[`Default`,`Placeholder`,`Disabled`,`ReadOnly`,`Invalid`,`WithValue`,`WithRows`]}))();export{d as Default,p as Disabled,h as Invalid,f as Placeholder,m as ReadOnly,_ as WithRows,g as WithValue,v as __namedExportsOrder,u as default};