import{i as e}from"./preload-helper-B5waXFio.js";import{t}from"./react-DoD8lJc8.js";import{t as n}from"./jsx-runtime-Cc4jarrH.js";import{w as r}from"./iframe-BPQBCeyG.js";import{n as i,t as a}from"./utils-DsMZjyPJ.js";import{n as o,t as s}from"./dist-BSRG2QiK.js";import{n as c,t as l}from"./Checkbox-Byr75LLV.js";function u(e){return[e?.message,e]}function d(e){return e?.message&&(0,p.jsx)(`li`,{children:e.message},e.message)}var f,p,m,h,g,_,v,y,b,x,S,C,w,T=e((()=>{f=r(),o(),t(),i(),p=n(),m=s(`group/field flex w-full gap-2 data-[invalid=true]:text-destructive`,{variants:{orientation:{vertical:[`flex-col [&>*]:w-full [&>.sr-only]:w-auto`],horizontal:[`flex-row items-center`,`[&>[data-slot=field-label]]:flex-auto`,`has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px`],responsive:[`flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto`,`@md/field-group:[&>[data-slot=field-label]]:flex-auto`,`@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px`]}},defaultVariants:{orientation:`vertical`}}),h=({className:e,orientation:t=`vertical`,...n})=>(0,p.jsx)(`div`,{role:`group`,"data-slot":`field`,"data-orientation":t,className:a(m({orientation:t}),e),...n}),g=e=>{let t=(0,f.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=a(`group/field-label peer/field-label flex w-fit gap-2 text-sm leading-snug font-medium select-none group-data-[disabled=true]/field:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50`,`has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4`,`has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 dark:has-data-[state=checked]:bg-primary/10`,n),t[3]=n,t[4]=i);let o;return t[5]!==r||t[6]!==i?(o=(0,p.jsx)(`label`,{"data-slot":`field-label`,className:i,...r}),t[5]=r,t[6]=i,t[7]=o):o=t[7],o},_=e=>{let t=(0,f.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=a(`flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50`,n),t[3]=n,t[4]=i);let o;return t[5]!==r||t[6]!==i?(o=(0,p.jsx)(`div`,{"data-slot":`field-title`,className:i,...r}),t[5]=r,t[6]=i,t[7]=o):o=t[7],o},v=e=>{let t=(0,f.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=a(`group/field-content flex flex-1 flex-col gap-1.5 leading-snug`,n),t[3]=n,t[4]=i);let o;return t[5]!==r||t[6]!==i?(o=(0,p.jsx)(`div`,{"data-slot":`field-content`,className:i,...r}),t[5]=r,t[6]=i,t[7]=o):o=t[7],o},y=e=>{let t=(0,f.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=a(`text-sm leading-normal font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance`,`last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5`,`[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary`,n),t[3]=n,t[4]=i);let o;return t[5]!==r||t[6]!==i?(o=(0,p.jsx)(`p`,{"data-slot":`field-description`,className:i,...r}),t[5]=r,t[6]=i,t[7]=o):o=t[7],o},b=e=>{let t=(0,f.c)(15),n,r,i,o;t[0]===e?(n=t[1],r=t[2],i=t[3],o=t[4]):({className:r,children:n,errors:i,...o}=e,t[0]=e,t[1]=n,t[2]=r,t[3]=i,t[4]=o);let s;bb0:{if(n){s=n;break bb0}if(!i?.length){s=null;break bb0}let e;t[5]===i?e=t[6]:(e=[...new Map(i.map(u)).values()],t[5]=i,t[6]=e);let r=e;if(r.length===1){s=r[0]?.message;break bb0}let a;t[7]===r?a=t[8]:(a=(0,p.jsx)(`ul`,{className:`ml-4 flex list-disc flex-col gap-1`,children:r.map(d)}),t[7]=r,t[8]=a),s=a}let c=s;if(!c)return null;let l;t[9]===r?l=t[10]:(l=a(`text-sm font-normal text-destructive`,r),t[9]=r,t[10]=l);let m;return t[11]!==c||t[12]!==o||t[13]!==l?(m=(0,p.jsx)(`div`,{role:`alert`,"data-slot":`field-error`,className:l,...o,children:c}),t[11]=c,t[12]=o,t[13]=l,t[14]=m):m=t[14],m},x=e=>{let t=(0,f.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=a(`group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4`,n),t[3]=n,t[4]=i);let o;return t[5]!==r||t[6]!==i?(o=(0,p.jsx)(`div`,{"data-slot":`field-group`,className:i,...r}),t[5]=r,t[6]=i,t[7]=o):o=t[7],o},S=e=>{let t=(0,f.c)(8),n,r;t[0]===e?(n=t[1],r=t[2]):({className:n,...r}=e,t[0]=e,t[1]=n,t[2]=r);let i;t[3]===n?i=t[4]:(i=a(`flex flex-col gap-6`,`has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3`,n),t[3]=n,t[4]=i);let o;return t[5]!==r||t[6]!==i?(o=(0,p.jsx)(`fieldset`,{"data-slot":`field-set`,className:i,...r}),t[5]=r,t[6]=i,t[7]=o):o=t[7],o},C=({className:e,variant:t=`legend`,...n})=>(0,p.jsx)(`legend`,{"data-slot":`field-legend`,"data-variant":t,className:a(`mb-3 font-medium`,`data-[variant=legend]:text-base`,`data-[variant=label]:text-sm`,e),...n}),w=e=>{let t=(0,f.c)(14),n,r,i;t[0]===e?(n=t[1],r=t[2],i=t[3]):({children:n,className:r,...i}=e,t[0]=e,t[1]=n,t[2]=r,t[3]=i);let o=!!n,s;t[4]===r?s=t[5]:(s=a(`relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2`,r),t[4]=r,t[5]=s);let c;t[6]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,p.jsx)(`div`,{role:`separator`,"aria-orientation":`horizontal`,className:`absolute inset-x-0 top-1/2 h-px bg-border`}),t[6]=c):c=t[6];let l;t[7]===n?l=t[8]:(l=n&&(0,p.jsx)(`span`,{className:`relative mx-auto block w-fit bg-background px-2 text-muted-foreground`,"data-slot":`field-separator-content`,children:n}),t[7]=n,t[8]=l);let u;return t[9]!==i||t[10]!==o||t[11]!==s||t[12]!==l?(u=(0,p.jsxs)(`div`,{"data-slot":`field-separator`,"data-content":o,className:s,...i,children:[c,l]}),t[9]=i,t[10]=o,t[11]=s,t[12]=l,t[13]=u):u=t[13],u},h.__docgenInfo={description:``,methods:[],displayName:`Field`,props:{orientation:{defaultValue:{value:`'vertical'`,computed:!1},required:!1}}},g.__docgenInfo={description:``,methods:[],displayName:`FieldLabel`},y.__docgenInfo={description:``,methods:[],displayName:`FieldDescription`},b.__docgenInfo={description:``,methods:[],displayName:`FieldError`,props:{errors:{required:!1,tsType:{name:`Array`,elements:[{name:`union`,raw:`{ message?: string } | undefined`,elements:[{name:`signature`,type:`object`,raw:`{ message?: string }`,signature:{properties:[{key:`message`,value:{name:`string`,required:!1}}]}},{name:`undefined`}]}],raw:`Array<{ message?: string } | undefined>`},description:``}}},x.__docgenInfo={description:``,methods:[],displayName:`FieldGroup`},S.__docgenInfo={description:``,methods:[],displayName:`FieldSet`},C.__docgenInfo={description:``,methods:[],displayName:`FieldLegend`,props:{variant:{required:!1,tsType:{name:`union`,raw:`'legend' | 'label'`,elements:[{name:`literal`,value:`'legend'`},{name:`literal`,value:`'label'`}]},description:``,defaultValue:{value:`'legend'`,computed:!1}}}},w.__docgenInfo={description:``,methods:[],displayName:`FieldSeparator`,props:{children:{required:!1,tsType:{name:`ReactReactNode`,raw:`React.ReactNode`},description:``}}},v.__docgenInfo={description:``,methods:[],displayName:`FieldContent`},_.__docgenInfo={description:``,methods:[],displayName:`FieldTitle`}})),E,D,O,k,A,j,M,N,P,F,I,L,R;e((()=>{T(),c(),E=n(),D={title:`UI/Field`,component:h,parameters:{layout:`centered`},tags:[`autodocs`]},O=`h-9 rounded-md border border-input bg-background px-3 text-sm transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20`,k={args:{orientation:`vertical`},argTypes:{orientation:{control:`select`,options:[`vertical`,`horizontal`,`responsive`]}},render:e=>(0,E.jsxs)(h,{...e,className:`w-72`,children:[(0,E.jsx)(g,{htmlFor:`field-name`,children:`Name`}),(0,E.jsx)(`input`,{id:`field-name`,type:`text`,placeholder:`Ada Lovelace`,className:O})]})},A={render:()=>(0,E.jsxs)(h,{className:`w-72`,children:[(0,E.jsx)(g,{htmlFor:`field-email`,children:`Email`}),(0,E.jsx)(`input`,{id:`field-email`,type:`email`,placeholder:`you@example.com`,"aria-describedby":`field-email-description`,className:O}),(0,E.jsx)(y,{id:`field-email-description`,children:`We'll only use this to send your receipt.`})]})},j={render:()=>(0,E.jsxs)(h,{"data-invalid":`true`,className:`w-72`,children:[(0,E.jsx)(g,{htmlFor:`field-password`,children:`Password`}),(0,E.jsx)(`input`,{id:`field-password`,type:`password`,"aria-invalid":`true`,"aria-describedby":`field-password-error`,className:O}),(0,E.jsx)(b,{id:`field-password-error`,children:`Must be at least 8 characters.`})]})},M={render:()=>(0,E.jsxs)(h,{"data-invalid":`true`,className:`w-72`,children:[(0,E.jsx)(g,{htmlFor:`field-username`,children:`Username`}),(0,E.jsx)(`input`,{id:`field-username`,type:`text`,"aria-invalid":`true`,"aria-describedby":`field-username-error`,className:O}),(0,E.jsx)(b,{id:`field-username-error`,errors:[{message:`Must be at least 3 characters.`},{message:`Already taken.`}]})]})},N={render:()=>(0,E.jsxs)(h,{"data-disabled":`true`,className:`w-72`,children:[(0,E.jsx)(g,{htmlFor:`field-disabled-name`,children:`Name`}),(0,E.jsx)(`input`,{id:`field-disabled-name`,type:`text`,disabled:!0,placeholder:`Ada Lovelace`,className:`${O} disabled:cursor-not-allowed disabled:opacity-50`})]})},P={render:()=>(0,E.jsxs)(h,{orientation:`horizontal`,className:`w-72`,children:[(0,E.jsx)(g,{htmlFor:`field-newsletter`,children:`Subscribe`}),(0,E.jsx)(l,{id:`field-newsletter`})]})},F={render:()=>(0,E.jsxs)(S,{className:`w-72`,children:[(0,E.jsx)(C,{children:`Contact details`}),(0,E.jsxs)(x,{children:[(0,E.jsxs)(h,{children:[(0,E.jsx)(g,{htmlFor:`fieldset-first`,children:`First name`}),(0,E.jsx)(`input`,{id:`fieldset-first`,type:`text`,className:O})]}),(0,E.jsxs)(h,{children:[(0,E.jsx)(g,{htmlFor:`fieldset-last`,children:`Last name`}),(0,E.jsx)(`input`,{id:`fieldset-last`,type:`text`,className:O})]}),(0,E.jsxs)(S,{children:[(0,E.jsx)(C,{variant:`label`,children:`Preferred contact`}),(0,E.jsxs)(h,{children:[(0,E.jsx)(g,{htmlFor:`fieldset-phone`,children:`Phone`}),(0,E.jsx)(`input`,{id:`fieldset-phone`,type:`tel`,className:O})]})]})]})]})},I={render:()=>(0,E.jsxs)(S,{className:`w-72`,children:[(0,E.jsx)(C,{children:`Sign in`}),(0,E.jsxs)(x,{children:[(0,E.jsxs)(h,{children:[(0,E.jsx)(_,{children:`Continue with email`}),(0,E.jsxs)(v,{children:[(0,E.jsx)(g,{htmlFor:`grouped-email`,children:`Email`}),(0,E.jsx)(`input`,{id:`grouped-email`,type:`email`,placeholder:`you@example.com`,className:O})]})]}),(0,E.jsx)(w,{children:`OR`}),(0,E.jsxs)(h,{children:[(0,E.jsx)(_,{children:`Continue with a phone number`}),(0,E.jsxs)(v,{children:[(0,E.jsx)(g,{htmlFor:`grouped-phone`,children:`Phone`}),(0,E.jsx)(`input`,{id:`grouped-phone`,type:`tel`,placeholder:`+61 400 000 000`,className:O})]})]})]})]})},L={render:()=>(0,E.jsx)(x,{className:`w-[32rem]`,children:(0,E.jsxs)(h,{orientation:`responsive`,children:[(0,E.jsx)(g,{htmlFor:`responsive-username`,children:`Username`}),(0,E.jsx)(`input`,{id:`responsive-username`,type:`text`,placeholder:`ada.lovelace`,className:O})]})})},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    orientation: 'vertical'
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['vertical', 'horizontal', 'responsive']
    }
  },
  render: args => <Field {...args} className="w-72">
      <FieldLabel htmlFor="field-name">Name</FieldLabel>
      <input id="field-name" type="text" placeholder="Ada Lovelace" className={inputClass} />
    </Field>
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  render: () => <Field className="w-72">
      <FieldLabel htmlFor="field-email">Email</FieldLabel>
      <input id="field-email" type="email" placeholder="you@example.com" aria-describedby="field-email-description" className={inputClass} />
      <FieldDescription id="field-email-description">
        We&apos;ll only use this to send your receipt.
      </FieldDescription>
    </Field>
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: () => <Field data-invalid="true" className="w-72">
      <FieldLabel htmlFor="field-password">Password</FieldLabel>
      <input id="field-password" type="password" aria-invalid="true" aria-describedby="field-password-error" className={inputClass} />
      <FieldError id="field-password-error">Must be at least 8 characters.</FieldError>
    </Field>
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  render: () => <Field data-invalid="true" className="w-72">
      <FieldLabel htmlFor="field-username">Username</FieldLabel>
      <input id="field-username" type="text" aria-invalid="true" aria-describedby="field-username-error" className={inputClass} />
      <FieldError id="field-username-error" errors={[{
      message: 'Must be at least 3 characters.'
    }, {
      message: 'Already taken.'
    }]} />
    </Field>
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  render: () => <Field data-disabled="true" className="w-72">
      <FieldLabel htmlFor="field-disabled-name">Name</FieldLabel>
      <input id="field-disabled-name" type="text" disabled placeholder="Ada Lovelace" className={\`\${inputClass} disabled:cursor-not-allowed disabled:opacity-50\`} />
    </Field>
}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  render: () => <Field orientation="horizontal" className="w-72">
      <FieldLabel htmlFor="field-newsletter">Subscribe</FieldLabel>
      <Checkbox id="field-newsletter" />
    </Field>
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
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
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
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
}`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  render: () => <FieldGroup className="w-[32rem]">
      <Field orientation="responsive">
        <FieldLabel htmlFor="responsive-username">Username</FieldLabel>
        <input id="responsive-username" type="text" placeholder="ada.lovelace" className={inputClass} />
      </Field>
    </FieldGroup>
}`,...L.parameters?.docs?.source}}},R=[`Default`,`WithDescription`,`WithError`,`MultipleErrors`,`Disabled`,`Horizontal`,`Fieldset`,`Grouped`,`Responsive`]}))();export{k as Default,N as Disabled,F as Fieldset,I as Grouped,P as Horizontal,M as MultipleErrors,L as Responsive,A as WithDescription,j as WithError,R as __namedExportsOrder,D as default};