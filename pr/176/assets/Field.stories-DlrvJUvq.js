import{i as e}from"./preload-helper-D2Tj54I7.js";import{t}from"./jsx-runtime-Di7G22GK.js";import{n,t as r}from"./Checkbox-D2bdlG86.js";import{a as i,c as a,d as o,i as s,l as c,n as l,o as u,r as d,s as f,t as p,u as m}from"./Field-W0tzQuQz.js";var h,g,_,v,y,b,x,S,C,w,T,E,D;e((()=>{o(),n(),h=t(),g={title:`UI/Field`,component:p,parameters:{layout:`centered`},tags:[`autodocs`]},_=`h-9 rounded-md border border-input bg-background px-3 text-sm transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20`,v={args:{orientation:`vertical`},argTypes:{orientation:{control:`select`,options:[`vertical`,`horizontal`,`responsive`]}},render:e=>(0,h.jsxs)(p,{...e,className:`w-72`,children:[(0,h.jsx)(u,{htmlFor:`field-name`,children:`Name`}),(0,h.jsx)(`input`,{id:`field-name`,type:`text`,placeholder:`Ada Lovelace`,className:_})]})},y={render:()=>(0,h.jsxs)(p,{className:`w-72`,children:[(0,h.jsx)(u,{htmlFor:`field-email`,children:`Email`}),(0,h.jsx)(`input`,{id:`field-email`,type:`email`,placeholder:`you@example.com`,"aria-describedby":`field-email-description`,className:_}),(0,h.jsx)(d,{id:`field-email-description`,children:`We'll only use this to send your receipt.`})]})},b={render:()=>(0,h.jsxs)(p,{"data-invalid":`true`,className:`w-72`,children:[(0,h.jsx)(u,{htmlFor:`field-password`,children:`Password`}),(0,h.jsx)(`input`,{id:`field-password`,type:`password`,"aria-invalid":`true`,"aria-describedby":`field-password-error`,className:_}),(0,h.jsx)(s,{id:`field-password-error`,children:`Must be at least 8 characters.`})]})},x={render:()=>(0,h.jsxs)(p,{"data-invalid":`true`,className:`w-72`,children:[(0,h.jsx)(u,{htmlFor:`field-username`,children:`Username`}),(0,h.jsx)(`input`,{id:`field-username`,type:`text`,"aria-invalid":`true`,"aria-describedby":`field-username-error`,className:_}),(0,h.jsx)(s,{id:`field-username-error`,errors:[{message:`Must be at least 3 characters.`},{message:`Already taken.`}]})]})},S={render:()=>(0,h.jsxs)(p,{"data-disabled":`true`,className:`w-72`,children:[(0,h.jsx)(u,{htmlFor:`field-disabled-name`,children:`Name`}),(0,h.jsx)(`input`,{id:`field-disabled-name`,type:`text`,disabled:!0,placeholder:`Ada Lovelace`,className:`${_} disabled:cursor-not-allowed disabled:opacity-50`})]})},C={render:()=>(0,h.jsxs)(p,{orientation:`horizontal`,className:`w-72`,children:[(0,h.jsx)(u,{htmlFor:`field-newsletter`,children:`Subscribe`}),(0,h.jsx)(r,{id:`field-newsletter`})]})},w={render:()=>(0,h.jsxs)(c,{className:`w-72`,children:[(0,h.jsx)(f,{children:`Contact details`}),(0,h.jsxs)(i,{children:[(0,h.jsxs)(p,{children:[(0,h.jsx)(u,{htmlFor:`fieldset-first`,children:`First name`}),(0,h.jsx)(`input`,{id:`fieldset-first`,type:`text`,className:_})]}),(0,h.jsxs)(p,{children:[(0,h.jsx)(u,{htmlFor:`fieldset-last`,children:`Last name`}),(0,h.jsx)(`input`,{id:`fieldset-last`,type:`text`,className:_})]}),(0,h.jsxs)(c,{children:[(0,h.jsx)(f,{variant:`label`,children:`Preferred contact`}),(0,h.jsxs)(p,{children:[(0,h.jsx)(u,{htmlFor:`fieldset-phone`,children:`Phone`}),(0,h.jsx)(`input`,{id:`fieldset-phone`,type:`tel`,className:_})]})]})]})]})},T={render:()=>(0,h.jsxs)(c,{className:`w-72`,children:[(0,h.jsx)(f,{children:`Sign in`}),(0,h.jsxs)(i,{children:[(0,h.jsxs)(p,{children:[(0,h.jsx)(m,{children:`Continue with email`}),(0,h.jsxs)(l,{children:[(0,h.jsx)(u,{htmlFor:`grouped-email`,children:`Email`}),(0,h.jsx)(`input`,{id:`grouped-email`,type:`email`,placeholder:`you@example.com`,className:_})]})]}),(0,h.jsx)(a,{children:`OR`}),(0,h.jsxs)(p,{children:[(0,h.jsx)(m,{children:`Continue with a phone number`}),(0,h.jsxs)(l,{children:[(0,h.jsx)(u,{htmlFor:`grouped-phone`,children:`Phone`}),(0,h.jsx)(`input`,{id:`grouped-phone`,type:`tel`,placeholder:`+61 400 000 000`,className:_})]})]})]})]})},E={render:()=>(0,h.jsx)(i,{className:`w-[32rem]`,children:(0,h.jsxs)(p,{orientation:`responsive`,children:[(0,h.jsx)(u,{htmlFor:`responsive-username`,children:`Username`}),(0,h.jsx)(`input`,{id:`responsive-username`,type:`text`,placeholder:`ada.lovelace`,className:_})]})})},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
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
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <Field className="w-72">
      <FieldLabel htmlFor="field-email">Email</FieldLabel>
      <input id="field-email" type="email" placeholder="you@example.com" aria-describedby="field-email-description" className={inputClass} />
      <FieldDescription id="field-email-description">
        We&apos;ll only use this to send your receipt.
      </FieldDescription>
    </Field>
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <Field data-invalid="true" className="w-72">
      <FieldLabel htmlFor="field-password">Password</FieldLabel>
      <input id="field-password" type="password" aria-invalid="true" aria-describedby="field-password-error" className={inputClass} />
      <FieldError id="field-password-error">Must be at least 8 characters.</FieldError>
    </Field>
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => <Field data-invalid="true" className="w-72">
      <FieldLabel htmlFor="field-username">Username</FieldLabel>
      <input id="field-username" type="text" aria-invalid="true" aria-describedby="field-username-error" className={inputClass} />
      <FieldError id="field-username-error" errors={[{
      message: 'Must be at least 3 characters.'
    }, {
      message: 'Already taken.'
    }]} />
    </Field>
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => <Field data-disabled="true" className="w-72">
      <FieldLabel htmlFor="field-disabled-name">Name</FieldLabel>
      <input id="field-disabled-name" type="text" disabled placeholder="Ada Lovelace" className={\`\${inputClass} disabled:cursor-not-allowed disabled:opacity-50\`} />
    </Field>
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => <Field orientation="horizontal" className="w-72">
      <FieldLabel htmlFor="field-newsletter">Subscribe</FieldLabel>
      <Checkbox id="field-newsletter" />
    </Field>
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
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
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
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
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: () => <FieldGroup className="w-[32rem]">
      <Field orientation="responsive">
        <FieldLabel htmlFor="responsive-username">Username</FieldLabel>
        <input id="responsive-username" type="text" placeholder="ada.lovelace" className={inputClass} />
      </Field>
    </FieldGroup>
}`,...E.parameters?.docs?.source}}},D=[`Default`,`WithDescription`,`WithError`,`MultipleErrors`,`Disabled`,`Horizontal`,`Fieldset`,`Grouped`,`Responsive`]}))();export{v as Default,S as Disabled,w as Fieldset,T as Grouped,C as Horizontal,x as MultipleErrors,E as Responsive,y as WithDescription,b as WithError,D as __namedExportsOrder,g as default};