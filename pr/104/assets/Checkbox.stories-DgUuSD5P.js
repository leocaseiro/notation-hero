import{i as e}from"./preload-helper-DPKCYhJK.js";import{t}from"./jsx-runtime-Dwrb66Ab.js";import{w as n}from"./iframe-CSfGb5K4.js";import{n as r,t as i}from"./utils-CApTNWb_.js";import{c as a,l as o,t as s}from"./dist-CJ5tbD0K.js";var c,l,u,d=e((()=>{c=n(),s(),r(),l=t(),u=e=>{let t=(0,c.c)(10),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let s;t[3]===n?s=t[4]:(s=i(`group/checkbox peer relative size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary dark:data-[state=indeterminate]:bg-primary`,n),t[3]=n,t[4]=s);let u;t[5]===Symbol.for(`react.memo_cache_sentinel`)?(u=(0,l.jsx)(`span`,{className:`hidden group-data-[state=checked]/checkbox:contents`,"aria-hidden":`true`,children:(0,l.jsx)(`span`,{className:`material-symbols-outlined text-[0.875rem]!`,children:`check`})}),t[5]=u):u=t[5];let d;t[6]===Symbol.for(`react.memo_cache_sentinel`)?(d=(0,l.jsxs)(o,{"data-slot":`checkbox-indicator`,className:`absolute inset-0 flex items-center justify-center text-current`,children:[u,(0,l.jsx)(`span`,{className:`hidden group-data-[state=indeterminate]/checkbox:contents`,"aria-hidden":`true`,children:(0,l.jsx)(`span`,{className:`material-symbols-outlined text-[0.875rem]!`,children:`remove`})})]}),t[6]=d):d=t[6];let f;return t[7]!==r||t[8]!==s?(f=(0,l.jsx)(a,{"data-slot":`checkbox`,className:s,...r,children:d}),t[7]=r,t[8]=s,t[9]=f):f=t[9],f},u.__docgenInfo={description:'Checkbox built on Radix `Checkbox`. Renders a Material Symbols glyph in the\nindicator — `check` when checked, and `remove` (a horizontal bar) when\nindeterminate (the tri-state a Radix checkbox supports for "some but not all\nchildren selected"). The glyph follows the rendered `data-state`, so it is\ncorrect for both the controlled (`checked="indeterminate"`) and uncontrolled\n(`defaultChecked="indeterminate"`) paths. Pair it with a label via a shared\n`id`/`htmlFor` so clicking the text toggles the box. Radix renders the\naccessible `role="checkbox"` on an underlying button.',methods:[],displayName:`Checkbox`}})),f,p,m,h,g,_,v,y,b,x;e((()=>{d(),f=t(),p={title:`UI/Checkbox`,component:u,parameters:{layout:`centered`},tags:[`autodocs`],args:{"aria-label":`Accept terms`}},m={},h={args:{checked:!0}},g={args:{checked:`indeterminate`}},_={args:{disabled:!0}},v={args:{disabled:!0,checked:!0}},y={args:{"aria-invalid":!0}},b={render:()=>(0,f.jsxs)(`label`,{htmlFor:`terms`,className:`flex items-center gap-2 text-sm`,children:[(0,f.jsx)(u,{id:`terms`}),`Accept terms and conditions`]})},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    checked: true
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    checked: 'indeterminate'
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    checked: true
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    'aria-invalid': true
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <label htmlFor="terms" className="flex items-center gap-2 text-sm">
      <Checkbox id="terms" />
      Accept terms and conditions
    </label>
}`,...b.parameters?.docs?.source}}},x=[`Default`,`Checked`,`Indeterminate`,`Disabled`,`DisabledChecked`,`Invalid`,`WithLabel`]}))();export{h as Checked,m as Default,_ as Disabled,v as DisabledChecked,g as Indeterminate,y as Invalid,b as WithLabel,x as __namedExportsOrder,p as default};