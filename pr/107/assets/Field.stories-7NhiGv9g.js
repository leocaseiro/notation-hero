import{i as e}from"./preload-helper-k9Ak0obN.js";import{t}from"./react-BAe-8Ad0.js";import{t as n}from"./jsx-runtime-DQHEVWnk.js";import{w as r}from"./iframe-nTG-2vbr.js";import{n as i,t as a}from"./utils-BepByl8J.js";import{n as o,t as s}from"./dist-BNTxXBCb.js";function c(e){return[e?.message,e]}function l(e){return e?.message&&(0,d.jsx)(`li`,{children:e.message},e.message)}var u,d,f,p,m,h,g,_,v,y,b,x,S,C=e((()=>{u=r(),o(),t(),i(),d=n(),f=s(`group/field flex w-full gap-3 data-[invalid=true]:text-destructive`,{variants:{orientation:{vertical:[`flex-col [&>*]:w-full [&>.sr-only]:w-auto`],horizontal:[`flex-row items-center`,`[&>[data-slot=field-label]]:flex-auto`,`has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px`],responsive:[`flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto`,`@md/field-group:[&>[data-slot=field-label]]:flex-auto`,`@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px`]}},defaultVariants:{orientation:`vertical`}}),p=({className:e,orientation:t=`vertical`,...n})=>(0,d.jsx)(`div`,{role:`group`,"data-slot":`field`,"data-orientation":t,className:a(f({orientation:t}),e),...n}),m=e=>{let t=(0,u.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=a(`group/field-label peer/field-label flex w-fit gap-2 text-sm leading-snug font-medium select-none group-data-[disabled=true]/field:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50`,`has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4`,`has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 dark:has-data-[state=checked]:bg-primary/10`,n),t[3]=n,t[4]=i);let o;return t[5]!==r||t[6]!==i?(o=(0,d.jsx)(`label`,{"data-slot":`field-label`,className:i,...r}),t[5]=r,t[6]=i,t[7]=o):o=t[7],o},h=e=>{let t=(0,u.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=a(`flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50`,n),t[3]=n,t[4]=i);let o;return t[5]!==r||t[6]!==i?(o=(0,d.jsx)(`div`,{"data-slot":`field-title`,className:i,...r}),t[5]=r,t[6]=i,t[7]=o):o=t[7],o},g=e=>{let t=(0,u.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=a(`group/field-content flex flex-1 flex-col gap-1.5 leading-snug`,n),t[3]=n,t[4]=i);let o;return t[5]!==r||t[6]!==i?(o=(0,d.jsx)(`div`,{"data-slot":`field-content`,className:i,...r}),t[5]=r,t[6]=i,t[7]=o):o=t[7],o},_=e=>{let t=(0,u.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=a(`text-sm leading-normal font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance`,`last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5`,`[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary`,n),t[3]=n,t[4]=i);let o;return t[5]!==r||t[6]!==i?(o=(0,d.jsx)(`p`,{"data-slot":`field-description`,className:i,...r}),t[5]=r,t[6]=i,t[7]=o):o=t[7],o},v=e=>{let t=(0,u.c)(15),n,r,i,o;t[0]===e?(n=t[1],r=t[2],i=t[3],o=t[4]):({className:r,children:n,errors:i,...o}=e,t[0]=e,t[1]=n,t[2]=r,t[3]=i,t[4]=o);let s;bb0:{if(n){s=n;break bb0}if(!i?.length){s=null;break bb0}let e;t[5]===i?e=t[6]:(e=[...new Map(i.map(c)).values()],t[5]=i,t[6]=e);let r=e;if(r.length===1){s=r[0]?.message;break bb0}let a;t[7]===r?a=t[8]:(a=(0,d.jsx)(`ul`,{className:`ml-4 flex list-disc flex-col gap-1`,children:r.map(l)}),t[7]=r,t[8]=a),s=a}let f=s;if(!f)return null;let p;t[9]===r?p=t[10]:(p=a(`text-sm font-normal text-destructive`,r),t[9]=r,t[10]=p);let m;return t[11]!==f||t[12]!==o||t[13]!==p?(m=(0,d.jsx)(`div`,{role:`alert`,"data-slot":`field-error`,className:p,...o,children:f}),t[11]=f,t[12]=o,t[13]=p,t[14]=m):m=t[14],m},y=e=>{let t=(0,u.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=a(`group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4`,n),t[3]=n,t[4]=i);let o;return t[5]!==r||t[6]!==i?(o=(0,d.jsx)(`div`,{"data-slot":`field-group`,className:i,...r}),t[5]=r,t[6]=i,t[7]=o):o=t[7],o},b=e=>{let t=(0,u.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=a(`flex flex-col gap-6`,`has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3`,n),t[3]=n,t[4]=i);let o;return t[5]!==r||t[6]!==i?(o=(0,d.jsx)(`fieldset`,{"data-slot":`field-set`,className:i,...r}),t[5]=r,t[6]=i,t[7]=o):o=t[7],o},x=({className:e,variant:t=`legend`,...n})=>(0,d.jsx)(`legend`,{"data-slot":`field-legend`,"data-variant":t,className:a(`mb-3 font-medium`,`data-[variant=legend]:text-base`,`data-[variant=label]:text-sm`,e),...n}),S=e=>{let t=(0,u.c)(14),n,r,i;t[0]===e?(n=t[1],r=t[2],i=t[3]):({children:n,className:r,...i}=e,t[0]=e,t[1]=n,t[2]=r,t[3]=i);let o=!!n,s;t[4]===r?s=t[5]:(s=a(`relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2`,r),t[4]=r,t[5]=s);let c;t[6]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,d.jsx)(`div`,{role:`separator`,"aria-orientation":`horizontal`,className:`absolute inset-x-0 top-1/2 h-px bg-border`}),t[6]=c):c=t[6];let l;t[7]===n?l=t[8]:(l=n&&(0,d.jsx)(`span`,{className:`relative mx-auto block w-fit bg-background px-2 text-muted-foreground`,"data-slot":`field-separator-content`,children:n}),t[7]=n,t[8]=l);let f;return t[9]!==i||t[10]!==o||t[11]!==s||t[12]!==l?(f=(0,d.jsxs)(`div`,{"data-slot":`field-separator`,"data-content":o,className:s,...i,children:[c,l]}),t[9]=i,t[10]=o,t[11]=s,t[12]=l,t[13]=f):f=t[13],f},p.__docgenInfo={description:``,methods:[],displayName:`Field`,props:{orientation:{defaultValue:{value:`'vertical'`,computed:!1},required:!1}}},m.__docgenInfo={description:``,methods:[],displayName:`FieldLabel`},_.__docgenInfo={description:``,methods:[],displayName:`FieldDescription`},v.__docgenInfo={description:``,methods:[],displayName:`FieldError`,props:{errors:{required:!1,tsType:{name:`Array`,elements:[{name:`union`,raw:`{ message?: string } | undefined`,elements:[{name:`signature`,type:`object`,raw:`{ message?: string }`,signature:{properties:[{key:`message`,value:{name:`string`,required:!1}}]}},{name:`undefined`}]}],raw:`Array<{ message?: string } | undefined>`},description:``}}},y.__docgenInfo={description:``,methods:[],displayName:`FieldGroup`},b.__docgenInfo={description:``,methods:[],displayName:`FieldSet`},x.__docgenInfo={description:``,methods:[],displayName:`FieldLegend`,props:{variant:{required:!1,tsType:{name:`union`,raw:`'legend' | 'label'`,elements:[{name:`literal`,value:`'legend'`},{name:`literal`,value:`'label'`}]},description:``,defaultValue:{value:`'legend'`,computed:!1}}}},S.__docgenInfo={description:``,methods:[],displayName:`FieldSeparator`,props:{children:{required:!1,tsType:{name:`ReactReactNode`,raw:`React.ReactNode`},description:``}}},g.__docgenInfo={description:``,methods:[],displayName:`FieldContent`},h.__docgenInfo={description:``,methods:[],displayName:`FieldTitle`}})),w,T,E,D,O,k,A,j,M,N,P,F,I;e((()=>{C(),w=n(),T={title:`UI/Field`,component:p,parameters:{layout:`centered`},tags:[`autodocs`],argTypes:{orientation:{control:`select`,options:[`vertical`,`horizontal`,`responsive`]}}},E=`h-9 rounded-md border border-input bg-background px-3 text-sm transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20`,D={render:e=>(0,w.jsxs)(p,{...e,className:`w-72`,children:[(0,w.jsx)(m,{htmlFor:`field-name`,children:`Name`}),(0,w.jsx)(`input`,{id:`field-name`,type:`text`,placeholder:`Ada Lovelace`,className:E})]})},O={render:()=>(0,w.jsxs)(p,{className:`w-72`,children:[(0,w.jsx)(m,{htmlFor:`field-email`,children:`Email`}),(0,w.jsx)(`input`,{id:`field-email`,type:`email`,placeholder:`you@example.com`,"aria-describedby":`field-email-description`,className:E}),(0,w.jsx)(_,{id:`field-email-description`,children:`We'll only use this to send your receipt.`})]})},k={render:()=>(0,w.jsxs)(p,{"data-invalid":`true`,className:`w-72`,children:[(0,w.jsx)(m,{htmlFor:`field-password`,children:`Password`}),(0,w.jsx)(`input`,{id:`field-password`,type:`password`,"aria-invalid":`true`,"aria-describedby":`field-password-error`,className:E}),(0,w.jsx)(v,{id:`field-password-error`,children:`Must be at least 8 characters.`})]})},A={render:()=>(0,w.jsxs)(p,{"data-invalid":`true`,className:`w-72`,children:[(0,w.jsx)(m,{htmlFor:`field-username`,children:`Username`}),(0,w.jsx)(`input`,{id:`field-username`,type:`text`,"aria-invalid":`true`,"aria-describedby":`field-username-error`,className:E}),(0,w.jsx)(v,{id:`field-username-error`,errors:[{message:`Must be at least 3 characters.`},{message:`Already taken.`}]})]})},j={render:()=>(0,w.jsxs)(p,{"data-disabled":`true`,className:`w-72`,children:[(0,w.jsx)(m,{htmlFor:`field-disabled-name`,children:`Name`}),(0,w.jsx)(`input`,{id:`field-disabled-name`,type:`text`,disabled:!0,placeholder:`Ada Lovelace`,className:`${E} disabled:cursor-not-allowed disabled:opacity-50`})]})},M={render:()=>(0,w.jsxs)(p,{orientation:`horizontal`,className:`w-72`,children:[(0,w.jsx)(m,{htmlFor:`field-newsletter`,children:`Subscribe`}),(0,w.jsx)(`input`,{id:`field-newsletter`,type:`checkbox`})]})},N={render:()=>(0,w.jsxs)(b,{className:`w-72`,children:[(0,w.jsx)(x,{children:`Contact details`}),(0,w.jsxs)(y,{children:[(0,w.jsxs)(p,{children:[(0,w.jsx)(m,{htmlFor:`fieldset-first`,children:`First name`}),(0,w.jsx)(`input`,{id:`fieldset-first`,type:`text`,className:E})]}),(0,w.jsxs)(p,{children:[(0,w.jsx)(m,{htmlFor:`fieldset-last`,children:`Last name`}),(0,w.jsx)(`input`,{id:`fieldset-last`,type:`text`,className:E})]}),(0,w.jsxs)(b,{children:[(0,w.jsx)(x,{variant:`label`,children:`Preferred contact`}),(0,w.jsxs)(p,{children:[(0,w.jsx)(m,{htmlFor:`fieldset-phone`,children:`Phone`}),(0,w.jsx)(`input`,{id:`fieldset-phone`,type:`tel`,className:E})]})]})]})]})},P={render:()=>(0,w.jsxs)(b,{className:`w-72`,children:[(0,w.jsx)(x,{children:`Sign in`}),(0,w.jsxs)(y,{children:[(0,w.jsxs)(p,{children:[(0,w.jsx)(h,{children:`Continue with email`}),(0,w.jsxs)(g,{children:[(0,w.jsx)(m,{htmlFor:`grouped-email`,children:`Email`}),(0,w.jsx)(`input`,{id:`grouped-email`,type:`email`,placeholder:`you@example.com`,className:E})]})]}),(0,w.jsx)(S,{children:`OR`}),(0,w.jsxs)(p,{children:[(0,w.jsx)(h,{children:`Continue with a phone number`}),(0,w.jsxs)(g,{children:[(0,w.jsx)(m,{htmlFor:`grouped-phone`,children:`Phone`}),(0,w.jsx)(`input`,{id:`grouped-phone`,type:`tel`,placeholder:`+61 400 000 000`,className:E})]})]})]})]})},F={render:()=>(0,w.jsx)(y,{className:`w-[32rem]`,children:(0,w.jsxs)(p,{orientation:`responsive`,children:[(0,w.jsx)(m,{htmlFor:`responsive-username`,children:`Username`}),(0,w.jsx)(`input`,{id:`responsive-username`,type:`text`,placeholder:`ada.lovelace`,className:E})]})})},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: args => <Field {...args} className="w-72">
      <FieldLabel htmlFor="field-name">Name</FieldLabel>
      <input id="field-name" type="text" placeholder="Ada Lovelace" className={inputClass} />
    </Field>
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => <Field className="w-72">
      <FieldLabel htmlFor="field-email">Email</FieldLabel>
      <input id="field-email" type="email" placeholder="you@example.com" aria-describedby="field-email-description" className={inputClass} />
      <FieldDescription id="field-email-description">
        We&apos;ll only use this to send your receipt.
      </FieldDescription>
    </Field>
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  render: () => <Field data-invalid="true" className="w-72">
      <FieldLabel htmlFor="field-password">Password</FieldLabel>
      <input id="field-password" type="password" aria-invalid="true" aria-describedby="field-password-error" className={inputClass} />
      <FieldError id="field-password-error">Must be at least 8 characters.</FieldError>
    </Field>
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: () => <Field data-invalid="true" className="w-72">
      <FieldLabel htmlFor="field-username">Username</FieldLabel>
      <input id="field-username" type="text" aria-invalid="true" aria-describedby="field-username-error" className={inputClass} />
      <FieldError id="field-username-error" errors={[{
      message: 'Must be at least 3 characters.'
    }, {
      message: 'Already taken.'
    }]} />
    </Field>
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: () => <Field data-disabled="true" className="w-72">
      <FieldLabel htmlFor="field-disabled-name">Name</FieldLabel>
      <input id="field-disabled-name" type="text" disabled placeholder="Ada Lovelace" className={\`\${inputClass} disabled:cursor-not-allowed disabled:opacity-50\`} />
    </Field>
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  render: () => <Field orientation="horizontal" className="w-72">
      <FieldLabel htmlFor="field-newsletter">Subscribe</FieldLabel>
      <input id="field-newsletter" type="checkbox" />
    </Field>
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  render: () => <FieldSet className="w-72">
      <FieldLegend>Contact details</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fieldset-first">First name</FieldLabel>
          <input id="fieldset-first" type="text" className={inputClass} />
        </Field>
        <Field>
          <FieldLabel htmlFor="fieldset-last">Last name</FieldLabel>
          <input id="fieldset-last" type="text" className={inputClass} />
        </Field>
        <FieldSet>
          <FieldLegend variant="label">Preferred contact</FieldLegend>
          <Field>
            <FieldLabel htmlFor="fieldset-phone">Phone</FieldLabel>
            <input id="fieldset-phone" type="tel" className={inputClass} />
          </Field>
        </FieldSet>
      </FieldGroup>
    </FieldSet>
}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  render: () => <FieldSet className="w-72">
      <FieldLegend>Sign in</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldTitle>Continue with email</FieldTitle>
          <FieldContent>
            <FieldLabel htmlFor="grouped-email">Email</FieldLabel>
            <input id="grouped-email" type="email" placeholder="you@example.com" className={inputClass} />
          </FieldContent>
        </Field>
        <FieldSeparator>OR</FieldSeparator>
        <Field>
          <FieldTitle>Continue with a phone number</FieldTitle>
          <FieldContent>
            <FieldLabel htmlFor="grouped-phone">Phone</FieldLabel>
            <input id="grouped-phone" type="tel" placeholder="+61 400 000 000" className={inputClass} />
          </FieldContent>
        </Field>
      </FieldGroup>
    </FieldSet>
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  render: () => <FieldGroup className="w-[32rem]">
      <Field orientation="responsive">
        <FieldLabel htmlFor="responsive-username">Username</FieldLabel>
        <input id="responsive-username" type="text" placeholder="ada.lovelace" className={inputClass} />
      </Field>
    </FieldGroup>
}`,...F.parameters?.docs?.source}}},I=[`Default`,`WithDescription`,`WithError`,`MultipleErrors`,`Disabled`,`Horizontal`,`Fieldset`,`Grouped`,`Responsive`]}))();export{D as Default,j as Disabled,N as Fieldset,P as Grouped,M as Horizontal,A as MultipleErrors,F as Responsive,O as WithDescription,k as WithError,I as __namedExportsOrder,T as default};