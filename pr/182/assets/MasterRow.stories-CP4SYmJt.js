import{i as e}from"./preload-helper-MfomZgdJ.js";import{t}from"./jsx-runtime-Dl18o50K.js";import{w as n}from"./iframe-W2AVEZ0T.js";import{r,t as i}from"./utils-CCIa87Df.js";import{r as a,t as o}from"./Button-BtRrxdmv.js";import{d as s,t as c}from"./Field-CvURKkWF.js";import{i as l,n as u,r as d,t as f}from"./Tooltip-2gX1MRql.js";import{a as p,c as m,i as h,o as g,r as _,s as v,t as y}from"./TrackRow-dLuAZRHa.js";import{n as b,t as x}from"./Slider-CBbEV9oN.js";import{n as S,t as C}from"./SliderDraft-BvAZehc7.js";function w(e){return`${Math.round(e*100)}%`}var T,E,D,O,k=e((()=>{T=n(),a(),s(),b(),C(),l(),m(),r(),E=t(),D=e=>{let t=(0,T.c)(39),n,r,a,o,s,l,u,d,f,p,m,h;t[0]===e?(n=t[1],r=t[2],a=t[3],o=t[4],s=t[5],l=t[6],u=t[7],d=t[8],f=t[9],p=t[10],m=t[11],h=t[12]):({volume:h,onVolumeChange:u,soloAll:f,soloAllIndeterminate:p,onSoloAllChange:l,muteAll:a,muteAllIndeterminate:o,onMuteAllChange:s,soloMuteUnavailable:m,leading:r,className:n,...d}=e,t[0]=e,t[1]=n,t[2]=r,t[3]=a,t[4]=o,t[5]=s,t[6]=l,t[7]=u,t[8]=d,t[9]=f,t[10]=p,t[11]=m,t[12]=h);let _=S(h,u),v=!!m,y=m??(f&&!p?`Clear solos`:`Solo all`),b=m??(a&&!o?`Unmute all`:`Mute all`),C;t[13]===n?C=t[14]:(C=i(g,`px-2 py-1.5`,n),t[13]=n,t[14]=C);let D;t[15]===r?D=t[16]:(D=(0,E.jsx)(`span`,{className:`flex size-[2.125rem] items-center justify-center`,children:r}),t[15]=r,t[16]=D);let k;t[17]===Symbol.for(`react.memo_cache_sentinel`)?(k=(0,E.jsx)(`span`,{className:`min-w-0 truncate text-sm font-semibold`,children:`Master`}),t[17]=k):k=t[17];let A;t[18]!==v||t[19]!==l||t[20]!==f||t[21]!==p||t[22]!==y?(A=(0,E.jsx)(O,{pressed:f,indeterminate:p,label:`Solo all`,tooltip:y,disabled:v,icon:`headphones`,onChange:l}),t[18]=v,t[19]=l,t[20]=f,t[21]=p,t[22]=y,t[23]=A):A=t[23];let j;t[24]!==v||t[25]!==a||t[26]!==o||t[27]!==b||t[28]!==s?(j=(0,E.jsx)(O,{pressed:a,indeterminate:o,label:`Mute all`,tooltip:b,disabled:v,icon:`volume_off`,mute:!0,onChange:s}),t[24]=v,t[25]=a,t[26]=o,t[27]=b,t[28]=s,t[29]=j):j=t[29];let M;t[30]===_?M=t[31]:(M=(0,E.jsx)(x,{..._,min:0,max:1,step:.05,label:`Master volume`,showReadout:!0,formatValue:w,className:`w-full min-w-0 px-4`}),t[30]=_,t[31]=M);let N;return t[32]!==d||t[33]!==C||t[34]!==D||t[35]!==A||t[36]!==j||t[37]!==M?(N=(0,E.jsxs)(c,{"data-slot":`master-row`,orientation:`horizontal`,className:C,...d,children:[D,k,A,j,M]}),t[32]=d,t[33]=C,t[34]=D,t[35]=A,t[36]=j,t[37]=M,t[38]=N):N=t[38],N},O=({pressed:e,indeterminate:t,label:n,tooltip:r,disabled:a,icon:s,mute:c=!1,onChange:l})=>(0,E.jsxs)(f,{children:[(0,E.jsx)(d,{closeOnClick:!1,render:(0,E.jsx)(`span`,{className:`inline-flex`}),children:(0,E.jsx)(o,{variant:`ghost`,size:`icon`,"aria-pressed":t?`mixed`:e,"aria-label":n,disabled:a,onClick:()=>l(!(e&&!t)),className:i(h,`border border-border`,c?p:v,t&&(c?`border-warning bg-warning/25 text-warning`:`border-primary bg-primary/20 text-primary`)),children:(0,E.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,children:s})})}),(0,E.jsx)(u,{sideOffset:8,className:`max-w-40`,children:r})]}),D.__docgenInfo={description:``,methods:[],displayName:`MasterRow`}})),A,j,M,N,P,F,I,L,R;e((()=>{a(),l(),m(),_(),k(),A=t(),{fn:j}=__STORYBOOK_MODULE_TEST__,M={title:`UI/MasterRow`,component:D,parameters:{layout:`padded`},tags:[`autodocs`],args:{volume:.5,onVolumeChange:j(),soloAll:!1,soloAllIndeterminate:!1,onSoloAllChange:j(),muteAll:!1,muteAllIndeterminate:!1,onMuteAllChange:j()},decorators:[e=>(0,A.jsx)(`div`,{className:`w-[30rem]`,children:(0,A.jsx)(e,{})})]},N={},P={args:{soloAllIndeterminate:!0,muteAllIndeterminate:!0}},F={args:{soloAll:!0,muteAll:!0}},I={args:{soloMuteUnavailable:y}},L={args:{leading:(0,A.jsxs)(f,{children:[(0,A.jsx)(d,{closeOnClick:!1,render:(0,A.jsx)(`span`,{className:`inline-flex`}),children:(0,A.jsx)(o,{variant:`ghost`,size:`icon`,"aria-pressed":!1,"aria-label":`Multiple tracks`,className:`${h} border border-border`,children:(0,A.jsx)(`span`,{className:`material-symbols-outlined`,"aria-hidden":`true`,children:`splitscreen`})})}),(0,A.jsx)(u,{sideOffset:8,className:`max-w-40`,children:`Multiple tracks`})]})}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  args: {
    soloAllIndeterminate: true,
    muteAllIndeterminate: true
  }
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  args: {
    soloAll: true,
    muteAll: true
  }
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  args: {
    soloMuteUnavailable: RECORDING
  }
}`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
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
}`,...L.parameters?.docs?.source}}},R=[`Resting`,`Mixed`,`Ticked`,`Recording`,`WithLeadingControl`]}))();export{P as Mixed,I as Recording,N as Resting,F as Ticked,L as WithLeadingControl,R as __namedExportsOrder,M as default};