import{i as e}from"./preload-helper-BoMmBYap.js";import{n as t,t as n}from"./Input-C39tENhC.js";var r,i,a,o,s,c,l,u,d,f,p,m,h;e((()=>{t(),{fn:r}=__STORYBOOK_MODULE_TEST__,i={title:`UI/Input`,component:n,parameters:{layout:`centered`},tags:[`autodocs`],args:{"aria-label":`Field`,onChange:r(),onFocus:r(),onBlur:r()},argTypes:{type:{control:`select`,options:[`text`,`email`,`password`,`number`,`file`,`search`,`tel`,`url`]},disabled:{control:`boolean`},readOnly:{control:`boolean`},"aria-invalid":{control:`boolean`},placeholder:{control:`text`},defaultValue:{control:`text`}}},a={},o={args:{placeholder:`you@example.com`}},s={args:{disabled:!0,defaultValue:`Locked value`}},c={args:{readOnly:!0,defaultValue:`Read-only value`}},l={args:{"aria-invalid":!0,defaultValue:`not-an-email`}},u={args:{defaultValue:`Paradiddle`}},d={args:{type:`email`,placeholder:`you@example.com`}},f={args:{type:`password`,defaultValue:`hunter2`}},p={args:{type:`number`,defaultValue:120}},m={args:{type:`file`}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: 'you@example.com'
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    defaultValue: 'Locked value'
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    readOnly: true,
    defaultValue: 'Read-only value'
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    'aria-invalid': true,
    defaultValue: 'not-an-email'
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: 'Paradiddle'
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    type: 'email',
    placeholder: 'you@example.com'
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    type: 'password',
    defaultValue: 'hunter2'
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    type: 'number',
    defaultValue: 120
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    type: 'file'
  }
}`,...m.parameters?.docs?.source}}},h=[`Default`,`Placeholder`,`Disabled`,`ReadOnly`,`Invalid`,`WithValue`,`TypeEmail`,`TypePassword`,`TypeNumber`,`TypeFile`]}))();export{a as Default,s as Disabled,l as Invalid,o as Placeholder,c as ReadOnly,d as TypeEmail,m as TypeFile,p as TypeNumber,f as TypePassword,u as WithValue,h as __namedExportsOrder,i as default};