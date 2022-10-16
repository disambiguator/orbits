const { AIRTABLE_API_KEY, AIRTABLE_BASE } = process.env;
import Airtable, { FieldSet } from 'airtable';

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE);

export const airtablePut = async (table: string, body: FieldSet) => {
  const result = await base(table).create(body);
  console.debug('created ', result.getId());
  return result;
};

export const airtableList = async (table: string) => {
  const records = await base(table).select().firstPage();
  return records;
};

export const airtableDelete = async (table: string, userIds: string[]) => {
  const records = await base(table)
    .select({
      filterByFormula: `OR(${userIds
        .map((u) => `{userId} = '${u}'`)
        .join(', ')})`,
    })
    .firstPage();

  if (records.length === 0) {
    console.log('No records found for userIds', userIds);
  }

  return Promise.all(records.map((r) => r.destroy()));
};
