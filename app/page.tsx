'use client'

import React, { useState, useEffect } from "react";
import { usePurchaseLink } from "@/lib/get-purchase-link";
import { useSearchParams } from 'next/navigation';
import { setCookie, getCookie, deleteCookie, hasCookie } from "cookies-next";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { signIn, signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import Router from "next/router";

const RECOMMENDED_PLAN = process.env.NEXT_PUBLIC_RECOMMENDED_PLAN_ID || "";

function signOutButton(){
  signOut()
  deleteCookie('membership');
  deleteCookie('username');
  deleteCookie('access_token');
}

export default function Home() {
  let { data: session } = useSession();
  let access_token = session?.accessToken || getCookie('access_token');
  let [membership, setMembership] = useState(false);
  let [fetch_user, setFetchUser] = useState(false);
  const cookieVal = getCookie('membership')
  if (cookieVal && !membership){
    setMembership(true)
  }
  const searchParams = useSearchParams();
  const membershipId = searchParams.get('membershipId');
  const code = searchParams.get('code');
  const [request, setRequest] = useState<{days?: string, city?: string}>({})
  let [itinerary, setItinerary] = useState<string>('')
  const paidLink = usePurchaseLink(RECOMMENDED_PLAN);

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  let user = session?.user || getCookie('username');

  useEffect(() => {
    if (!membershipId || membership) return;
    fetchMembership();
  }, [membershipId]);

  useEffect(() => {
    if (!user && !membership) return;
    fetchUserAccess();
  }, [fetch_user]);

  useEffect(() => {
    if (!code && !membership) return;
    fetchCodeAccess();
  }, [code]);

  const fetchMembership = async () => {
    const response = await fetch("api/fetchMembership", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ membershipId }),
    })
      .then((res) => {
        if (res.status === 200) {
          return res.json();
        }
        throw new Error("Something went wrong");
      })
      .then((responseJson) => {
        if (
          responseJson.plan === process.env.NEXT_PUBLIC_RECOMMENDED_PLAN_ID ||
          responseJson.plan === process.env.NEXT_PUBLIC_PAID_RECOMMENDED_PLAN_ID
        ) {
          setCookie("membership", true);
          setMembership(true);
        } else {
          setCookie("membership", false);
          setMembership(false);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const fetchUserAccess = async () => {
    const response = await fetch("api/fetchUserAccess", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token }),
    })
      .then((res) => {
        if (res.status === 200) {
          return res.json();
        }
        throw new Error("Something went wrong");
      })
      .then((responseJson) => {
        if (
          responseJson.valid
          ) {
            setCookie('membership', true)
            setMembership(true);
          } else {
            setCookie('membership', false)
            setMembership(false);
          }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const fetchCodeAccess = async () => {
    const response = await fetch("api/fetchCodeAccess", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    })
      .then((res) => {
        if (res.status === 200) {
          return res.json();
        }
        throw new Error("Something went wrong");
      })
      .then((responseJson) => {
        if (responseJson.valid) {
          setCookie("membership", true);
          setCookie('username', responseJson.user.username);
          setCookie('access_token', responseJson.access_token);
          window.location.reload()
        } else {
          if (responseJson.user.username) {
            setCookie('username', responseJson.user.username);
            setCookie('access_token', responseJson.access_token);
          }
          setCookie("membership", false);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };
  if (user && !fetch_user){
    setFetchUser(true);
  }

  async function hitAPI() {
    if (!request.city || !request.days) return
    const hour = 3600 * 1000; // 3600 seconds in a hour
    const expires = new Date(Date.now() + hour);
    if (hasCookie('limit')) {
      const limit = getCookie('limit');
      if (limit) {
        const rate_limit = parseInt(limit.toString(), 10);
        setCookie('limit', rate_limit + 1);
        if (rate_limit > 10){
          setMessage('You have reached your hourly limit, try again in a bit.')
          setLoading(true)
          setItinerary('')
          return
        }
      }
    } else {
      setCookie('limit',1, { expires: expires })
    }
    setMessage('Building itinerary...')
    setLoading(true)
    setItinerary('')

    setTimeout(() => {
      setMessage('Getting closer ...')
    }, 7000)

    setTimeout(() => {
      setMessage('Almost there ...')
    }, 15000)

    const response = await fetch('/api/get-itinerary', {
      method: 'POST',
      body: JSON.stringify({
        days: request.days,
        city: request.city
      })
    })
    const json = await response.json()
    
    const response2 = await fetch('/api/get-points-of-interest', {
      method: 'POST',
      body: JSON.stringify({
        pointsOfInterestPrompt: json.pointsOfInterestPrompt,
      })
    })
    const json2 = await response2.json()

    let pointsOfInterest = JSON.parse(json2.pointsOfInterest)
    let itinerary = json.itinerary

    console.log('pointsOfInterest: ', pointsOfInterest)

    pointsOfInterest.map(point => {
      // itinerary = itinerary.replace(point, `<a target="_blank" rel="no-opener" href="https://www.google.com/search?q=${encodeURIComponent(point + ' ' + request.city)}">${point}</a>`)
      itinerary = itinerary.replace(point, `[${point}](https://www.google.com/search?q=${encodeURIComponent(point + ' ' + request.city)})`)
    })

    setItinerary(itinerary)
    setLoading(false)
  }
  
  let days = itinerary.split('Day')

  if (days.length > 1) {
    days.shift()
  } else {
    days[0] = "1" + days[0]
  }

  return (
    <main>
      <div className="app-container">
        {user ? (
          <div className="top-right">
            {user && typeof user === 'object' ? (
                <div className="user-info">{`Signed in as ${user.name}`}</div>
            ) : (
                <div className="user-info">{`Signed in as ${user}`}</div>
            )}
            <button className="sign-out" onClick={() => signOutButton()}>Sign Out</button>
          </div>
        ) : (
          <div className="top-right">
            <button className="sign-out" onClick={() => signIn("whop")}>Sign in</button>
          </div>
        )}
        <br/>
        <h1 style={styles.header}>GPTravel Advisor</h1>
        <div style={styles.formContainer} className="form-container">
        {membership && user ? (
            <>
            <input style={styles.input}  placeholder="City" onChange={e => setRequest(request => ({
              ...request, city: e.target.value
            }))} />
            <input style={styles.input} placeholder="Days" onChange={e => setRequest(request => ({
              ...request, days: e.target.value
            }))} />
            <button className="input-button"  onClick={hitAPI}>Build Itinerary</button>
            </>
            ) : (
              <a href={paidLink}>
                <button className="input-button">Get Access for $5</button>
              </a>
            )}
        </div>
        <div className="results-container">
        {
          loading && (
            <p>{message}</p>
          )
        }
        {
          itinerary && days.map((day, index) => (
            // <p
            //   key={index}
            //   style={{marginBottom: '20px'}}
            //   dangerouslySetInnerHTML={{__html: `Day ${day}`}}
            // />
            <div
              style={{marginBottom: '30px'}}
              key={index}
            >
              <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: props => {
                    return <a target="_blank" rel="no-opener" href={props.href}>{props.children}</a>
                }
            }}
              >
                {`Day ${day}`}
                </ReactMarkdown>
            </div>
          ))
        }

        </div>
      </div>
    </main>
  )
}

const styles = {
  header: {
    textAlign: 'center' as 'center',
    marginTop: '80px',
    color: '#c683ff',
    fontSize: '44px'
  },
  input: {
    padding: '10px 14px',
    marginBottom: '4px',
    outline: 'none',
    fontSize: '16px',
    width: '100%',
    borderRadius: '8px'
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    margin: '30px auto 0px',
    padding: '20px',
    boxShadow: '0px 0px 12px rgba(198, 131, 255, .2)',
    borderRadius: '10px'
  },
  result: {
    color: 'white'
  }
}
