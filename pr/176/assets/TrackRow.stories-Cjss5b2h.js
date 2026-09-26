import{i as e}from"./preload-helper-D2Tj54I7.js";import{t}from"./jsx-runtime-Di7G22GK.js";import{n,r,t as i}from"./TrackRow-6MhLmqL_.js";var a,o,s,c,l,u,d,f,p,m,h,g,_,v;e((()=>{r(),a=t(),{fn:o}=__STORYBOOK_MODULE_TEST__,s={id:`staff-0`,label:`Staff 1`,showStandardNotation:!0,showSlash:!1,showNumbered:!1,showTablature:!1,tablatureAvailable:!1},c={id:`staff-0`,label:`Staff 1`,showStandardNotation:!0,showSlash:!1,showNumbered:!1,showTablature:!0,tablatureAvailable:!0},l={title:`UI/TrackRow`,component:n,parameters:{layout:`padded`},tags:[`autodocs`],args:{name:`Drumkit`,rendered:!0,onRenderedChange:o(),solo:!1,onSoloChange:o(),mute:!1,onMuteChange:o(),volume:8,onVolumeChange:o(),staves:[s],onStaffChange:o(),transposeAudio:0,onTransposeAudioChange:o(),transposeFull:0,onTransposeFullChange:o(),expanded:!1,onExpandedChange:o()},decorators:[e=>(0,a.jsx)(`div`,{className:`w-[30rem]`,children:(0,a.jsx)(e,{})})]},u={},d={args:{expanded:!0}},f={args:{name:`Distortion Guitar`,staves:[c],expanded:!0}},p={args:{name:`Piano`,staves:[{...s,id:`treble`,label:`Treble`},{...s,id:`bass`,label:`Bass`}]}},m={args:{mute:!0}},h={args:{solo:!0}},g={args:{expanded:!0,mixUnavailable:i}},_={args:{expandUnavailable:`Transposition is not available for percussion tracks`}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    expanded: true
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    name: 'Distortion Guitar',
    staves: [guitarStaff],
    expanded: true
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    name: 'Piano',
    staves: [{
      ...drumStaff,
      id: 'treble',
      label: 'Treble'
    }, {
      ...drumStaff,
      id: 'bass',
      label: 'Bass'
    }]
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    mute: true
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    solo: true
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    expanded: true,
    mixUnavailable: RECORDING
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    expandUnavailable: 'Transposition is not available for percussion tracks'
  }
}`,..._.parameters?.docs?.source}}},v=[`Collapsed`,`Expanded`,`StringedExpanded`,`MultiStaff`,`Muted`,`Soloed`,`Recording`,`PercussionExpandLocked`]}))();export{u as Collapsed,d as Expanded,p as MultiStaff,m as Muted,_ as PercussionExpandLocked,g as Recording,h as Soloed,f as StringedExpanded,v as __namedExportsOrder,l as default};