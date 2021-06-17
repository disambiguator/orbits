import { GetServerSideProps } from "next";
import React from "react";
import App from "../lib/app";
import { SeedWithUser } from "../lib/seed";

export const getServerSideProps: GetServerSideProps = async () => {
  const url =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;

  console.log(process.env.NEXT_PUBLIC_VERCEL_URL);

  const res = await fetch(`${url}/api/seeds`);
  const data: { seeds: Array<SeedWithUser> } = await res.json();
  return { props: { initialSeeds: data.seeds } };
};

export default function Page({
  initialSeeds,
}: {
  initialSeeds: Array<SeedWithUser>;
}) {
  return <App initialSeeds={initialSeeds} mode="design" />;
}
