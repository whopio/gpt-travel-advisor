import { NextRequest } from "next/server";
import axios from 'axios';

export const config = {
  runtime: "edge",
};

const handler = async (req: NextRequest) => {
  const { access_token } = (await req.json()) as { access_token: string };

  if (!access_token) {
    return new Response(
      JSON.stringify({ msg: "Access token is empty", data: [] }),
      {
        status: 400,
      },
    );
  }

    const checkMembership = await fetch(`https://api.whop.com/api/v2/me/has_access/${process.env.NEXT_PUBLIC_REQUIRED_PASS}`, {
        method: "GET",
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${access_token}`,
            },
        });
        const membershipData = await checkMembership.json();
        return new Response(JSON.stringify({ vaid: membershipData.valid }));

};

export default handler;