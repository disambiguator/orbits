const { AIRTABLE_API_KEY, AIRTABLE_BASE } = process.env;
import Airtable from "airtable";

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE);

export const airtablePut = async (table: string, body: unknown) => {
  const result = await base(table).create(body);
  console.log("created ", result.getId());
  return result;
};

export const airtableList = async (table: string) => {
  const records = await base(table).select().firstPage();
  return records;
};

export const airtableDelete = async (table: string, userId: string) => {
  const records = await base(table)
    .select({
      filterByFormula: `{userId} = '${userId}'`,
    })
    .firstPage();

  records.forEach(async (r) => await r.destroy());
};
