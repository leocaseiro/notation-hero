import{i as e}from"./preload-helper-ATQIgOUJ.js";import{t}from"./jsx-runtime-D6I6jW42.js";import{n,t as r}from"./Checkbox-5O6KT8lk.js";var i,a,o,s,c,l,u,d,f,p,m;e((()=>{n(),i=t(),{fn:a}=__STORYBOOK_MODULE_TEST__,o={title:`UI/Checkbox`,component:r,parameters:{layout:`centered`},tags:[`autodocs`],args:{"aria-label":`Accept terms`,onCheckedChange:a()},argTypes:{checked:{control:`boolean`},indeterminate:{control:`boolean`},disabled:{control:`boolean`},"aria-invalid":{control:`boolean`}}},s={},c={args:{checked:!0}},l={args:{indeterminate:!0}},u={args:{disabled:!0}},d={args:{disabled:!0,checked:!0}},f={args:{"aria-invalid":!0}},p={render:()=>(0,i.jsxs)(`label`,{htmlFor:`terms`,className:`flex items-center gap-2 text-sm`,children:[(0,i.jsx)(r,{id:`terms`}),`Accept terms and conditions`]})},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    checked: true
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    indeterminate: true
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    checked: true
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    'aria-invalid': true
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <label htmlFor="terms" className="flex items-center gap-2 text-sm">
      <Checkbox id="terms" />
      Accept terms and conditions
    </label>
}`,...p.parameters?.docs?.source}}},m=[`Default`,`Checked`,`Indeterminate`,`Disabled`,`DisabledChecked`,`Invalid`,`WithLabel`]}))();export{c as Checked,s as Default,u as Disabled,d as DisabledChecked,l as Indeterminate,f as Invalid,p as WithLabel,m as __namedExportsOrder,o as default};