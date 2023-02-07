import { NextRequest } from "next/server";
import axios from 'axios';

export const config = {
  runtime: "edge",
};

const handler = async (req: NextRequest) => {
  const { code } = (await req.json()) as { code: string };

  if (!code) {
    return new Response(
      JSON.stringify({ msg: "Message ID is empty", data: [] }),
      {
        status: 400,
      },
    );
  }

  const res = await fetch(`https://data.whop.com/oauth/token`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
      },
    body: JSON.stringify({
        code,
        client_id: process.env.NEXT_PUBLIC_WHOP_CLIENT_ID,
        client_secret: process.env.WHOP_CLIENT_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: "authorization_code",
      }),
  });

  const data = await res.json();

  if (data.access_token){
    const checkMembership = await fetch(`https://api.whop.com/api/v2/me/has_access/${process.env.NEXT_PUBLIC_REQUIRED_PASS}`, {
        method: "GET",
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${data.access_token}`,
          },
      });
      const membershipData = await checkMembership.json();

      const checkMe = await fetch(`https://api.whop.com/api/v2/me`, {
        method: "GET",
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${data.access_token}`,
          },
      });
      const meData = await checkMe.json();

      return new Response(JSON.stringify({ valid: membershipData.valid, user: meData, access_token: data.access_token }));
  }
  return new Response(JSON.stringify({ valid: false }));

};

export default handler;
