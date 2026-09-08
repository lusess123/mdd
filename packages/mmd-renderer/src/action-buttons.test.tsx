import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActionButtons } from './action-buttons';
import { MmdProvider, useMmd } from './provider';

function ContextRecordActions() {
  const { client } = useMmd();
  return <ActionButtons actions={[{ label:'Visible row action',type:'custom',visible:{field:'status',operator:'eq',value:'active'} }]} context={{client,model:'Test',record:{id:'row-1',status:'active'}}}/>;
}

test('row action conditions use context.record when no separate record prop exists', () => {
  expect(renderToStaticMarkup(<MmdProvider><ContextRecordActions/></MmdProvider>)).toContain('Visible row action');
});
