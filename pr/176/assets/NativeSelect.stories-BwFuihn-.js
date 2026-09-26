import{i as e}from"./preload-helper-D2Tj54I7.js";import{t}from"./jsx-runtime-Di7G22GK.js";import{n,t as r}from"./NativeSelect-Dacqxj1y.js";var i,a,o,s,c,l,u,d,f,p;e((()=>{n(),i=t(),{fn:a}=__STORYBOOK_MODULE_TEST__,o={title:`UI/NativeSelect`,component:r,parameters:{layout:`centered`},tags:[`autodocs`],args:{"aria-label":`Difficulty`,onChange:a()},argTypes:{disabled:{control:`boolean`},"aria-invalid":{control:`boolean`},"aria-label":{control:`text`}}},s={args:{defaultValue:`beginner`},render:e=>(0,i.jsxs)(r,{...e,children:[(0,i.jsx)(`option`,{value:`debut`,children:`Debut`}),(0,i.jsx)(`option`,{value:`beginner`,children:`Beginner`}),(0,i.jsx)(`option`,{value:`intermediate`,children:`Intermediate`}),(0,i.jsx)(`option`,{value:`advanced`,children:`Advanced`})]})},c={args:{defaultValue:``},render:e=>(0,i.jsxs)(r,{...e,children:[(0,i.jsx)(`option`,{value:``,disabled:!0,hidden:!0,children:`Select a difficulty…`}),(0,i.jsx)(`option`,{value:`debut`,children:`Debut`}),(0,i.jsx)(`option`,{value:`beginner`,children:`Beginner`}),(0,i.jsx)(`option`,{value:`intermediate`,children:`Intermediate`})]})},l={args:{defaultValue:`beginner`,disabled:!0},render:e=>(0,i.jsxs)(r,{...e,children:[(0,i.jsx)(`option`,{value:`debut`,children:`Debut`}),(0,i.jsx)(`option`,{value:`beginner`,children:`Beginner`}),(0,i.jsx)(`option`,{value:`intermediate`,children:`Intermediate`})]})},u={args:{defaultValue:``,"aria-invalid":!0},render:e=>(0,i.jsxs)(r,{...e,children:[(0,i.jsx)(`option`,{value:``,disabled:!0,hidden:!0,children:`Select a difficulty…`}),(0,i.jsx)(`option`,{value:`debut`,children:`Debut`}),(0,i.jsx)(`option`,{value:`beginner`,children:`Beginner`})]})},d={args:{"aria-label":`Instrument`,defaultValue:`snare`},render:e=>(0,i.jsxs)(r,{...e,children:[(0,i.jsxs)(`optgroup`,{label:`Percussion`,children:[(0,i.jsx)(`option`,{value:`snare`,children:`Snare`}),(0,i.jsx)(`option`,{value:`kick`,children:`Kick`}),(0,i.jsx)(`option`,{value:`hi-hat`,children:`Hi-hat`})]}),(0,i.jsxs)(`optgroup`,{label:`Melodic`,children:[(0,i.jsx)(`option`,{value:`marimba`,children:`Marimba`}),(0,i.jsx)(`option`,{value:`glockenspiel`,children:`Glockenspiel`})]})]})},f={args:{"aria-label":`Level`,defaultValue:`1`},render:e=>(0,i.jsx)(r,{...e,children:Array.from({length:15},(e,t)=>t+1).map(e=>(0,i.jsxs)(`option`,{value:String(e),children:[`Level `,e]},e))})},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: 'beginner'
  },
  render: args => <NativeSelect {...args}>
      <option value="debut">Debut</option>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
      <option value="advanced">Advanced</option>
    </NativeSelect>
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: ''
  },
  render: args => <NativeSelect {...args}>
      <option value="" disabled hidden>
        Select a difficulty…
      </option>
      <option value="debut">Debut</option>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
    </NativeSelect>
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: 'beginner',
    disabled: true
  },
  render: args => <NativeSelect {...args}>
      <option value="debut">Debut</option>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
    </NativeSelect>
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: '',
    'aria-invalid': true
  },
  render: args => <NativeSelect {...args}>
      <option value="" disabled hidden>
        Select a difficulty…
      </option>
      <option value="debut">Debut</option>
      <option value="beginner">Beginner</option>
    </NativeSelect>
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    'aria-label': 'Instrument',
    defaultValue: 'snare'
  },
  render: args => <NativeSelect {...args}>
      <optgroup label="Percussion">
        <option value="snare">Snare</option>
        <option value="kick">Kick</option>
        <option value="hi-hat">Hi-hat</option>
      </optgroup>
      <optgroup label="Melodic">
        <option value="marimba">Marimba</option>
        <option value="glockenspiel">Glockenspiel</option>
      </optgroup>
    </NativeSelect>
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    'aria-label': 'Level',
    defaultValue: '1'
  },
  render: args => <NativeSelect {...args}>
      {Array.from({
      length: 15
    }, (_, i) => i + 1).map(level => <option key={level} value={String(level)}>
          Level {level}
        </option>)}
    </NativeSelect>
}`,...f.parameters?.docs?.source}}},p=[`Default`,`Placeholder`,`Disabled`,`Invalid`,`WithGroups`,`ManyOptions`]}))();export{s as Default,l as Disabled,u as Invalid,f as ManyOptions,c as Placeholder,d as WithGroups,p as __namedExportsOrder,o as default};