import{i as e}from"./preload-helper-DK-QMVHu.js";import{t}from"./jsx-runtime-Dt4pzsg3.js";import{n,t as r}from"./NameCell-CYYw6EoG.js";var i,a,o,s,c,l,u,d,f,p;e((()=>{n(),i=t(),a={id:`1`,title:`Billie Jean`,subtitle:`Pop · 4/4 · drums·bass`,kind:`song`,icon:`music_note`,level:3,bpm:117,best:74,flags:{audio:!0,video:!0}},o={title:`Catalog/NameCell`,component:r,parameters:{layout:`padded`},tags:[`autodocs`]},s={args:{row:a}},c={args:{row:{...a,title:`Single-stroke timing`,subtitle:`4 steps · timing`,kind:`rudiment`,isLesson:!0,icon:`school`,bpm:`60→120`,flags:{parts:!0}}}},l={args:{row:{...a,title:`Four-on-the-floor`,subtitle:`House · 4/4`,kind:`beat`,best:null}}},u={args:{row:{...a,isNew:!0}}},d={...a,title:`A very long song title that should truncate`,subtitle:`And a long subtitle that also truncates to one line`},f={args:{row:d},render:()=>(0,i.jsx)(`div`,{style:{width:240},children:(0,i.jsx)(r,{row:d})})},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    row: song
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    row: {
      ...song,
      title: 'Single-stroke timing',
      subtitle: '4 steps · timing',
      kind: 'rudiment',
      isLesson: true,
      icon: 'school',
      bpm: '60→120',
      flags: {
        parts: true
      }
    }
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    row: {
      ...song,
      title: 'Four-on-the-floor',
      subtitle: 'House · 4/4',
      kind: 'beat',
      best: null
    }
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    row: {
      ...song,
      isNew: true
    }
  }
}`,...u.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  // \`args\` satisfies the required-\`row\` Meta constraint; \`render\` supplies the same row
  // inside a fixed-width frame so both lines truncate to a single line with an ellipsis.
  args: {
    row: narrowRow
  },
  render: () => <div style={{
    width: 240
  }}>
      <NameCell row={narrowRow} />
    </div>
}`,...f.parameters?.docs?.source}}},p=[`Song`,`Lesson`,`Beat`,`New`,`Narrow`]}))();export{l as Beat,c as Lesson,f as Narrow,u as New,s as Song,p as __namedExportsOrder,o as default};