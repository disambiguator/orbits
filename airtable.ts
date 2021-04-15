const { AIRTABLE_API_KEY, AIRTABLE_ENDPOINT } = process.env;
import fetch from "node-fetch";

// interface AirtableRecord {
//   fields: {
//     id: string;
//   };
// }

// interface AirtableRecordSet {
//   records: Array<AirtableRecord>;
// }

export const airtablePut = async (table: string, body: unknown) => {
  const response = await fetch(`${AIRTABLE_ENDPOINT}/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: body }),
  });

  if (!response.ok) {
    // @ts-ignore
    throw Error(response.error.message);
  }
  return response.json();
};

// export const airtableList = (table: string): Promise<AirtableRecordSet> =>
//   fetch(`${AIRTABLE_ENDPOINT}/${table}?api_key=${AIRTABLE_API_KEY}`).json();

// export const airtableShow = (table: string, id: string) =>
//   fetchJson(`${AIRTABLE_ENDPOINT}/${table}/${id}`, {
//     headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
//   });

// type AirtableResponse = {
//   fields: Record<string, unknown>;
// };
