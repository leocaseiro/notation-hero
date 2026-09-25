import{i as e,s as t}from"./preload-helper-D2Tj54I7.js";import{t as n}from"./react-oFBTHxA-.js";import{t as r}from"./jsx-runtime-Di7G22GK.js";import{w as i}from"./iframe-B8Zj3ZrR.js";import{r as a,t as o}from"./utils-BctKywgG.js";import{r as s,t as c}from"./Button-B8m0vPb4.js";import{d as l,t as u}from"./Field-W0tzQuQz.js";import{i as d,n as f,r as p,t as m}from"./Tooltip-Cs5XnaXw.js";import{a as h,c as g,i as _,o as v,r as y,s as b,t as x}from"./TrackRow-DPTLW61e.js";import{n as S,t as C}from"./Slider-CSv1Z2EM.js";function w(e){return`${Math.round(e*100)}%`}var T,E,D,O,k,A=e((()=>{T=i(),E=t(n(),1),s(),l(),S(),d(),g(),a(),D=r(),O=e=>{let t=(0,T.c)(42),n,r,i,a,s,c,l,d,f,p,m,h;t[0]===e?(n=t[1],r=t[2],i=t[3],a=t[4],s=t[5],c=t[6],l=t[7],d=t[8],f=t[9],p=t[10],m=t[11],h=t[12]):({volume:h,onVolumeChange:l,soloAll:f,soloAllIndeterminate:p,onSoloAllChange:c,muteAll:i,muteAllIndeterminate:a,onMuteAllChange:s,soloMuteUnavailable:m,leading:r,className:n,...d}=e,t[0]=e,t[1]=n,t[2]=r,t[3]=i,t[4]=a,t[5]=s,t[6]=c,t[7]=l,t[8]=d,t[9]=f,t[10]=p,t[11]=m,t[12]=h);let[g,_]=(0,E.useState)(null),y=!!m,b=m??(f&&!p?`Clear solos`:`Solo all`),x=m??(i&&!a?`Unmute all`:`Mute all`),S;t[13]===n?S=t[14]:(S=o(v,`px-2 py-1.5`,n),t[13]=n,t[14]=S);let O;t[15]===r?O=t[16]:(O=(0,D.jsx)(`span`,{className:`flex size-[2.125rem] items-center justify-center`,children:r}),t[15]=r,t[16]=O);let A;t[17]===Symbol.for(`react.memo_cache_sentinel`)?(A=(0,D.jsx)(`span`,{className:`min-w-0 truncate text-sm font-semibold`,children:`Master`}),t[17]=A):A=t[17];let j;t[18]!==y||t[19]!==c||t[20]!==f||t[21]!==p||t[22]!==b?(j=(0,D.jsx)(k,{pressed:f,indeterminate:p,label:`Solo all`,tooltip:b,disabled:y,icon:`headphones`,onChange:c}),t[18]=y,t[19]=c,t[20]=f,t[21]=p,t[22]=b,t[23]=j):j=t[23];let M;t[24]!==y||t[25]!==i||t[26]!==a||t[27]!==x||t[28]!==s?(M=(0,D.jsx)(k,{pressed:i,indeterminate:a,label:`Mute all`,tooltip:x,disabled:y,icon:`volume_off`,mute:!0,onChange:s}),t[24]=y,t[25]=i,t[26]=a,t[27]=x,t[28]=s,t[29]=M):M=t[29];let N=g??h,P;t[30]===l?P=t[31]:(P=e=>{_(null),l(e)},t[30]=l,t[31]=P);let F;t[32]!==N||t[33]!==P?(F=(0,D.jsx)(C,{value:N,onChange:_,onCommit:P,min:0,max:1,step:.05,label:`Master volume`,showReadout:!0,formatValue:w,className:`w-full min-w-0 px-4`}),t[32]=N,t[33]=P,t[34]=F):F=t[34];let I;return t[35]!==d||t[36]!==S||t[37]!==O||t[38]!==j||t[39]!==M||t[40]!==F?(I=(0,D.jsxs)(u,{"data-slot":`master-row`,orientation:`horizontal`,className:S,...d,children:[O,A,j,M,F]}),t[35]=d,t[36]=S,t[37]=O,t[38]=j,t[39]=M,t[40]=F,t[41]=I):I=t[41],I},k=({pressed:e,indeterminate:t,label:n,tooltip:r,disabled:i,icon:a,mute:s=!1,onChange:l})=>(0,D.jsxs)(m,{children:[(0,D.jsx)(p,{closeOnClick:!1,render:(0,D.jsx)(`span`,{className:`inline-flex`}),children:(0,D.jsx)(c,{variant:`ghost`,size:`icon`,"aria-pressed":t?`mixed`:e,"aria-label":n,disabled:i,onClick:()=>l(!(e&&!t)),className:o(_,`border border-border`,s?h:b,t&&(s?`border-warning bg-warning/25 text-warning`:`border-primary bg-primary/20 text-primary`)),children:(0,D.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,children:a})})}),(0,D.jsx)(f,{sideOffset:8,className:`max-w-40`,children:r})]}),O.__docgenInfo={description:``,methods:[],displayName:`MasterRow`}})),j,M,N,P,F,I,L,R,z;e((()=>{s(),d(),g(),y(),A(),j=r(),{fn:M}=__STORYBOOK_MODULE_TEST__,N={title:`UI/MasterRow`,component:O,parameters:{layout:`padded`},tags:[`autodocs`],args:{volume:.5,onVolumeChange:M(),soloAll:!1,soloAllIndeterminate:!1,onSoloAllChange:M(),muteAll:!1,muteAllIndeterminate:!1,onMuteAllChange:M()},decorators:[e=>(0,j.jsx)(`div`,{className:`w-[30rem]`,children:(0,j.jsx)(e,{})})]},P={},F={args:{soloAllIndeterminate:!0,muteAllIndeterminate:!0}},I={args:{soloAll:!0,muteAll:!0}},L={args:{soloMuteUnavailable:x}},R={args:{leading:(0,j.jsxs)(m,{children:[(0,j.jsx)(p,{closeOnClick:!1,render:(0,j.jsx)(`span`,{className:`inline-flex`}),children:(0,j.jsx)(c,{variant:`ghost`,size:`icon`,"aria-pressed":!1,"aria-label":`Multiple tracks`,className:`${_} border border-border`,children:(0,j.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,children:`splitscreen`})})}),(0,j.jsx)(f,{sideOffset:8,className:`max-w-40`,children:`Multiple tracks`})]})}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  args: {
    soloAllIndeterminate: true,
    muteAllIndeterminate: true
  }
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  args: {
    soloAll: true,
    muteAll: true
  }
}`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  args: {
    soloMuteUnavailable: RECORDING
  }
}`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  args: {
    leading: <Tooltip>
        <TooltipTrigger closeOnClick={false} render={<span className="inline-flex" />}>
          <Button variant="ghost" size="icon" aria-pressed={false} aria-label="Multiple tracks" className={\`\${MIXER_BUTTON_CLASS} border border-border\`}>
            <span className="material-symbols-outlined" aria-hidden="true">
              splitscreen
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={8} className="max-w-40">
          Multiple tracks
        </TooltipContent>
      </Tooltip>
  }
}`,...R.parameters?.docs?.source}}},z=[`Resting`,`Mixed`,`Ticked`,`Recording`,`WithLeadingControl`]}))();export{F as Mixed,L as Recording,P as Resting,I as Ticked,R as WithLeadingControl,z as __namedExportsOrder,N as default};