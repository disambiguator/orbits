type ProcessEnv = {
  APP_ID: string;
  AIRTABLE_BASE: string;
  AIRTABLE_API_KEY: string;
  NEXT_PUBLIC_PUSHER_KEY: string;
  SECRET: string;
  NEXT_PUBLIC_PUSHER_CLUSTER: string;
};

export default process.env as any as ProcessEnv;
