"use client";

export const dynamic = "force-dynamic";

import React, { Suspense, useEffect, useRef, useState } from "react";
import SharkWithEyes from "@/components/shark";
import PillNav from "@/components/PillNav";
import AOS from "aos";
import { useRouter } from "next/navigation";
import Modal from "react-modal";
import { FaGoogle } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import { tokenStore } from "@/lib/auth/tokenStore";
import InlineSpinner from "@/components/loading/InlineSpinner";
import { toast } from "@/contexts/ToastContext";
import { getAuthErrorMessage } from "@/components/toast/errorNormalizer";
import { SignInNotice } from "@/components/SignInNotice";
import { buildPath, isSafePath } from "@/lib/navigation/paths";

Modal.setAppElement("body");

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showPopup] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const signedInCheckedRef = useRef(false);

  const handleGoogleSignIn = async () => {
    if (signingIn) return;

    setSigningIn(true);

    const next = new URLSearchParams(window.location.search).get("next");

    if (next && isSafePath(next)) {
      localStorage.setItem("redirectAfterLogin", next);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/oauth-callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("Error initiating Google sign-in:", error);
      toast.error(getAuthErrorMessage(error));
      setSigningIn(false);
    }
  };

  useEffect(() => {
    if (signedInCheckedRef.current) return;

    signedInCheckedRef.current = true;

    if (!tokenStore.hasRefreshToken()) return;

    setSignedIn(true);

    toast.warning(
      "You're signed in. Please log out to visit the Google sign-in page."
    );

    const pendingRedirect = localStorage.getItem("redirectAfterLogin");
    localStorage.removeItem("redirectAfterLogin");
    const target =
      pendingRedirect && isSafePath(pendingRedirect)
        ? pendingRedirect
        : buildPath("SERVERS");
    router.replace(target);
  }, [router]);

  useEffect(() => {
    let didFinish = false;
    const bgImage = new Image();

    bgImage.src = "/bg1.webp";

    const finalize = () => {
      if (didFinish) return;

      didFinish = true;
      setLoading(false);
    };

    if (bgImage.complete) {
      finalize();
    } else {
      bgImage.onload = finalize;
      bgImage.onerror = finalize;
    }

    const fallbackTimer = setTimeout(finalize, 1500);

    return () => {
      bgImage.onload = null;
      bgImage.onerror = null;
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setShowNavbar(true);
      } else if (currentScrollY > lastScrollY) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;

    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1));

    const type = params.get("type");
    const token = params.get("access_token");

    if (token && type === "recovery") {
      supabase.auth.getSession().then(() => {
        router.replace(buildPath("RESET_PASSWORD"));
      });
    }
  }, [router]);

  useEffect(() => {
    if (isMobile && showPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showPopup, isMobile]);

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  useEffect(() => {
    const style = document.createElement("style");

    style.innerHTML = `
      html {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      html::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }

      body {
        overflow-x: hidden;
      }

      ::selection {
        background: rgba(255,255,255,0.18);
        color: white;
      }
    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <SignInNotice />
      </Suspense>

      <div
        className={`
          fixed inset-0 z-[9999]
          flex items-center justify-center
          bg-black
          select-none
          transition-opacity duration-700 ease-out
          ${loading ? "opacity-100" : "pointer-events-none opacity-0"}
        `}
      >
        <div
          className={`
            flex flex-col items-center
            transition-all duration-700
            ${loading ? "scale-100 opacity-100" : "scale-95 opacity-0"}
          `}
        >
          <div className="mb-6">
            <div className="relative inline-block">
              <div className="font-jersey text-[64px] font-normal text-white">
                echo
              </div>

              <svg
                width="13"
                height="34"
                className="absolute left-[116px] top-[34px]"
                fill="none"
              >
                <path
                  d="M2 2C14.2659 13.7159 13.7311 20.2841 2 32"
                  stroke="white"
                  strokeWidth="4"
                />
              </svg>

              <svg
                width="16"
                height="46"
                className="absolute left-[120px] top-[28px]"
                fill="none"
              >
                <path
                  d="M2 2C18.3545 18.4022 17.6415 27.5977 2 44"
                  stroke="white"
                  strokeWidth="4"
                />
              </svg>
            </div>
          </div>

          <InlineSpinner
            size="lg"
            className="mx-auto"
            label="Loading"
          />
        </div>
      </div>

      <main className="relative min-h-screen w-full overflow-hidden text-white select-none">

        <div
          className="fixed inset-0 -z-30 bg-[url('/bg1.webp')] bg-cover bg-center"
          aria-hidden="true"
        />

        <div
          className="
            fixed inset-x-0 bottom-0 -z-10
            h-48
            bg-gradient-to-t
            from-black/80
            to-transparent
          "
          aria-hidden="true"
        />

        <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex items-center justify-between px-4 sm:px-8">
          <img
            src="/ieee_logo.png"
            alt="IEEE Computer Society"
            className="h-10 w-auto sm:h-12"
          />

          <img
            src="/gravitasLogo.dc8211c7.svg"
            alt="Gravitas"
            className="h-10 w-auto sm:h-12"
          />
        </div>

        <div
          className={`
            fixed left-0 top-5 md:top-[23px] z-50 w-full
            px-4
            transition-transform duration-500 ease-out
            ${showNavbar ? "translate-y-0" : "-translate-y-[150%]"}
          `}
        >
          <div className="mx-auto flex justify-center">
            <PillNav
              items={[
                {
                  label: "Battlecode",
                  href: "https://gravitas.vit.ac.in/events/4160a46a-3701-4622-8e7c-66909769704b",
                },
                {
                  label: "Redefine",
                  href: "https://gravitas.vit.ac.in/events/d440eb17-cc8b-4651-943a-1d449a2efeee",
                },
                {
                  label: "What The Flag",
                  href: "https://gravitas.vit.ac.in/events/abc220f9-a716-4235-b108-a96c25cfdb9d",
                },
              ]}
              baseColor="rgba(10,10,12,0.6)"
              pillColor="#ffffff"
              pillTextColor="#0a0a0c"
              hoveredPillTextColor="#ffffff"
            />
          </div>
        </div>

        <section
          className="
            relative
            flex min-h-screen
            items-center
            px-5
            pb-12
            pt-28
            sm:px-8
            md:px-12
            lg:px-16
            xl:px-24
          "
        >
          <div
            className="
              mx-auto
              grid w-full max-w-[1350px]
              grid-cols-1
              items-center
              gap-8
              md:grid-cols-[0.95fr_1.05fr]
              lg:gap-4
              xl:grid-cols-[0.9fr_1.1fr]
            "
          >

            <div
              className="
                relative z-10
                flex w-full
                flex-col
                items-center
                text-center
                md:items-start
                md:text-left
              "
              data-aos="fade-right"
            >

              <h1
                className="
                  max-w-[700px]
                  text-[48px]
                  font-semibold
                  leading-[0.94]
                  tracking-[-0.045em]
                  sm:text-[60px]
                  md:text-[62px]
                  lg:text-[72px]
                  xl:text-[84px]
                "
              >
                <span className="block font-jersey font-normal text-white">
                  echo
                </span>

             
              </h1>

              <p
                className="
                  mt-6
                  text-lg
                  font-medium
                  tracking-tight
                  text-white/90
                  sm:text-xl
                "
                data-aos="fade-right"
                data-aos-delay="100"
              >
                One space for everything your community does.
              </p>

              <p
                className="
                  mt-3
                  max-w-[550px]
                  text-sm
                  leading-6
                  text-white/55
                  sm:text-[15px]
                  sm:leading-7
                  md:text-base
                "
                data-aos="fade-right"
                data-aos-delay="150"
              >
                 echo is a real-time community platform built by IEEE Computer
                 Society VIT. Chat, share projects, and stay connected with
                 your people - all in one place, built for the next generation
                 of technologists. This Gravitas, we&apos;re hosting a lineup of
                 events built for builders and innovators:
               </p>

              <p
                className="
                  mt-3
                  text-sm
                  leading-6
                  text-white/55
                  sm:text-[15px]
                  sm:leading-7
                  md:text-base
                "
              >
                <span className="font-semibold text-white/80">Battlecode -</span>{" "}
                pit your code against the clock in a fast-paced competition of
                strategy and speed.
              </p>

              <p
                className="
                  mt-3
                  text-sm
                  leading-6
                  text-white/55
                  sm:text-[15px]
                  sm:leading-7
                  md:text-base
                "
              >
                <span className="font-semibold text-white/80">Redefine -</span>{" "}
                reimagine what&apos;s possible as you shape bold ideas into
                working, real-world solutions.
              </p>

              <p
                className="
                  mt-3
                  text-sm
                  leading-6
                  text-white/55
                  sm:text-[15px]
                  sm:leading-7
                  md:text-base
                "
              >
                <span className="font-semibold text-white/80">What The Flag -</span>{" "}
                crack codes, dig through clues, and race to capture the flag
                in a thrilling cyber-security hunt.
              </p>

              <div
                className="
                  mt-8
                  w-full
                  max-w-[460px]
                "
                data-aos="fade-up"
                data-aos-delay="200"
              >
                <div
                  className="
                    rounded-2xl
                   
                    p-4
                    sm:p-5
                  "
                >
                  <div className="flex flex-col gap-3 sm:flex-row">
                  {signedIn ? (
                    <div
                      className="
                        flex min-h-[54px]
                        items-center
                        justify-center
                        gap-3
                        rounded-xl
                        border border-white/10
                        bg-white/[0.06]
                        px-5
                        text-sm
                        font-semibold
                        text-white/65
                      "
                    >
                      <InlineSpinner size="sm" />

                      <span>
                        Redirecting to servers…
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={signingIn}
                      aria-label="Sign in"
                      className="
                        group
                        flex min-h-[54px]
                        flex-1
                        items-center
                        justify-center
                        gap-3
                        rounded-xl
                        bg-white
                        px-5
                        py-3
                        text-lg
                        font-semibold
                        text-gray-900
                        shadow-lg
                        shadow-black/20
                        transition-all
                        duration-200
                        hover:-translate-y-0.5
                        hover:bg-gray-100
                        hover:shadow-xl
                        active:translate-y-0
                        disabled:cursor-not-allowed
                        disabled:opacity-70
                        focus:outline-none
                        focus:ring-2
                        focus:ring-white/50
                        focus:ring-offset-2
                        focus:ring-offset-black
                      "
                    >
                      {signingIn ? (
                        <>
                          <InlineSpinner
                            size="sm"
                            className="border-gray-300 border-t-[#4285F4]"
                          />

                          <span>
                            Connecting...
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className="
                              flex h-6 w-6
                              items-center justify-center
                              rounded-full
                              bg-white
                            "
                          >
                            <FaGoogle className="text-[17px] text-[#4285F4]" />
                          </span>

                          <span>
                            Sign in
                          </span>
                        </>
                      )}
                    </button>
                  )}

                  <a
                    href="https://ieeecsvit.com"
                    target="_blank"
                    rel="noopener noreferrer"
className="
                      flex min-h-[54px]
                      flex-1
                      items-center
                      justify-center
                      gap-3
                      rounded-xl
                      border border-white/15
                      bg-white/[0.06]
                      px-5
                      py-3
                      text-lg
                      font-semibold
                      text-white
                      backdrop-blur-md
                      transition-all
                      duration-200
                      hover:-translate-y-0.5
                      hover:border-white/25
                      hover:bg-white/10
                      active:translate-y-0
                      focus:outline-none
                      focus:ring-2
                      focus:ring-white/40
                    "
                  >
                    Learn More
                  </a>
                  </div>
                </div>
              </div>

            </div>

            <div
              className="
                relative
                flex
                min-h-[360px]
                w-full
                items-center
                justify-center
                md:min-h-[560px]
                lg:min-h-[650px]
              "
              data-aos="zoom-in"
              data-aos-delay="100"
            >

              <div
                className="
                  absolute
                  left-1/2
                  top-1/2
                  h-[280px]
                  w-[280px]
                  -translate-x-1/2
                  -translate-y-1/2
                  rounded-full
                  bg-white/[0.06]
                  blur-[90px]
                  md:h-[450px]
                  md:w-[450px]
                "
                aria-hidden="true"
              />

              <div
                className="
                  absolute
                  left-1/2
                  top-1/2
                  h-[160px]
                  w-[160px]
                  -translate-x-1/2
                  -translate-y-1/2
                  rounded-full
                  bg-white/[0.04]
                  blur-[45px]
                  md:h-[300px]
                  md:w-[300px]
                "
                aria-hidden="true"
              />

              <div
                className="
                  relative z-10
                  w-full
                  max-w-[520px]
                  scale-[0.92]
                  sm:scale-100
                  lg:max-w-[620px]
                  xl:max-w-[700px]
                "
              >
<SharkWithEyes />
              </div>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}