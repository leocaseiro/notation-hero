import{i as e}from"./preload-helper-ATQIgOUJ.js";import{t}from"./jsx-runtime-D6I6jW42.js";import{w as n}from"./iframe-0-D3gQN9.js";import{n as r,t as i}from"./utils-_FPbbs9p.js";var a,o,s,c=e((()=>{a=n(),r(),o=t(),s=e=>{let t=(0,a.c)(13),n,r,s;t[0]===e?(n=t[1],r=t[2],s=t[3]):({className:r,children:n,...s}=e,t[0]=e,t[1]=n,t[2]=r,t[3]=s);let c;t[4]===r?c=t[5]:(c=i(`peer h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent pl-3 pr-8 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30`,`focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`,`aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40`,r),t[4]=r,t[5]=c);let l;t[6]!==n||t[7]!==s||t[8]!==c?(l=(0,o.jsx)(`select`,{"data-slot":`native-select`,className:c,...s,children:n}),t[6]=n,t[7]=s,t[8]=c,t[9]=l):l=t[9];let u;t[10]===Symbol.for(`react.memo_cache_sentinel`)?(u=(0,o.jsx)(`span`,{"data-slot":`native-select-icon`,className:`material-symbols-outlined pointer-events-none absolute top-1/2 right-2 size-4 text-base! -translate-y-1/2 text-muted-foreground select-none peer-disabled:opacity-50`,"aria-hidden":`true`,children:`unfold_more`}),t[10]=u):u=t[10];let d;return t[11]===l?d=t[12]:(d=(0,o.jsxs)(`div`,{"data-slot":`native-select-wrapper`,className:`relative`,children:[l,u]}),t[11]=l,t[12]=d),d},s.__docgenInfo={description:"Styled wrapper around a native `<select>` — a 9-unit-tall field with the house\nform styling (rounded border, subtle shadow, focus-visible ring). The caller\npasses the `<option>`s (and `<optgroup>`s) as `children`; native `<select>`\nprops (`value`, `defaultValue`, `onChange`, `disabled`, …) pass straight\nthrough. `appearance-none` hides the platform arrow so a decorative Material\nSymbols chevron can sit on the right (`pr-8` reserves its lane). Set\n`aria-invalid` to switch the border and ring to the destructive colour, and\n`disabled` to dim it (`opacity-50`) with a not-allowed cursor. Give it an\naccessible name via `aria-label` or an associated `<label htmlFor>`.",methods:[],displayName:`NativeSelect`}})),l,u,d,f,p,m,h,g,_,v;e((()=>{c(),l=t(),{fn:u}=__STORYBOOK_MODULE_TEST__,d={title:`UI/NativeSelect`,component:s,parameters:{layout:`centered`},tags:[`autodocs`],args:{"aria-label":`Difficulty`,onChange:u()},argTypes:{disabled:{control:`boolean`},"aria-invalid":{control:`boolean`},"aria-label":{control:`text`}}},f={args:{defaultValue:`beginner`},render:e=>(0,l.jsxs)(s,{...e,children:[(0,l.jsx)(`option`,{value:`debut`,children:`Debut`}),(0,l.jsx)(`option`,{value:`beginner`,children:`Beginner`}),(0,l.jsx)(`option`,{value:`intermediate`,children:`Intermediate`}),(0,l.jsx)(`option`,{value:`advanced`,children:`Advanced`})]})},p={args:{defaultValue:``},render:e=>(0,l.jsxs)(s,{...e,children:[(0,l.jsx)(`option`,{value:``,disabled:!0,hidden:!0,children:`Select a difficulty…`}),(0,l.jsx)(`option`,{value:`debut`,children:`Debut`}),(0,l.jsx)(`option`,{value:`beginner`,children:`Beginner`}),(0,l.jsx)(`option`,{value:`intermediate`,children:`Intermediate`})]})},m={args:{defaultValue:`beginner`,disabled:!0},render:e=>(0,l.jsxs)(s,{...e,children:[(0,l.jsx)(`option`,{value:`debut`,children:`Debut`}),(0,l.jsx)(`option`,{value:`beginner`,children:`Beginner`}),(0,l.jsx)(`option`,{value:`intermediate`,children:`Intermediate`})]})},h={args:{defaultValue:``,"aria-invalid":!0},render:e=>(0,l.jsxs)(s,{...e,children:[(0,l.jsx)(`option`,{value:``,disabled:!0,hidden:!0,children:`Select a difficulty…`}),(0,l.jsx)(`option`,{value:`debut`,children:`Debut`}),(0,l.jsx)(`option`,{value:`beginner`,children:`Beginner`})]})},g={args:{"aria-label":`Instrument`,defaultValue:`snare`},render:e=>(0,l.jsxs)(s,{...e,children:[(0,l.jsxs)(`optgroup`,{label:`Percussion`,children:[(0,l.jsx)(`option`,{value:`snare`,children:`Snare`}),(0,l.jsx)(`option`,{value:`kick`,children:`Kick`}),(0,l.jsx)(`option`,{value:`hi-hat`,children:`Hi-hat`})]}),(0,l.jsxs)(`optgroup`,{label:`Melodic`,children:[(0,l.jsx)(`option`,{value:`marimba`,children:`Marimba`}),(0,l.jsx)(`option`,{value:`glockenspiel`,children:`Glockenspiel`})]})]})},_={args:{"aria-label":`Level`,defaultValue:`1`},render:e=>(0,l.jsx)(s,{...e,children:Array.from({length:15},(e,t)=>t+1).map(e=>(0,l.jsxs)(`option`,{value:String(e),children:[`Level `,e]},e))})},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: 'beginner'
  },
  render: args => <NativeSelect {...args}>
      <option value="debut">Debut</option>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
      <option value="advanced">Advanced</option>
    </NativeSelect>
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
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
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: 'beginner',
    disabled: true
  },
  render: args => <NativeSelect {...args}>
      <option value="debut">Debut</option>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
    </NativeSelect>
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
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
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
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
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
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
}`,..._.parameters?.docs?.source}}},v=[`Default`,`Placeholder`,`Disabled`,`Invalid`,`WithGroups`,`ManyOptions`]}))();export{f as Default,m as Disabled,h as Invalid,_ as ManyOptions,p as Placeholder,g as WithGroups,v as __namedExportsOrder,d as default};